import { elements } from "../core/elements.ts";

const showConfirmDialog = (message) =>
  new Promise((resolve) => {
    const { confirmDialog, confirmMessage } = elements;
    if (!confirmDialog || !confirmMessage) {
      throw new Error("确认弹窗元素未初始化");
    }
    confirmMessage.textContent = message;
    confirmDialog.show();
    const handleClose = () => {
      confirmDialog.removeEventListener("close", handleClose);
      resolve(confirmDialog.returnValue === "confirm");
    };
    confirmDialog.addEventListener("close", handleClose);
  });

export default showConfirmDialog;
