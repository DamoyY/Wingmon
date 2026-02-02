import { t } from "../../utils/index.js";
import { getAllTabs } from "../../services/index.js";
import { ensureObjectArgs } from "./utils.js";

const parameters = {
  type: "object",
  properties: {},
  additionalProperties: false,
};

const buildListTabsOutput = (tabs) =>
  tabs
    .map((tab) => {
      const title = tab.title || t("statusNoTitle");
      const url = tab.url || t("statusNoAddress");
      const { id } = tab;
      return `${t("statusTitle")}: "${title}"\nURL: "${url}"\n${t("statusTabId")}: "${id}"`;
    })
    .join("\n\n");

const validateArgs = (args) => {
  ensureObjectArgs(args);
  return {};
};

const execute = async () => {
  const tabs = await getAllTabs();
  return buildListTabsOutput(tabs);
};

export default {
  key: "listTabs",
  name: "list_tabs",
  description: t("toolListTabs"),
  parameters,
  validateArgs,
  execute,
};
