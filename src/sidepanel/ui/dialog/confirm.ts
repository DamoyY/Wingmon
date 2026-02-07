import { elements } from "../foundation/elements.ts";

const showConfirmDialog = (message: string): Promise<boolean> =>
  new Promise<boolean>((resolve, reject) => {
    const { confirmDialog, confirmMessage } = elements;
    confirmMessage.textContent = message;
    const handleClose = () => {
      confirmDialog.removeEventListener("close", handleClose);
      resolve(confirmDialog.returnValue === "confirm");
    };
    confirmDialog.addEventListener("close", handleClose);
    void confirmDialog.show().catch((error: unknown) => {
      confirmDialog.removeEventListener("close", handleClose);
      reject(
        error instanceof Error
          ? error
          : new Error(`确认弹窗显示失败：${String(error)}`),
      );
    });
  });

export default showConfirmDialog;
