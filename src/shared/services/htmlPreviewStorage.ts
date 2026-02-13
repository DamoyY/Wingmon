import createRandomId from "../utils/createRandomId.ts";

export type HtmlPreviewEntry = {
  code: string;
  createdAt: number;
};

type HtmlPreviewEntries = Partial<Record<string, HtmlPreviewEntry>>;
type LooseHtmlPreviewEntry = {
  code?: string;
  createdAt?: number;
};
type HtmlPreviewEntryLike = HtmlPreviewEntry | LooseHtmlPreviewEntry | null;
type HtmlPreviewEntriesInput = Record<string, HtmlPreviewEntryLike>;
type HtmlPreviewStoragePayload = Record<
  string,
  HtmlPreviewEntriesInput | undefined
>;

const STORAGE_KEY = "html_previews";
const MAX_PREVIEWS = 20;

const isHtmlPreviewEntry = (
  entry: HtmlPreviewEntryLike,
): entry is HtmlPreviewEntry =>
  Boolean(
    entry &&
    typeof entry.code === "string" &&
    typeof entry.createdAt === "number" &&
    Number.isFinite(entry.createdAt),
  );

const sanitizeEntries = (
  entries: HtmlPreviewEntriesInput | null,
): HtmlPreviewEntries => {
  if (!entries || typeof entries !== "object") {
    return {};
  }
  const normalized: HtmlPreviewEntries = {};
  Object.entries(entries).forEach(([id, entry]) => {
    if (!isHtmlPreviewEntry(entry)) {
      console.error("HTML 预览条目无效", id, entry);
      return;
    }
    normalized[id] = entry;
  });
  return normalized;
};

const loadEntries = async (): Promise<HtmlPreviewEntries> => {
  const result =
    await chrome.storage.local.get<HtmlPreviewStoragePayload>(STORAGE_KEY);
  const entries = result[STORAGE_KEY];
  if (!entries) {
    return {};
  }
  if (typeof entries !== "object") {
    console.error("HTML 预览存储格式无效", entries);
    return {};
  }
  return sanitizeEntries(entries);
};

const pruneEntries = (entries: HtmlPreviewEntries): HtmlPreviewEntries => {
  const items = Object.entries(entries)
    .filter(
      (entry): entry is [string, HtmlPreviewEntry] => entry[1] !== undefined,
    )
    .map(([id, entry]) => ({
      createdAt: entry.createdAt,
      id,
    }));
  items.sort((a, b) => b.createdAt - a.createdAt);
  const keepIds = new Set(items.slice(0, MAX_PREVIEWS).map((item) => item.id));
  return Object.fromEntries(
    Object.entries(entries).filter(
      (entry): entry is [string, HtmlPreviewEntry] =>
        keepIds.has(entry[0]) && entry[1] !== undefined,
    ),
  );
};

export const saveHtmlPreview = async ({
  code,
}: {
  code: string;
}): Promise<string> => {
  const entries = await loadEntries();
  const id = createRandomId("html");
  entries[id] = { code, createdAt: Date.now() };
  const nextEntries = pruneEntries(entries);
  await chrome.storage.local.set<HtmlPreviewStoragePayload>({
    [STORAGE_KEY]: nextEntries,
  });
  return id;
};

export const getHtmlPreview = async (
  id: string,
): Promise<HtmlPreviewEntry | null> => {
  const entries = await loadEntries();
  const entry = entries[id];
  if (!entry) {
    return null;
  }
  return entry;
};

export const getHtmlPreviewStorageKey = (): string => STORAGE_KEY;
