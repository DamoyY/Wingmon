import type { Settings } from "../services/index.ts";

type SettingsInput = Pick<Settings, "apiKey" | "baseUrl" | "model"> | null;

const normalize = (value: string): string => value.trim();

export const ensureSettingsReady = (settings: SettingsInput): boolean => {
  if (settings === null) {
    return false;
  }
  return Boolean(
    normalize(settings.apiKey) &&
    normalize(settings.baseUrl) &&
    normalize(settings.model),
  );
};
