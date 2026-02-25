import {
  type ButtonChunkPage,
  type GetPageContentSuccessResponse,
  type InputChunkPage,
} from "../../../shared/index.ts";
import { parseOptionalPositiveInteger } from "../validation/index.js";
import type {
  ButtonTabChunkLocation,
  InputTabChunkLocation,
  PageReadMetadata,
} from "./contracts.ts";
import { controlIdPattern, ensurePageInRange } from "./metadata.ts";

type ControlChunkPage = {
  id: string;
  pageNumber: number;
};

type ControlTabChunkLocation = {
  pageNumber: number;
  tabId: number;
};

type ControlChunkIndexState = {
  idsByTabId: Map<number, Set<string>>;
  locationById: Map<string, ControlTabChunkLocation>;
  markerPattern: RegExp;
  name: string;
};

const buttonControlMarkerPattern =
    /<< Button \| text: `[\s\S]*?` \| id: `([0-9a-z]+)` >>/gu,
  inputControlMarkerPattern =
    /<< Input \| text: `[\s\S]*?` \| id: `([0-9a-z]+)` >>/gu,
  buttonTabChunkLocationByButtonId: Map<string, ButtonTabChunkLocation> =
    new Map(),
  buttonIdsByTabId: Map<number, Set<string>> = new Map(),
  inputTabChunkLocationByInputId: Map<string, InputTabChunkLocation> =
    new Map(),
  inputIdsByTabId: Map<number, Set<string>> = new Map();

const resolveControlChunkPageItem = (
    item: ControlChunkPage,
    fieldName: string,
    index: number,
  ): ControlChunkPage => {
    if (typeof item.id !== "string") {
      throw new Error(`${fieldName}[${String(index)}].id 必须是字符串`);
    }
    const id = item.id.trim().toLowerCase();
    if (!id || !controlIdPattern.test(id)) {
      throw new Error(
        `${fieldName}[${String(index)}].id 必须是非空字母数字字符串`,
      );
    }
    const pageNumber = parseOptionalPositiveInteger(
      item.pageNumber,
      `${fieldName}[${String(index)}].pageNumber`,
    );
    if (pageNumber === undefined) {
      throw new Error(`${fieldName}[${String(index)}].pageNumber 必须是正整数`);
    }
    return {
      id,
      pageNumber,
    };
  },
  parseOptionalControlChunkPages = (
    value: readonly ControlChunkPage[] | undefined,
    fieldName: string,
  ): ControlChunkPage[] | undefined => {
    if (value === undefined) {
      return undefined;
    }
    const usedIds = new Set<string>();
    const controlChunkPages = value.map((item, index) =>
      resolveControlChunkPageItem(item, fieldName, index),
    );
    controlChunkPages.forEach((controlChunkPage) => {
      if (usedIds.has(controlChunkPage.id)) {
        throw new Error(`${fieldName} 存在重复 id：${controlChunkPage.id}`);
      }
      usedIds.add(controlChunkPage.id);
    });
    return controlChunkPages;
  },
  extractControlChunkPagesFromContent = (
    content: string,
    pageNumber: number,
    state: Pick<ControlChunkIndexState, "markerPattern" | "name">,
  ): ControlChunkPage[] => {
    const normalizedPageNumber = parseOptionalPositiveInteger(
      pageNumber,
      "pageNumber",
    );
    if (normalizedPageNumber === undefined) {
      throw new Error("pageNumber 必须是正整数");
    }
    const ids = new Set<string>();
    const controlChunkPages: ControlChunkPage[] = [];
    state.markerPattern.lastIndex = 0;
    let markerMatch = state.markerPattern.exec(content);
    while (markerMatch) {
      const markerId = markerMatch[1];
      if (typeof markerId !== "string") {
        throw new Error(`${state.name}标记缺少 id`);
      }
      const normalizedId = markerId.trim().toLowerCase();
      if (!normalizedId || !controlIdPattern.test(normalizedId)) {
        throw new Error(`${state.name}标记 id 无效：${markerId}`);
      }
      if (!ids.has(normalizedId)) {
        ids.add(normalizedId);
        controlChunkPages.push({
          id: normalizedId,
          pageNumber: normalizedPageNumber,
        });
      }
      markerMatch = state.markerPattern.exec(content);
    }
    return controlChunkPages;
  },
  clearControlChunkIndexForTab = (
    tabId: number,
    state: Pick<ControlChunkIndexState, "idsByTabId" | "locationById">,
  ): void => {
    const ids = state.idsByTabId.get(tabId);
    if (!ids) {
      return;
    }
    ids.forEach((id) => {
      const location = state.locationById.get(id);
      if (!location) {
        return;
      }
      if (location.tabId === tabId) {
        state.locationById.delete(id);
      }
    });
    state.idsByTabId.delete(tabId);
  },
  updateControlChunkIndexForTab = (
    tabId: number,
    controlChunkPages: readonly ControlChunkPage[],
    state: Pick<ControlChunkIndexState, "idsByTabId" | "locationById" | "name">,
  ): void => {
    if (!Number.isInteger(tabId) || tabId <= 0) {
      throw new Error("tabId 必须是正整数");
    }
    const nextLocations = controlChunkPages.map((controlChunkPage) => {
      if (
        !Number.isInteger(controlChunkPage.pageNumber) ||
        controlChunkPage.pageNumber <= 0
      ) {
        throw new Error("controlChunkPages.pageNumber 必须是正整数");
      }
      const existingLocation = state.locationById.get(controlChunkPage.id);
      if (existingLocation !== undefined && existingLocation.tabId !== tabId) {
        throw new Error(`${state.name}索引冲突：id=${controlChunkPage.id}`);
      }
      return {
        id: controlChunkPage.id,
        pageNumber: controlChunkPage.pageNumber,
      };
    });
    clearControlChunkIndexForTab(tabId, state);
    const ids = new Set<string>();
    nextLocations.forEach((nextLocation) => {
      state.locationById.set(nextLocation.id, {
        pageNumber: nextLocation.pageNumber,
        tabId,
      });
      ids.add(nextLocation.id);
    });
    if (!ids.size) {
      return;
    }
    state.idsByTabId.set(tabId, ids);
  },
  resolveControlChunkPages = (
    controlChunkPages: readonly ControlChunkPage[] | undefined,
    content: string,
    metadata: PageReadMetadata,
    fieldName: string,
    state: Pick<ControlChunkIndexState, "markerPattern" | "name">,
  ): ControlChunkPage[] => {
    const parsedControlChunkPages = parseOptionalControlChunkPages(
      controlChunkPages,
      fieldName,
    );
    const resolvedControlChunkPages =
      parsedControlChunkPages ??
      extractControlChunkPagesFromContent(content, metadata.pageNumber, state);
    return resolvedControlChunkPages.map((controlChunkPage, index) => ({
      id: controlChunkPage.id,
      pageNumber: ensurePageInRange(
        controlChunkPage.pageNumber,
        `${fieldName}[${String(index)}].pageNumber`,
        metadata.totalPages,
      ),
    }));
  },
  resolveControlTabChunkLocation = (
    id: string,
    state: Pick<ControlChunkIndexState, "locationById" | "name">,
  ): ControlTabChunkLocation | null => {
    const normalizedId = id.trim().toLowerCase();
    if (!normalizedId || !controlIdPattern.test(normalizedId)) {
      throw new Error(`${state.name} id 必须是非空字母数字字符串`);
    }
    const location = state.locationById.get(normalizedId);
    if (!location) {
      return null;
    }
    if (!Number.isInteger(location.tabId) || location.tabId <= 0) {
      throw new Error(`${state.name}标签页记录 tabId 无效`);
    }
    if (!Number.isInteger(location.pageNumber) || location.pageNumber <= 0) {
      throw new Error(`${state.name}标签页记录 pageNumber 无效`);
    }
    return {
      pageNumber: location.pageNumber,
      tabId: location.tabId,
    };
  };

const buttonChunkIndexState: ControlChunkIndexState = {
  idsByTabId: buttonIdsByTabId,
  locationById: buttonTabChunkLocationByButtonId,
  markerPattern: buttonControlMarkerPattern,
  name: "按钮",
};

const inputChunkIndexState: ControlChunkIndexState = {
  idsByTabId: inputIdsByTabId,
  locationById: inputTabChunkLocationByInputId,
  markerPattern: inputControlMarkerPattern,
  name: "输入框",
};

export const resolveButtonChunkPages = (
  pageData: GetPageContentSuccessResponse,
  metadata: PageReadMetadata,
): ButtonChunkPage[] =>
  resolveControlChunkPages(
    pageData.buttonChunkPages,
    pageData.content,
    metadata,
    "buttonChunkPages",
    buttonChunkIndexState,
  );

export const resolveInputChunkPages = (
  pageData: GetPageContentSuccessResponse,
  metadata: PageReadMetadata,
): InputChunkPage[] =>
  resolveControlChunkPages(
    pageData.inputChunkPages,
    pageData.content,
    metadata,
    "inputChunkPages",
    inputChunkIndexState,
  );

export const updateButtonChunkIndexForTab = (
  tabId: number,
  buttonChunkPages: readonly ButtonChunkPage[],
): void => {
  updateControlChunkIndexForTab(tabId, buttonChunkPages, buttonChunkIndexState);
};

export const updateInputChunkIndexForTab = (
  tabId: number,
  inputChunkPages: readonly InputChunkPage[],
): void => {
  updateControlChunkIndexForTab(tabId, inputChunkPages, inputChunkIndexState);
};

export const resolveButtonTabChunkLocation = (
  id: string,
): ButtonTabChunkLocation | null =>
  resolveControlTabChunkLocation(id, buttonChunkIndexState);

export const resolveInputTabChunkLocation = (
  id: string,
): InputTabChunkLocation | null =>
  resolveControlTabChunkLocation(id, inputChunkIndexState);
