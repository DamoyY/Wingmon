import { confirmDialog, confirmMessage } from "./elements.js";

const showConfirmDialog = (message) =>
  new Promise((resolve) => {
    confirmMessage.textContent = message;
    confirmDialog.show();
    const handleClose = () => {
      confirmDialog.removeEventListener("close", handleClose);
      resolve(confirmDialog.returnValue === "confirm");
    };
    confirmDialog.addEventListener("close", handleClose);
  });

export default showConfirmDialog;
