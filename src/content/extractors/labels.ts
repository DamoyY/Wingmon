const normalizeText = (value?: string | null): string => (value ?? "").trim();

type LabelResolver = () => string;

const buildIdMap = (root: Element): Map<string, Element> => {
  const idMap = new Map<string, Element>();
  const elements = root.getElementsByTagName("*");
  Array.from(elements).forEach((element) => {
    const id = element.getAttribute("id");
    if (id && !idMap.has(id)) {
      idMap.set(id, element);
    }
  });
  return idMap;
};

const getLabelFromIds = (
  idMap: Map<string, Element>,
  ids: string[],
): string => {
  const labels = ids.map((id) => {
      const target = idMap.get(id);
      if (!target) {
        return "";
      }
      return normalizeText(target.textContent);
    }),
    merged = labels.filter(Boolean).join(" ").trim();
  return merged || "";
};

const resolveAriaLabelledby = (
  idMap: Map<string, Element>,
  element: Element,
  emptyValueError: string,
): string => {
  const ariaLabelledby = normalizeText(element.getAttribute("aria-labelledby"));
  if (!ariaLabelledby) {
    return "";
  }
  const ids = ariaLabelledby.split(/\s+/).filter(Boolean);
  if (!ids.length) {
    console.error(emptyValueError);
    return "";
  }
  return getLabelFromIds(idMap, ids);
};

const resolveFirstLabel = (resolvers: LabelResolver[]): string => {
  for (const resolver of resolvers) {
    const label = resolver();
    if (label) {
      return label;
    }
  }
  return "";
};

const resolveElementLabel = (
  idMap: Map<string, Element>,
  element: Element,
  primaryResolvers: LabelResolver[],
  fallbackResolvers: LabelResolver[],
  emptyAriaLabelledbyError: string,
): string =>
  resolveFirstLabel([
    ...primaryResolvers,
    () => normalizeText(element.getAttribute("aria-label")),
    () => resolveAriaLabelledby(idMap, element, emptyAriaLabelledbyError),
    ...fallbackResolvers,
  ]);

export { normalizeText, buildIdMap, getLabelFromIds, resolveElementLabel };
