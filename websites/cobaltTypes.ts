export type LocaleCode = "en" | "zh";

export type PolicyCard = {
  title: string;
  text: string;
};

export type ParagraphBlock = {
  type: "paragraph";
  text: string;
};

export type ListBlock = {
  type: "list";
  items: string[];
};

export type CardBlock = {
  type: "cards";
  items: PolicyCard[];
};

export type PolicyBlock = ParagraphBlock | ListBlock | CardBlock;

export type PolicySection = {
  heading: string;
  blocks: PolicyBlock[];
};

export type PolicyDocument = {
  title: string;
  updatedAt: string;
  introduction: string;
  sections: PolicySection[];
};

export type PolicyDocumentMap = Record<LocaleCode, PolicyDocument>;
