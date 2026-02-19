export const codexBackendBaseUrl = "https://chatgpt.com/backend-api/codex";
const codexTokenStorageKey = "codex_oauth_tokens";
const codexOriginator = "codex_cli_rs";
const oauthConfig = {
  authorizeUrl: "https://auth.openai.com/oauth/authorize",
  clientId: "app_EMoamEEZ73f0CkXaXp7hrann",
  redirectUri: "http://localhost:1455/auth/callback",
  scopes: "openid profile email offline_access",
  tokenUrl: "https://auth.openai.com/oauth/token",
};
const codexResponsesVersion = "0.104.0";
const oauthTimeoutMs = 5 * 60 * 1000;
type JsonRecord = Record<string, unknown>;
type JwtPayload = JsonRecord;
type CodexAuthClaims = { chatgpt_account_id?: string };
type CodexTokenResponse = {
  access_token: string;
  id_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
};
export type CodexOAuthTokens = CodexTokenResponse & { obtained_at: string };
export type CodexAuthProfile = {
  sub: string;
  email: string;
  chatgptAccountId: string;
};
export type CodexLoginResult = {
  accessToken: string;
  profile: CodexAuthProfile;
};

const isJsonRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readString = (value: unknown): string =>
  typeof value === "string" ? value : "";

const readStringField = (record: JsonRecord, fieldName: string): string =>
  readString(record[fieldName]);

const readOptionalNumberField = (
  record: JsonRecord,
  fieldName: string,
): number | null => {
  const value = record[fieldName];
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  return null;
};

const parseJsonRecord = (
  text: string,
  parseErrorMessage: string,
): JsonRecord => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    console.error(parseErrorMessage, error);
    throw new Error(parseErrorMessage);
  }
  if (!isJsonRecord(parsed)) {
    throw new Error(parseErrorMessage);
  }
  return parsed;
};

const base64UrlEncodeBytes = (bytes: Uint8Array): string => {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary)
    .replace(/\+/gu, "-")
    .replace(/\//gu, "_")
    .replace(/=+$/gu, "");
};
const createRandomString = (byteLength: number): string => {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return base64UrlEncodeBytes(bytes);
};
const createCodeChallenge = async (codeVerifier: string): Promise<string> => {
  const data = new TextEncoder().encode(codeVerifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return base64UrlEncodeBytes(new Uint8Array(digest));
};
const createUuid = (): string =>
  typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${String(Date.now())}-${Math.random().toString(16).slice(2)}`;
const parseJwtPayload = (token: string): JwtPayload => {
  if (!token.trim()) {
    return {};
  }
  const sections = token.split(".");
  if (sections.length < 2) {
    throw new Error("JWT 格式无效");
  }
  const payloadSection = sections[1];
  const normalizedPayload = payloadSection
    .replace(/-/gu, "+")
    .replace(/_/gu, "/");
  const paddedPayload =
    normalizedPayload + "=".repeat((4 - (normalizedPayload.length % 4)) % 4);
  const decoded = atob(paddedPayload);
  return parseJsonRecord(decoded, "JWT Payload 解析失败");
};
const parseCodeAndStateFromUrl = (
  callbackUrl: string,
): { code: string; state: string } => {
  const parsed = new URL(callbackUrl);
  const queryCode = parsed.searchParams.get("code");
  const queryState = parsed.searchParams.get("state");
  if (queryCode !== null && queryState !== null) {
    return { code: queryCode, state: queryState };
  }
  const rawHash = parsed.hash.startsWith("#")
    ? parsed.hash.slice(1)
    : parsed.hash;
  const hashParams = new URLSearchParams(rawHash);
  const hashCode = hashParams.get("code");
  const hashState = hashParams.get("state");
  if (hashCode !== null && hashState !== null) {
    return { code: hashCode, state: hashState };
  }
  throw new Error("回调 URL 缺少 code 或 state");
};
const toAuthClaims = (value: unknown): CodexAuthClaims => {
  if (!isJsonRecord(value)) {
    return {};
  }
  const chatgptAccountId = readString(value.chatgpt_account_id).trim();
  if (!chatgptAccountId) {
    return {};
  }
  return { chatgpt_account_id: chatgptAccountId };
};

const parseTokenResponse = (raw: string): CodexTokenResponse => {
  const data = parseJsonRecord(raw, "Token 响应 JSON 解析失败");
  const accessToken = readStringField(data, "access_token").trim();
  if (!accessToken) {
    throw new Error("Token 响应缺少 access_token");
  }
  const tokenResponse: CodexTokenResponse = { access_token: accessToken };
  const idToken = readStringField(data, "id_token").trim();
  if (idToken) {
    tokenResponse.id_token = idToken;
  }
  const refreshToken = readStringField(data, "refresh_token").trim();
  if (refreshToken) {
    tokenResponse.refresh_token = refreshToken;
  }
  const expiresIn = readOptionalNumberField(data, "expires_in");
  if (expiresIn !== null) {
    tokenResponse.expires_in = expiresIn;
  }
  const tokenType = readStringField(data, "token_type").trim();
  if (tokenType) {
    tokenResponse.token_type = tokenType;
  }
  const scope = readStringField(data, "scope").trim();
  if (scope) {
    tokenResponse.scope = scope;
  }
  return tokenResponse;
};
const waitForOauthCallbackUrl = (
  tabId: number,
  redirectUri: string,
): Promise<string> =>
  new Promise((resolve, reject) => {
    let timeoutId: number | null = null;
    const clearAll = (): void => {
      chrome.tabs.onUpdated.removeListener(handleTabUpdated);
      chrome.tabs.onRemoved.removeListener(handleTabRemoved);
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    };
    const resolveIfMatches = (candidateUrl: string | undefined): boolean => {
      if (!candidateUrl) {
        return false;
      }
      if (!candidateUrl.startsWith(redirectUri)) {
        return false;
      }
      clearAll();
      resolve(candidateUrl);
      return true;
    };
    const readUrl = (value: unknown): string | undefined => {
      if (!isJsonRecord(value)) {
        return undefined;
      }
      const candidate = value.url;
      return typeof candidate === "string" ? candidate : undefined;
    };
    const handleTabUpdated = (
      updatedTabId: number,
      changeInfo: unknown,
      tab: unknown,
    ): void => {
      if (updatedTabId !== tabId) {
        return;
      }
      if (resolveIfMatches(readUrl(changeInfo))) {
        return;
      }
      resolveIfMatches(readUrl(tab));
    };
    const handleTabRemoved = (removedTabId: number): void => {
      if (removedTabId !== tabId) {
        return;
      }
      clearAll();
      reject(new Error("登录标签页已关闭"));
    };
    timeoutId = setTimeout(() => {
      clearAll();
      reject(new Error("等待登录回调超时"));
    }, oauthTimeoutMs);
    chrome.tabs.onUpdated.addListener(handleTabUpdated);
    chrome.tabs.onRemoved.addListener(handleTabRemoved);
  });
const closeTab = async (tabId: number): Promise<void> => {
  try {
    await chrome.tabs.remove(tabId);
  } catch (error) {
    console.error("关闭登录标签页失败", error);
  }
};
const exchangeCodeForTokens = async ({
  code,
  codeVerifier,
}: {
  code: string;
  codeVerifier: string;
}): Promise<CodexOAuthTokens> => {
  const form = new URLSearchParams();
  form.set("grant_type", "authorization_code");
  form.set("code", code);
  form.set("redirect_uri", oauthConfig.redirectUri);
  form.set("client_id", oauthConfig.clientId);
  form.set("code_verifier", codeVerifier);
  const response = await fetch(oauthConfig.tokenUrl, {
    body: form.toString(),
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    method: "POST",
  });
  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(
      `Token 兑换失败，状态码：${String(response.status)}，响应：${responseText}`,
    );
  }
  const tokenResponse = parseTokenResponse(responseText);
  return { ...tokenResponse, obtained_at: new Date().toISOString() };
};
const openLoginTab = async (authorizeUrl: string): Promise<number> => {
  const tab = await chrome.tabs.create({ active: true, url: authorizeUrl });
  if (!Number.isInteger(tab.id)) {
    throw new Error("创建登录标签页失败");
  }
  return tab.id;
};
export const isCodexApiType = (apiType: string): apiType is "codex" =>
  apiType === "codex";
export const extractCodexAuthProfile = (
  tokens: Pick<CodexOAuthTokens, "access_token" | "id_token">,
): CodexAuthProfile => {
  const idTokenPayload = parseJwtPayload(tokens.id_token ?? "");
  const authClaims = toAuthClaims(
    idTokenPayload["https://api.openai.com/auth"],
  );
  return {
    chatgptAccountId: readString(authClaims.chatgpt_account_id),
    email: readString(idTokenPayload.email),
    sub: readString(idTokenPayload.sub),
  };
};
export const saveCodexTokens = async (
  tokens: CodexOAuthTokens,
): Promise<void> => {
  await chrome.storage.local.set({ [codexTokenStorageKey]: tokens });
};
export const getCodexTokens = async (): Promise<CodexOAuthTokens | null> => {
  const storage = await chrome.storage.local.get(codexTokenStorageKey);
  const rawTokens = storage[codexTokenStorageKey];
  if (!isJsonRecord(rawTokens)) {
    return null;
  }
  const accessToken = readStringField(rawTokens, "access_token").trim();
  const obtainedAt = readStringField(rawTokens, "obtained_at").trim();
  if (!accessToken || !obtainedAt) {
    return null;
  }
  const tokens: CodexOAuthTokens = {
    access_token: accessToken,
    obtained_at: obtainedAt,
  };
  const idToken = readStringField(rawTokens, "id_token").trim();
  if (idToken) {
    tokens.id_token = idToken;
  }
  const refreshToken = readStringField(rawTokens, "refresh_token").trim();
  if (refreshToken) {
    tokens.refresh_token = refreshToken;
  }
  const expiresIn = readOptionalNumberField(rawTokens, "expires_in");
  if (expiresIn !== null) {
    tokens.expires_in = expiresIn;
  }
  const tokenType = readStringField(rawTokens, "token_type").trim();
  if (tokenType) {
    tokens.token_type = tokenType;
  }
  const scope = readStringField(rawTokens, "scope").trim();
  if (scope) {
    tokens.scope = scope;
  }
  return tokens;
};
export const clearCodexTokens = async (): Promise<void> => {
  await chrome.storage.local.remove(codexTokenStorageKey);
};
export const buildCodexResponsesHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    conversation_id: createUuid(),
    "openai-beta": "responses=experimental",
    originator: codexOriginator,
    session_id: createUuid(),
    version: codexResponsesVersion,
  };
  return headers;
};
export const startCodexLogin = async (): Promise<CodexLoginResult> => {
  const state = createRandomString(24);
  const codeVerifier = createRandomString(48);
  const codeChallenge = await createCodeChallenge(codeVerifier);
  const authUrl = new URL(oauthConfig.authorizeUrl);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", oauthConfig.clientId);
  authUrl.searchParams.set("redirect_uri", oauthConfig.redirectUri);
  authUrl.searchParams.set("scope", oauthConfig.scopes);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("id_token_add_organizations", "true");
  authUrl.searchParams.set("codex_cli_simplified_flow", "true");
  authUrl.searchParams.set("originator", codexOriginator);
  const loginTabId = await openLoginTab(authUrl.toString());
  try {
    const callbackUrl = await waitForOauthCallbackUrl(
      loginTabId,
      oauthConfig.redirectUri,
    );
    const callbackData = parseCodeAndStateFromUrl(callbackUrl);
    if (callbackData.state !== state) {
      throw new Error("OAuth state 校验失败");
    }
    const tokens = await exchangeCodeForTokens({
      code: callbackData.code,
      codeVerifier,
    });
    await saveCodexTokens(tokens);
    const profile = extractCodexAuthProfile(tokens);
    return { accessToken: tokens.access_token, profile };
  } finally {
    await closeTab(loginTabId);
  }
};
