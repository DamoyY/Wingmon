import { createRandomId } from "../utils/index.ts";

const STORAGE_KEY = "html_previews",
  MAX_PREVIEWS = 20,
  loadEntries = async () => {
    const result = await chrome.storage.local.get(STORAGE_KEY),
      entries = result?.[STORAGE_KEY];
    if (!entries) {
      return {};
    }
    if (typeof entries !== "object") {
      console.error("HTML 预览存储格式无效", entries);
      return {};
    }
    return entries;
  },
  pruneEntries = (entries) => {
    const items = Object.entries(entries).map(([id, entry]) => {
      const createdAt = Number(entry?.createdAt);
      return {
        id,
        createdAt: Number.isFinite(createdAt) ? createdAt : 0,
      };
    });
    items.sort((a, b) => b.createdAt - a.createdAt);
    const keepIds = new Set(
      items.slice(0, MAX_PREVIEWS).map((item) => item.id),
    );
    return Object.fromEntries(
      Object.entries(entries).filter(([id]) => keepIds.has(id)),
    );
  };

export const saveHtmlPreview = async ({ code }) => {
  const entries = await loadEntries(),
    id = createRandomId("html");
  entries[id] = { code, createdAt: Date.now() };
  const nextEntries = pruneEntries(entries);
  await chrome.storage.local.set({ [STORAGE_KEY]: nextEntries });
  return id;
};

export const getHtmlPreview = async (id) => {
  const entries = await loadEntries(),
    entry = entries[id];
  if (!entry || typeof entry !== "object") {
    return null;
  }
  if (typeof entry.code !== "string") {
    console.error("HTML 预览内容缺失", entry);
    return null;
  }
  return entry;
};

export const getHtmlPreviewStorageKey = () => STORAGE_KEY;
