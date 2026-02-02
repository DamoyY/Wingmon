import { parse } from "@babel/parser";

const CDN_BASE_URL = "https://esm.sh/";

const isBareModuleSpecifier = (specifier) => {
  if (typeof specifier !== "string") {
    return false;
  }
  const value = specifier.trim();
  if (!value) {
    return false;
  }
  if (
    value.startsWith("./") ||
    value.startsWith("../") ||
    value.startsWith("/") ||
    value.startsWith("//")
  ) {
    return false;
  }
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value)) {
    return false;
  }
  return true;
};

const toCdnUrl = (specifier) => `${CDN_BASE_URL}${specifier}`;

const getLiteralValue = (node) => {
  if (!node || typeof node !== "object") {
    return null;
  }
  if (node.type === "StringLiteral" && typeof node.value === "string") {
    return node.value;
  }
  if (
    node.type === "TemplateLiteral" &&
    Array.isArray(node.expressions) &&
    node.expressions.length === 0 &&
    Array.isArray(node.quasis) &&
    node.quasis.length === 1
  ) {
    return node.quasis[0]?.value?.cooked || null;
  }
  return null;
};

const collectBareSpecifiers = (code, specifiers) => {
  if (typeof code !== "string") {
    return;
  }
  const source = code.trim();
  if (!source) {
    return;
  }
  let ast = null;
  const pluginSets = [
    ["dynamicImport", "topLevelAwait", "importAttributes"],
    ["dynamicImport", "topLevelAwait", "importAssertions"],
    ["dynamicImport", "topLevelAwait"],
  ];
  for (let i = 0; i < pluginSets.length; i += 1) {
    try {
      ast = parse(code, {
        sourceType: "module",
        plugins: pluginSets[i],
      });
      break;
    } catch (error) {
      console.error("解析模块脚本失败", error);
    }
  }
  if (!ast) {
    return;
  }
  const addSpecifier = (value) => {
    if (isBareModuleSpecifier(value)) {
      specifiers.add(value);
    }
  };
  const addFromNode = (node) => {
    const value = getLiteralValue(node);
    if (!value) {
      console.error("模块导入不是字符串，无法解析", node);
      return;
    }
    addSpecifier(value);
  };
  const walkNode = (node) => {
    if (!node || typeof node.type !== "string") {
      return;
    }
    switch (node.type) {
      case "ImportDeclaration":
        addFromNode(node.source);
        break;
      case "ExportNamedDeclaration":
      case "ExportAllDeclaration":
        if (node.source) {
          addFromNode(node.source);
        }
        break;
      case "ImportExpression":
        if (node.source) {
          addFromNode(node.source);
        }
        break;
      case "CallExpression":
        if (
          node.callee?.type === "Import" &&
          Array.isArray(node.arguments) &&
          node.arguments[0]
        ) {
          addFromNode(node.arguments[0]);
        }
        break;
      default:
        break;
    }
    Object.keys(node).forEach((key) => {
      const value = node[key];
      if (Array.isArray(value)) {
        value.forEach((child) => {
          walkNode(child);
        });
      } else if (value && typeof value.type === "string") {
        walkNode(value);
      }
    });
  };
  walkNode(ast);
};

const insertImportMapScript = (doc, script) => {
  const firstModuleScript = doc.querySelector('script[type="module"]');
  if (firstModuleScript?.parentNode) {
    firstModuleScript.parentNode.insertBefore(script, firstModuleScript);
    return;
  }
  if (doc.head) {
    doc.head.prepend(script);
    return;
  }
  if (doc.body) {
    doc.body.prepend(script);
    return;
  }
  doc.documentElement.prepend(script);
};

const updateImportMap = (doc, specifiers) => {
  if (!specifiers.size) {
    return;
  }
  const scripts = Array.from(doc.querySelectorAll("script"));
  const importMapScripts = scripts.filter((script) => {
    const type = script.getAttribute("type")?.trim().toLowerCase();
    return type === "importmap" || type === "importmap-shim";
  });
  let mapScript = importMapScripts[0] || null;
  if (importMapScripts.length > 1) {
    console.error("检测到多个 importmap，仅保留第一个");
    importMapScripts.slice(1).forEach((script) => script.remove());
  }
  let importMap = {};
  if (mapScript) {
    const raw = mapScript.textContent || "";
    try {
      importMap = JSON.parse(raw);
      if (
        !importMap ||
        typeof importMap !== "object" ||
        Array.isArray(importMap)
      ) {
        console.error("importmap 格式无效", importMap);
        importMap = {};
      }
    } catch (error) {
      console.error("解析 importmap 失败", error);
      importMap = {};
    }
  } else {
    mapScript = doc.createElement("script");
    mapScript.setAttribute("type", "importmap");
  }
  if (
    importMap.imports &&
    (typeof importMap.imports !== "object" || Array.isArray(importMap.imports))
  ) {
    console.error("importmap imports 格式无效", importMap.imports);
    importMap.imports = {};
  }
  if (!importMap.imports) {
    importMap.imports = {};
  }
  specifiers.forEach((specifier) => {
    if (!importMap.imports[specifier]) {
      importMap.imports[specifier] = toCdnUrl(specifier);
    }
  });
  mapScript.textContent = JSON.stringify(importMap, null, 2);
  if (!mapScript.isConnected) {
    insertImportMapScript(doc, mapScript);
  }
};

const normalizePreviewHtml = (code) => {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(code, "text/html");
    if (!doc || !doc.documentElement) {
      console.error("HTML 预览解析失败");
      return code;
    }
    const specifiers = new Set();
    const scripts = Array.from(doc.querySelectorAll("script"));
    scripts.forEach((script) => {
      const type = script.getAttribute("type")?.trim().toLowerCase();
      if (type !== "module") {
        return;
      }
      const src = script.getAttribute("src");
      if (src && isBareModuleSpecifier(src)) {
        script.setAttribute("src", toCdnUrl(src));
      }
      if (!src) {
        collectBareSpecifiers(script.textContent || "", specifiers);
      }
    });
    updateImportMap(doc, specifiers);
    const doctype = doc.doctype ? `<!doctype ${doc.doctype.name}>` : "";
    const html = doc.documentElement.outerHTML;
    return doctype ? `${doctype}\n${html}` : html;
  } catch (error) {
    console.error("处理 HTML 预览失败", error);
    return code;
  }
};

export default normalizePreviewHtml;
