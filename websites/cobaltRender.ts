import type {
  LocaleCode,
  PolicyBlock,
  PolicyCard,
  PolicySection,
} from "./cobaltTypes.ts";
import { policyDocuments } from "./cobaltPolicy.ts";

const resolveHtmlLanguage = (locale: LocaleCode): string =>
  locale === "zh" ? "zh-CN" : "en";

const createCardElement = (card: PolicyCard): HTMLElement => {
  const wrapper = document.createElement("article");
  wrapper.className = "info-card";

  const title = document.createElement("p");
  title.className = "info-card-title";
  title.textContent = card.title;

  const text = document.createElement("p");
  text.className = "info-card-text";
  text.textContent = card.text;

  wrapper.append(title, text);
  return wrapper;
};

const createListElement = (items: string[]): HTMLElement => {
  const list = document.createElement("ul");
  list.className = "policy-list";
  for (const item of items) {
    const entry = document.createElement("li");
    entry.textContent = item;
    list.append(entry);
  }
  return list;
};

const createParagraphElement = (text: string): HTMLElement => {
  const paragraph = document.createElement("p");
  paragraph.className = "policy-paragraph";
  paragraph.textContent = text;
  return paragraph;
};

const createBlockElement = (block: PolicyBlock): HTMLElement => {
  if (block.type === "paragraph") {
    return createParagraphElement(block.text);
  }
  if (block.type === "list") {
    return createListElement(block.items);
  }
  const cardGrid = document.createElement("div");
  cardGrid.className = "policy-card-grid";
  for (const card of block.items) {
    cardGrid.append(createCardElement(card));
  }
  return cardGrid;
};

const createSectionElement = (section: PolicySection): HTMLElement => {
  const sectionElement = document.createElement("section");
  sectionElement.className = "policy-section";

  const heading = document.createElement("h2");
  heading.className = "policy-heading";
  heading.textContent = section.heading;
  sectionElement.append(heading);

  for (const block of section.blocks) {
    sectionElement.append(createBlockElement(block));
  }
  return sectionElement;
};

const updateButtonStates = (locale: LocaleCode): void => {
  const nodes = Array.from(document.querySelectorAll("[data-locale]"));
  for (const node of nodes) {
    if (!(node instanceof HTMLButtonElement)) {
      console.error("语言切换元素不是按钮", node);
      throw new Error("语言切换元素不是按钮");
    }
    const button = node;
    const target = button.dataset.locale === "zh" ? "zh" : "en";
    const isActive = target === locale;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", isActive ? "true" : "false");
  }
};

export const renderPolicyDocument = (
  locale: LocaleCode,
  target: HTMLElement,
): void => {
  const content = policyDocuments[locale];
  const fragment = document.createDocumentFragment();

  const title = document.createElement("h1");
  title.className = "policy-title";
  title.textContent = content.title;

  const updateTime = document.createElement("p");
  updateTime.className = "policy-updated-time";
  updateTime.textContent = content.updatedAt;

  const introduction = document.createElement("p");
  introduction.className = "policy-introduction";
  introduction.textContent = content.introduction;

  fragment.append(title, updateTime, introduction);
  for (const section of content.sections) {
    fragment.append(createSectionElement(section));
  }

  target.replaceChildren(fragment);
  updateButtonStates(locale);
  document.documentElement.lang = resolveHtmlLanguage(locale);
};
