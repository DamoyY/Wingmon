type ChromeRuntime = {
  lastError?: {
    message?: string;
  };
};

type ChromeTabs = {
  reload: (
    tabId: number,
    reloadProperties: { bypassCache?: boolean },
    callback: () => void,
  ) => void;
};

type ChromeApi = {
  runtime: ChromeRuntime;
  tabs: ChromeTabs;
};

const chromeApi = chrome as unknown as ChromeApi;

export const reloadTab = (tabId: number): Promise<void> => {
  if (typeof tabId !== "number") {
    const error = new Error("TabID 必须是数字");
    console.error(error.message);
    return Promise.reject(error);
  }
  return new Promise((resolve, reject) => {
    chromeApi.tabs.reload(tabId, {}, () => {
      if (chromeApi.runtime.lastError) {
        const message =
          chromeApi.runtime.lastError.message || "无法重新加载标签页";
        const error = new Error(message);
        console.error(error.message);
        reject(error);
        return;
      }
      resolve();
    });
  });
};
