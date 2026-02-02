const normalizeText = (value) => (value || "").trim(),
  buildIdMap = (root) => {
    const idMap = new Map();
    root.querySelectorAll("[id]").forEach((element) => {
      const id = element.getAttribute("id");
      if (id && !idMap.has(id)) {
        idMap.set(id, element);
      }
    });
    return idMap;
  },
  getLabelFromIds = (idMap, ids) => {
    const labels = ids.map((id) => {
        const target = idMap.get(id);
        if (!target) {
          throw new Error(`aria-labelledby 指向不存在的按钮: ${id}`);
        }
        return normalizeText(target.textContent);
      }),
      merged = labels.filter(Boolean).join(" ").trim();
    return merged || "";
  },
  getButtonLabel = (idMap, button) => {
    const directText =
        button.tagName === "INPUT" ? button.value : button.textContent,
      normalizedText = normalizeText(directText);
    if (normalizedText) {
      return normalizedText;
    }
    const ariaLabel = normalizeText(button.getAttribute("aria-label"));
    if (ariaLabel) {
      return ariaLabel;
    }
    const ariaLabelledby = normalizeText(
      button.getAttribute("aria-labelledby"),
    );
    if (ariaLabelledby) {
      const ids = ariaLabelledby.split(/\s+/).filter(Boolean);
      if (!ids.length) {
        throw new Error("aria-labelledby 为空，无法解析按钮名称");
      }
      const labeledText = getLabelFromIds(idMap, ids);
      if (labeledText) {
        return labeledText;
      }
    }
    const titleText = normalizeText(button.getAttribute("title"));
    if (titleText) {
      return titleText;
    }
    const imgAlt = normalizeText(
      button.querySelector("img")?.getAttribute("alt"),
    );
    if (imgAlt) {
      return imgAlt;
    }
    const svgTitle = normalizeText(
      button.querySelector("svg title")?.textContent,
    );
    if (svgTitle) {
      return svgTitle;
    }
    const svgLabel = normalizeText(
      button.querySelector("svg")?.getAttribute("aria-label"),
    );
    if (svgLabel) {
      return svgLabel;
    }
    return "未命名按钮";
  },
  applyReplacementToButton = (button, replacement) => {
    const target = button;
    target.textContent = replacement;
    if (target.tagName === "INPUT") {
      target.value = replacement;
      target.setAttribute("value", replacement);
    }
  },
  replaceButtons = (root) => {
    const idMap = buildIdMap(root),
      buttons = root.querySelectorAll("[data-llm-id]");
    buttons.forEach((buttonNode) => {
      const button = buttonNode,
        id = normalizeText(button.getAttribute("data-llm-id"));
      if (!id) {
        throw new Error("按钮缺少 data-llm-id");
      }
      const text = getButtonLabel(idMap, button),
        replacement = `[button: "${text}", id: "${id}"]`;
      applyReplacementToButton(button, replacement);
    });
  };

export default replaceButtons;
