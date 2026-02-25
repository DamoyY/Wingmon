import type { Settings } from "../../../../shared/index.ts";
import type { ApiTypeSettingsDraft } from "./types.ts";

let activeFormApiType: Settings["apiType"] | null = null;

let settingsDraftByApiType: Partial<
  Record<Settings["apiType"], ApiTypeSettingsDraft>
> = {};

export const cacheApiTypeSettingsDraft = (
  apiType: Settings["apiType"],
  draft: ApiTypeSettingsDraft,
): void => {
  settingsDraftByApiType[apiType] = draft;
  activeFormApiType = apiType;
};

export const resolveCachedApiTypeSettingsDraft = (
  apiType: Settings["apiType"],
): ApiTypeSettingsDraft | null => settingsDraftByApiType[apiType] ?? null;

export const resolveActiveFormApiType = (): Settings["apiType"] | null =>
  activeFormApiType;

export const resetApiTypeSettingsDraftMemory = (): void => {
  settingsDraftByApiType = {};
  activeFormApiType = null;
};
