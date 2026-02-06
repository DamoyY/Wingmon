export type DomPathErrorMessages = Readonly<{
  invalidElement: string;
  invalidRoot: string;
  outsideRoot: string;
  emptyPath: string;
}>;

const hashMultiplier = 131;
const hashModulo = 4294967296;
const encodedHashLength = 8;

export const buildDomPath = (
  element: Element | null,
  root: Element | null,
  errorMessages: DomPathErrorMessages,
): string => {
  if (!element) {
    throw new Error(errorMessages.invalidElement);
  }
  if (!root) {
    throw new Error(errorMessages.invalidRoot);
  }
  if (!root.contains(element)) {
    throw new Error(errorMessages.outsideRoot);
  }
  const segments: string[] = [];
  let current: Element | null = element;
  while (current) {
    const tagName = current.tagName.toLowerCase();
    let index = 1;
    let sibling: Element | null = current.previousElementSibling;
    while (sibling) {
      if (sibling.tagName.toLowerCase() === tagName) {
        index += 1;
      }
      sibling = sibling.previousElementSibling;
    }
    segments.push(`${tagName}:nth-of-type(${String(index)})`);
    if (current === root) {
      break;
    }
    current = current.parentElement;
  }
  if (!segments.length) {
    throw new Error(errorMessages.emptyPath);
  }
  return segments.reverse().join(">");
};

export const hashDomPath = (path: string, hashLength: number): string => {
  if (!Number.isInteger(hashLength) || hashLength <= 0) {
    throw new Error("路径哈希长度无效");
  }
  let hash = 0;
  for (let index = 0; index < path.length; index += 1) {
    hash = (hash * hashMultiplier + path.charCodeAt(index)) % hashModulo;
  }
  const encoded = Math.floor(hash)
    .toString(36)
    .padStart(encodedHashLength, "0");
  return encoded.slice(-hashLength);
};
