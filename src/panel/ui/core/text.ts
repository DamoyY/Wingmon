const setText = (node: Node, text: string): void => {
  const target = node;
  target.textContent = text || "";
};
export default setText;
