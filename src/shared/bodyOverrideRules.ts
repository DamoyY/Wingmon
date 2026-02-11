import {
  type JsonArray,
  type JsonObject,
  type JsonValue,
  isJsonObject,
  isJsonValue,
} from "./runtimeValidation.ts";

type RawBodyOverrideRule = {
  path: string;
  value: JsonValue;
};

export type BodyOverridePathSegment =
  | {
      type: "key";
      key: string;
    }
  | {
      type: "index";
      index: number;
    };

export type BodyOverrideRule = {
  path: BodyOverridePathSegment[];
  value: JsonValue;
};

type BodyOverrideRuleDraft = {
  path: string | null;
  value: JsonValue;
  hasValue: boolean;
};

type BodyOverrideLine = {
  lineNumber: number;
  content: string;
};

type QuoteDelimiter = '"' | "'";

const numberLiteralPattern = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][-+]?\d+)?$/u,
  indexSegmentPattern = /^\d+$/u,
  ensureStringInput = (configText: string): string => {
    if (typeof configText !== "string") {
      throw new Error("请求体覆写配置必须是字符串");
    }
    return configText.trim();
  },
  formatLinePrefix = (lineNumber: number): string =>
    `第 ${String(lineNumber)} 行`,
  detectQuoteDelimiter = (literal: string): QuoteDelimiter | null => {
    if (literal.startsWith('"')) {
      return '"';
    }
    if (literal.startsWith("'")) {
      return "'";
    }
    return null;
  },
  parseQuotedStringLiteral = (
    literal: string,
    lineNumber: number,
    label: string,
  ): string | null => {
    const quoteDelimiter = detectQuoteDelimiter(literal);
    if (quoteDelimiter === null) {
      return null;
    }
    if (!literal.endsWith(quoteDelimiter)) {
      const quoteLabel = quoteDelimiter === '"' ? "双引号" : "单引号";
      throw new Error(
        `${formatLinePrefix(lineNumber)} ${label} 缺少闭合${quoteLabel}`,
      );
    }
    if (quoteDelimiter === "'") {
      return literal.slice(1, -1).replaceAll("''", "'");
    }
    try {
      const parsed: unknown = JSON.parse(literal);
      if (typeof parsed !== "string") {
        throw new Error(`${label}必须是字符串`);
      }
      return parsed;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `${formatLinePrefix(lineNumber)} ${label} 解析失败：${message}`,
      );
    }
  },
  parseScalarString = (
    literal: string,
    lineNumber: number,
    label: string,
  ): string => parseQuotedStringLiteral(literal, lineNumber, label) ?? literal,
  parseScalarValue = (literal: string, lineNumber: number): JsonValue => {
    if (literal === "") {
      throw new Error(`${formatLinePrefix(lineNumber)} value 不能为空`);
    }
    const parsedQuotedValue = parseQuotedStringLiteral(
      literal,
      lineNumber,
      "value",
    );
    if (parsedQuotedValue !== null) {
      return parsedQuotedValue;
    }
    if (literal === "null") {
      return null;
    }
    if (literal === "true") {
      return true;
    }
    if (literal === "false") {
      return false;
    }
    if (numberLiteralPattern.test(literal)) {
      const parsedNumber = Number(literal);
      if (!Number.isFinite(parsedNumber)) {
        throw new Error(`${formatLinePrefix(lineNumber)} value 数值无效`);
      }
      return parsedNumber;
    }
    if (literal.startsWith("{") || literal.startsWith("[")) {
      try {
        const parsed = JSON.parse(literal) as unknown;
        if (!isJsonValue(parsed)) {
          throw new Error("value 必须是合法 JSON 值");
        }
        return parsed;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(
          `${formatLinePrefix(lineNumber)} value JSON 解析失败：${message}`,
        );
      }
    }
    return literal;
  },
  collectEffectiveLines = (configText: string): BodyOverrideLine[] =>
    configText
      .split(/\r?\n/u)
      .map((rawLine, index) => ({
        content: rawLine.trim(),
        lineNumber: index + 1,
      }))
      .filter((line) => line.content !== "" && !line.content.startsWith("#")),
  parseRawRule = (
    item: unknown,
    position: number,
    source: string,
  ): RawBodyOverrideRule => {
    if (!isJsonObject(item)) {
      throw new Error(`${source} 第 ${String(position)} 项必须是对象`);
    }
    const pathValue = item.path,
      valueValue = item.value;
    if (typeof pathValue !== "string") {
      throw new Error(`${source} 第 ${String(position)} 项 path 必须是字符串`);
    }
    if (!isJsonValue(valueValue)) {
      throw new Error(`${source} 第 ${String(position)} 项 value 类型无效`);
    }
    const normalizedPath = pathValue.trim();
    if (normalizedPath === "") {
      throw new Error(`${source} 第 ${String(position)} 项 path 不能为空`);
    }
    return {
      path: normalizedPath,
      value: valueValue,
    };
  },
  parseRawRuleList = (list: unknown, source: string): RawBodyOverrideRule[] => {
    if (!Array.isArray(list)) {
      throw new Error(`${source} 必须是数组`);
    }
    return list.map((item, index) => parseRawRule(item, index + 1, source));
  },
  parseRawRulesFromJson = (
    configText: string,
  ): RawBodyOverrideRule[] | null => {
    try {
      const parsed = JSON.parse(configText) as unknown;
      if (Array.isArray(parsed)) {
        return parseRawRuleList(parsed, "请求体覆写数组");
      }
      throw new Error("JSON 配置必须是覆写数组");
    } catch (error) {
      if (error instanceof SyntaxError) {
        return null;
      }
      throw error;
    }
  },
  createRuleDraft = (): BodyOverrideRuleDraft => ({
    hasValue: false,
    path: null,
    value: null,
  }),
  commitRuleDraft = (
    draft: BodyOverrideRuleDraft | null,
    rules: RawBodyOverrideRule[],
    lineNumber: number,
  ): void => {
    if (draft === null) {
      return;
    }
    if (draft.path === null || draft.path === "") {
      throw new Error(`${formatLinePrefix(lineNumber)} 前的覆写规则缺少 path`);
    }
    if (!draft.hasValue) {
      throw new Error(`${formatLinePrefix(lineNumber)} 前的覆写规则缺少 value`);
    }
    rules.push({ path: draft.path, value: draft.value });
  },
  applyRuleEntry = (
    draft: BodyOverrideRuleDraft,
    entry: string,
    lineNumber: number,
  ): void => {
    if (entry.startsWith("path:")) {
      if (draft.path !== null) {
        throw new Error(`${formatLinePrefix(lineNumber)} path 重复定义`);
      }
      const literal = entry.slice("path:".length).trim(),
        parsedPath = parseScalarString(literal, lineNumber, "path").trim();
      if (parsedPath === "") {
        throw new Error(`${formatLinePrefix(lineNumber)} path 不能为空`);
      }
      draft.path = parsedPath;
      return;
    }
    if (entry.startsWith("value:")) {
      if (draft.hasValue) {
        throw new Error(`${formatLinePrefix(lineNumber)} value 重复定义`);
      }
      const literal = entry.slice("value:".length).trim();
      draft.value = parseScalarValue(literal, lineNumber);
      draft.hasValue = true;
      return;
    }
    throw new Error(
      `${formatLinePrefix(lineNumber)} 语法无效，仅支持 path/value`,
    );
  },
  parseRawRulesFromYamlLike = (configText: string): RawBodyOverrideRule[] => {
    const lines = collectEffectiveLines(configText);
    if (lines.length === 0) {
      return [];
    }
    const rules: RawBodyOverrideRule[] = [];
    let draft: BodyOverrideRuleDraft | null = null;
    for (const line of lines) {
      const { content, lineNumber } = line;
      if (content.startsWith("- ")) {
        commitRuleDraft(draft, rules, lineNumber);
        draft = createRuleDraft();
        applyRuleEntry(draft, content.slice(2).trim(), lineNumber);
        continue;
      }
      if (draft === null) {
        throw new Error(`${formatLinePrefix(lineNumber)} 必须先定义 - path:`);
      }
      applyRuleEntry(draft, content, lineNumber);
    }
    commitRuleDraft(draft, rules, lines.at(-1)?.lineNumber ?? 0);
    return rules;
  },
  parsePathSegments = (pathText: string): BodyOverridePathSegment[] => {
    const segments = pathText
      .split(".")
      .map((segment) => segment.trim())
      .filter((segment) => segment !== "")
      .map((segment): BodyOverridePathSegment => {
        if (indexSegmentPattern.test(segment)) {
          return { index: Number.parseInt(segment, 10), type: "index" };
        }
        return { key: segment, type: "key" };
      });
    if (segments.length === 0) {
      throw new Error(`覆写路径无效：${pathText}`);
    }
    return segments;
  },
  ensureRootBody = (body: Record<string, unknown>): JsonObject => {
    if (!isJsonObject(body)) {
      throw new Error("请求体根节点必须是对象");
    }
    if (!isJsonValue(body)) {
      throw new Error("请求体必须为合法 JSON 结构");
    }
    return body;
  },
  resolveContainer = (
    current: JsonValue | undefined,
    nextPathSegment: BodyOverridePathSegment,
  ): JsonObject | JsonArray => {
    if (nextPathSegment.type === "key") {
      return isJsonObject(current) ? current : {};
    }
    return Array.isArray(current) ? current : [];
  },
  setValueAtPath = (
    target: JsonValue,
    path: BodyOverridePathSegment[],
    value: JsonValue,
  ): JsonValue => {
    if (path.length === 0) {
      return value;
    }
    const [head, ...rest] = path;
    if (head.type === "key") {
      const object = isJsonObject(target) ? target : {};
      if (rest.length === 0) {
        object[head.key] = value;
        return object;
      }
      object[head.key] = setValueAtPath(
        resolveContainer(object[head.key], rest[0]),
        rest,
        value,
      );
      return object;
    }
    const array = Array.isArray(target) ? target : [];
    while (array.length <= head.index) {
      array.push(null);
    }
    if (rest.length === 0) {
      array[head.index] = value;
      return array;
    }
    array[head.index] = setValueAtPath(
      resolveContainer(array[head.index], rest[0]),
      rest,
      value,
    );
    return array;
  },
  deleteValueAtPath = (
    target: JsonValue,
    path: BodyOverridePathSegment[],
  ): JsonValue => {
    if (path.length === 0) {
      return target;
    }
    const [head, ...rest] = path;
    if (head.type === "key") {
      if (!isJsonObject(target)) {
        return target;
      }
      if (rest.length === 0) {
        const nextObject = Object.fromEntries(
          Object.entries(target).filter(([key]) => key !== head.key),
        );
        return nextObject;
      }
      if (!Object.hasOwn(target, head.key)) {
        return target;
      }
      target[head.key] = deleteValueAtPath(target[head.key], rest);
      return target;
    }
    if (!Array.isArray(target) || head.index >= target.length) {
      return target;
    }
    if (rest.length === 0) {
      target.splice(head.index, 1);
      return target;
    }
    target[head.index] = deleteValueAtPath(target[head.index], rest);
    return target;
  },
  serializePath = (path: BodyOverridePathSegment[]): string =>
    path
      .map((segment) =>
        segment.type === "key"
          ? `key:${segment.key}`
          : `index:${String(segment.index)}`,
      )
      .join("|"),
  getValueAtPath = (
    target: JsonValue,
    path: BodyOverridePathSegment[],
  ): JsonValue | null => {
    let current: JsonValue = target;
    for (const segment of path) {
      if (segment.type === "key") {
        if (!isJsonObject(current) || !(segment.key in current)) {
          return null;
        }
        current = current[segment.key];
        continue;
      }
      if (!Array.isArray(current) || segment.index >= current.length) {
        return null;
      }
      current = current[segment.index];
    }
    return current;
  },
  applyArrayDeletions = (
    target: JsonValue,
    paths: BodyOverridePathSegment[][],
  ): JsonValue => {
    if (paths.length === 0) {
      return target;
    }
    const grouped = new Map<
      string,
      { parentPath: BodyOverridePathSegment[]; indices: number[] }
    >();
    for (const path of paths) {
      const lastPathSegment = path.at(-1);
      if (!lastPathSegment || lastPathSegment.type !== "index") {
        continue;
      }
      const parentPath = path.slice(0, -1),
        key = serializePath(parentPath),
        group = grouped.get(key);
      if (group) {
        group.indices.push(lastPathSegment.index);
        continue;
      }
      grouped.set(key, {
        indices: [lastPathSegment.index],
        parentPath,
      });
    }
    const groups = Array.from(grouped.values()).sort(
      (left, right) => right.parentPath.length - left.parentPath.length,
    );
    for (const group of groups) {
      const value = getValueAtPath(target, group.parentPath);
      if (!Array.isArray(value)) {
        continue;
      }
      const uniqueIndices = Array.from(new Set(group.indices)).sort(
        (left, right) => right - left,
      );
      uniqueIndices.forEach((index) => {
        if (index < value.length) {
          value.splice(index, 1);
        }
      });
    }
    return target;
  },
  applyBodyOverrideRuleList = (
    target: JsonObject,
    rules: BodyOverrideRule[],
  ): JsonObject => {
    let current: JsonValue = target;
    const deferredArrayDeletions: BodyOverridePathSegment[][] = [];
    for (const rule of rules) {
      const lastSegment = rule.path.at(-1);
      if (rule.value === null) {
        if (lastSegment?.type === "index") {
          deferredArrayDeletions.push(rule.path);
          continue;
        }
        current = deleteValueAtPath(current, rule.path);
        continue;
      }
      current = setValueAtPath(current, rule.path, rule.value);
    }
    current = applyArrayDeletions(current, deferredArrayDeletions);
    if (!isJsonObject(current)) {
      throw new Error("请求体覆写后根节点必须保持对象");
    }
    return current;
  };

export const parseBodyOverrideRules = (
  configText: string,
): BodyOverrideRule[] => {
  const normalized = ensureStringInput(configText);
  if (normalized === "") {
    return [];
  }
  try {
    const rawRules =
      parseRawRulesFromJson(normalized) ??
      parseRawRulesFromYamlLike(normalized);
    return rawRules.map((rule) => ({
      path: parsePathSegments(rule.path),
      value: rule.value,
    }));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("请求体覆写配置解析失败", {
      configText: normalized,
      errorMessage,
    });
    throw new Error(`请求体覆写配置无效：${errorMessage}`);
  }
};

export const applyBodyOverrideRules = <TBody extends Record<string, unknown>>(
  body: TBody,
  configText: string,
): TBody => {
  const rules = parseBodyOverrideRules(configText);
  if (rules.length === 0) {
    return body;
  }
  const rootBody = ensureRootBody(body),
    applied = applyBodyOverrideRuleList(rootBody, rules);
  return applied as TBody;
};
