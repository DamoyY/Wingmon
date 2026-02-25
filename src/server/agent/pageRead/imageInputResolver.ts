import {
  type SupportedImageMimeType,
  resolveSupportedImageMimeType,
  resolveSupportedImageMimeTypeFromContentType,
} from "../../../shared/index.ts";
import type { ToolImageInput } from "../toolResultTypes.ts";
import type { ResolvePageImageInputOptions } from "./contracts.ts";

const imageBase64ChunkSize = 8192;

const resolveImageMimeTypeFromResponse = (
    response: Response,
  ): SupportedImageMimeType | null =>
    resolveSupportedImageMimeTypeFromContentType(
      response.headers.get("content-type"),
    ),
  cancelResponseBody = async (response: Response): Promise<void> => {
    if (response.body === null) {
      return;
    }
    try {
      await response.body.cancel();
    } catch (error) {
      console.error("取消图片探测响应体失败", error);
    }
  },
  probeRemoteImageMimeType = async (
    url: string,
  ): Promise<SupportedImageMimeType | null> => {
    try {
      const headResponse = await fetch(url, {
          method: "HEAD",
          redirect: "follow",
        }),
        headMimeType = resolveImageMimeTypeFromResponse(headResponse);
      if (headMimeType !== null) {
        return headMimeType;
      }
      if (!headResponse.ok) {
        console.warn("图片 MIME 探测 HEAD 请求状态异常", {
          status: headResponse.status,
          url,
        });
      }
    } catch (error) {
      console.warn("图片 MIME 探测 HEAD 请求失败", { url }, error);
    }
    try {
      const getResponse = await fetch(url, {
          method: "GET",
          redirect: "follow",
        }),
        getMimeType = resolveImageMimeTypeFromResponse(getResponse);
      await cancelResponseBody(getResponse);
      if (getMimeType !== null) {
        return getMimeType;
      }
      if (!getResponse.ok) {
        console.warn("图片 MIME 探测 GET 请求状态异常", {
          status: getResponse.status,
          url,
        });
        return null;
      }
      console.warn("图片 MIME 探测未命中支持的 Content-Type", {
        contentType: getResponse.headers.get("content-type"),
        url,
      });
      return null;
    } catch (error) {
      console.warn("图片 MIME 探测 GET 请求失败", { url }, error);
      return null;
    }
  },
  resolveSingleMarkdownImageUrl = (markdown: string): string | null => {
    const trimmed = markdown.trim(),
      match = /^!\[[^\]\r\n]*\]\((.+)\)$/u.exec(trimmed);
    if (!match) {
      return null;
    }
    const destination = (match[1] || "").trim();
    if (!destination) {
      return null;
    }
    if (destination.startsWith("<") && destination.endsWith(">")) {
      const wrappedUrl = destination.slice(1, -1).trim();
      return wrappedUrl || null;
    }
    const firstSpaceIndex = destination.search(/\s/u);
    if (firstSpaceIndex === -1) {
      return destination;
    }
    const url = destination.slice(0, firstSpaceIndex).trim();
    return url || null;
  },
  resolveMarkdownImageUrl = (
    markdown: string,
    baseUrl: string,
  ): string | null => {
    const relativeUrl = resolveSingleMarkdownImageUrl(markdown);
    if (relativeUrl === null) {
      return null;
    }
    try {
      return new URL(relativeUrl, baseUrl).toString();
    } catch (error) {
      console.error(
        "Markdown 图片 URL 解析失败",
        { baseUrl, relativeUrl },
        error,
      );
      return null;
    }
  },
  decodeDataUrlBase64 = (url: string): string => {
    const commaIndex = url.indexOf(",");
    if (commaIndex < 0) {
      throw new Error("Data URL 缺少逗号分隔符");
    }
    const header = url.slice(0, commaIndex).toLowerCase(),
      payload = url.slice(commaIndex + 1).trim();
    if (!header.includes(";base64")) {
      throw new Error("Data URL 不是 Base64 编码");
    }
    if (!payload) {
      throw new Error("Data URL Base64 内容为空");
    }
    return payload;
  },
  encodeBytesToBase64 = (bytes: Uint8Array): string => {
    if (bytes.byteLength === 0) {
      throw new Error("图片数据为空");
    }
    let binary = "";
    for (
      let offset = 0;
      offset < bytes.byteLength;
      offset += imageBase64ChunkSize
    ) {
      const chunk = bytes.subarray(offset, offset + imageBase64ChunkSize);
      binary += String.fromCharCode(...chunk);
    }
    const base64 = btoa(binary).trim();
    if (!base64) {
      throw new Error("图片 Base64 编码结果为空");
    }
    return base64;
  },
  readImageBase64FromFileUrl = async (url: string): Promise<string> => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${String(response.status)}`);
      }
      const bytes = new Uint8Array(await response.arrayBuffer());
      return encodeBytesToBase64(bytes);
    } catch (error) {
      console.error("读取 file:// 图片失败", { url }, error);
      throw new Error("读取 file:// 图片失败");
    }
  };

export const resolvePageImageInput = async (
  url: string,
  options: ResolvePageImageInputOptions = {},
): Promise<ToolImageInput | null> => {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch (error) {
    console.error("图片 URL 解析失败", { url }, error);
    throw new Error("图片 URL 解析失败");
  }
  let mimeType = resolveSupportedImageMimeType(parsedUrl.toString());
  if (
    mimeType === null &&
    options.allowRemoteContentTypeProbe === true &&
    (parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:")
  ) {
    mimeType = await probeRemoteImageMimeType(parsedUrl.toString());
  }
  if (mimeType === null) {
    return null;
  }
  if (parsedUrl.protocol === "file:") {
    const data = await readImageBase64FromFileUrl(parsedUrl.toString());
    return {
      data,
      mimeType,
      sourceType: "base64",
    };
  }
  if (parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:") {
    return {
      mimeType,
      sourceType: "url",
      url: parsedUrl.toString(),
    };
  }
  if (parsedUrl.protocol === "data:") {
    try {
      const data = decodeDataUrlBase64(parsedUrl.toString());
      return {
        data,
        mimeType,
        sourceType: "base64",
      };
    } catch (error) {
      console.error("解析 data:image 失败", { url }, error);
      throw new Error("解析 data:image 失败");
    }
  }
  const error = new Error(`不支持的图片 URL 协议：${parsedUrl.protocol}`);
  console.error(error.message, { url });
  throw error;
};

export const resolvePageImageInputFromMarkdown = async (
  markdown: string,
  baseUrl: string,
): Promise<ToolImageInput | null> => {
  const imageUrl = resolveMarkdownImageUrl(markdown, baseUrl);
  if (imageUrl === null) {
    return null;
  }
  return resolvePageImageInput(imageUrl, {
    allowRemoteContentTypeProbe: true,
  });
};
