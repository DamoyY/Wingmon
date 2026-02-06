declare module "*.md" {
  const content: string;
  export default content;
}

declare module "tiktoken/tiktoken_bg.wasm" {
  const content: BufferSource;
  export default content;
}

declare module "turndown" {
  export type TurndownRule = {
    filter:
      | string
      | string[]
      | ((node: Node, options: Record<string, string>) => boolean);
    replacement: (content: string, node: Node) => string;
  };

  export type TurndownPlugin = (service: TurndownService) => void;

  export type TurndownOptions = {
    codeBlockStyle?: "fenced" | "indented";
  };

  export default class TurndownService {
    constructor(options?: TurndownOptions);
    addRule(key: string, rule: TurndownRule): TurndownService;
    remove(tagNames: string[]): TurndownService;
    use(plugin: TurndownPlugin): TurndownService;
    escape(value: string): string;
    turndown(input: string | Node): string;
  }
}

declare module "turndown-plugin-gfm" {
  import { type TurndownPlugin } from "turndown";

  export const tables: TurndownPlugin;
  export const gfm: TurndownPlugin;
}
