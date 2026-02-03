const normalizeText = (value?: string | null): string => (value ?? "").trim();

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
        throw new Error(`aria-labelledby 指向不存在的控件: ${id}`);
      }
      return normalizeText(target.textContent);
    }),
    merged = labels.filter(Boolean).join(" ").trim();
  return merged || "";
};

export { normalizeText, buildIdMap, getLabelFromIds };
