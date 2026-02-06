import type { Tiktoken } from "tiktoken/init";
import * as tiktoken from "tiktoken/init";
import tiktokenWasmBytes from "tiktoken/tiktoken_bg.wasm";

type TiktokenInitModule = typeof tiktoken & {
  __wbg_set_wasm: (exports: WebAssembly.Exports) => void;
};

const tiktokenInit = tiktoken as TiktokenInitModule;
let isTiktokenWasmReady = false;

const ensureTiktokenWasmReady = (): void => {
  if (isTiktokenWasmReady) {
    return;
  }
  const wasmModule = new WebAssembly.Module(tiktokenWasmBytes),
    wasmInstance = new WebAssembly.Instance(wasmModule, {
      "./tiktoken_bg.js": tiktoken,
    });
  tiktokenInit.__wbg_set_wasm(wasmInstance.exports);
  isTiktokenWasmReady = true;
};

const createO200kBaseEncoding = (): Tiktoken => {
  ensureTiktokenWasmReady();
  return tiktoken.get_encoding("o200k_base");
};

export { createO200kBaseEncoding };
