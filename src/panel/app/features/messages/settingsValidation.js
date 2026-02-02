const ensureSettingsPayload = (settings) => {
  if (!settings || typeof settings !== "object") {
    throw new Error("设置信息无效");
  }
  return settings;
};

const ensureSettingsReady = (settings) => {
  const { apiKey, baseUrl, model } = ensureSettingsPayload(settings);
  return Boolean(apiKey && baseUrl && model);
};

export default ensureSettingsReady;
