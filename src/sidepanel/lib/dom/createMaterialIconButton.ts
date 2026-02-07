export type MaterialIconButtonOptions = {
  icon: string;
  className?: string;
  title: string;
  onClick?: (event: MouseEvent) => void;
};

const ensureTitle = (title: string): string => {
  if (typeof title !== "string" || !title.trim()) {
    throw new Error("按钮标题无效");
  }
  return title;
};

export const createMaterialIconButton = ({
  icon,
  className,
  title,
  onClick,
}: MaterialIconButtonOptions): HTMLElement => {
  const button = document.createElement("md-icon-button");
  const resolvedTitle = ensureTitle(title);
  if (typeof className === "string" && className.trim()) {
    button.className = className;
  }
  button.title = resolvedTitle;
  button.setAttribute("aria-label", resolvedTitle);
  const iconElement = document.createElement("md-icon");
  iconElement.textContent = icon;
  button.appendChild(iconElement);
  if (typeof onClick === "function") {
    button.addEventListener("click", onClick);
  }
  return button;
};
