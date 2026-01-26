export const assignLlmIds = (root) => {
  const buttons = root.querySelectorAll(
    'button, input[type="button"], input[type="submit"]',
  );
  const buttonCount = buttons.length;
  const idBase = 36;
  const minIdLength = 4;
  const idLength =
    buttonCount <= 1 ? minIdLength : (
      Math.max(minIdLength, Math.ceil(Math.log(buttonCount) / Math.log(idBase)))
    );
  const usedIds = new Set();
  buttons.forEach((button, index) => {
    const id = index.toString(idBase).padStart(idLength, "0");
    if (usedIds.has(id)) {
      throw new Error(`生成按钮 ID 重复: ${id}`);
    }
    usedIds.add(id);
    button.setAttribute("data-llm-id", id);
  });
};
