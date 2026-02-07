import type {
  SetPageHashRequest,
  SetPageHashResponse,
} from "../../shared/index.ts";
import { setPageHash } from "../pageHashServices/index.js";

type SendResponse = (response: SetPageHashResponse) => void;

const handleSetPageHash = (
  message: SetPageHashRequest,
  sendResponse: SendResponse,
): void => {
  sendResponse(setPageHash(message));
};

export default handleSetPageHash;
