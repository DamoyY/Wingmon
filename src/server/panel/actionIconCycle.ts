type ActionIconPathSize = 16 | 32 | 48 | 128;
type ActionIconPathMap = Record<ActionIconPathSize, string>;
type ActionIconImageDataMap = Record<ActionIconPathSize, ImageData>;

const actionIconFrameCount = 12;
const actionIconIntervalMs = 200;

export type ActionIconCycleController = {
  ensureFramesPreloaded: () => Promise<void>;
  sync: (sending: boolean) => void;
};

const createActionIconPathMap = (frame: number): ActionIconPathMap => ({
  16: `${String(frame)}.16.png`,
  32: `${String(frame)}.32.png`,
  48: `${String(frame)}.48.png`,
  128: `${String(frame)}.128.png`,
});

const loadActionIconImageData = async (
  path: string,
  size: ActionIconPathSize,
): Promise<ImageData> => {
  const response = await fetch(chrome.runtime.getURL(path));
  if (!response.ok) {
    throw new Error(
      `读取扩展图标资源失败，路径：${path}，状态码：${String(response.status)}`,
    );
  }
  const blob = await response.blob();
  const bitmap = await createImageBitmap(blob);
  try {
    const canvas = new OffscreenCanvas(size, size);
    const context = canvas.getContext("2d");
    if (context === null) {
      throw new Error(`创建图标画布上下文失败，路径：${path}`);
    }
    context.clearRect(0, 0, size, size);
    context.drawImage(bitmap, 0, 0, size, size);
    return context.getImageData(0, 0, size, size);
  } finally {
    bitmap.close();
  }
};

const loadActionIconFrameImageData = async (
  frame: number,
): Promise<ActionIconImageDataMap> => {
  const pathMap = createActionIconPathMap(frame);
  const [icon16, icon32, icon48, icon128] = await Promise.all([
    loadActionIconImageData(pathMap[16], 16),
    loadActionIconImageData(pathMap[32], 32),
    loadActionIconImageData(pathMap[48], 48),
    loadActionIconImageData(pathMap[128], 128),
  ]);
  return {
    16: icon16,
    32: icon32,
    48: icon48,
    128: icon128,
  };
};

const preloadActionIconFrames = async (
  actionIconImageDataCache: Map<number, ActionIconImageDataMap>,
): Promise<void> => {
  for (let frame = 0; frame < actionIconFrameCount; frame += 1) {
    const imageDataMap = await loadActionIconFrameImageData(frame);
    actionIconImageDataCache.set(frame, imageDataMap);
  }
};

const applyActionIconFrame = (
  frame: number,
  actionIconImageDataCache: Map<number, ActionIconImageDataMap>,
): void => {
  const imageData = actionIconImageDataCache.get(frame);
  if (imageData) {
    chrome.action.setIcon({ imageData }, () => {
      const runtimeError = chrome.runtime.lastError;
      if (!runtimeError) {
        return;
      }
      console.error(
        `设置扩展图标失败，帧序号：${String(frame)}`,
        runtimeError.message,
      );
    });
    return;
  }
  chrome.action.setIcon({ path: createActionIconPathMap(frame) }, () => {
    const runtimeError = chrome.runtime.lastError;
    if (!runtimeError) {
      return;
    }
    console.error(
      `设置扩展图标失败，帧序号：${String(frame)}`,
      runtimeError.message,
    );
  });
};

export const createActionIconCycleController =
  (): ActionIconCycleController => {
    let actionIconTimerId: number | null = null;
    let actionIconFrameIndex = 0;
    let actionIconStopRequested = false;
    let actionIconPreloadTask: Promise<void> | null = null;
    const actionIconImageDataCache = new Map<number, ActionIconImageDataMap>();

    const ensureFramesPreloaded = (): Promise<void> => {
      if (actionIconPreloadTask !== null) {
        return actionIconPreloadTask;
      }
      actionIconPreloadTask = preloadActionIconFrames(
        actionIconImageDataCache,
      ).catch((error: unknown) => {
        actionIconPreloadTask = null;
        console.error("预加载扩展图标帧失败", error);
        throw error;
      });
      return actionIconPreloadTask;
    };

    const clearActionIconTimer = (): void => {
      if (actionIconTimerId === null) {
        return;
      }
      clearInterval(actionIconTimerId);
      actionIconTimerId = null;
    };

    const startActionIconCycle = (): void => {
      actionIconStopRequested = false;
      if (actionIconTimerId !== null) {
        return;
      }
      void ensureFramesPreloaded().catch((error: unknown) => {
        console.error("启动扩展图标动画时预加载失败", error);
      });
      actionIconFrameIndex = 0;
      applyActionIconFrame(actionIconFrameIndex, actionIconImageDataCache);
      actionIconTimerId = setInterval(() => {
        actionIconFrameIndex =
          (actionIconFrameIndex + 1) % actionIconFrameCount;
        applyActionIconFrame(actionIconFrameIndex, actionIconImageDataCache);
        if (!actionIconStopRequested || actionIconFrameIndex !== 0) {
          return;
        }
        clearActionIconTimer();
        actionIconStopRequested = false;
      }, actionIconIntervalMs);
    };

    const stopActionIconCycle = (): void => {
      if (actionIconTimerId === null) {
        actionIconStopRequested = false;
        actionIconFrameIndex = 0;
        applyActionIconFrame(actionIconFrameIndex, actionIconImageDataCache);
        return;
      }
      if (actionIconFrameIndex === 0) {
        clearActionIconTimer();
        actionIconStopRequested = false;
        return;
      }
      actionIconStopRequested = true;
    };

    const sync = (sending: boolean): void => {
      if (sending) {
        startActionIconCycle();
        return;
      }
      stopActionIconCycle();
    };

    return {
      ensureFramesPreloaded,
      sync,
    };
  };
