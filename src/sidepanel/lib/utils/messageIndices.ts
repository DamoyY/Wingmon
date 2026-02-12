type IndicesInput = number | readonly number[];

const normalizeIndices = (indices: IndicesInput): number[] => {
  if (typeof indices === "number" && Number.isInteger(indices)) {
    return [indices];
  }
  if (!Array.isArray(indices) || indices.length === 0) {
    throw new Error("消息索引无效");
  }
  const normalized = indices.filter((index): index is number =>
    Number.isInteger(index),
  );
  if (normalized.length !== indices.length) {
    throw new Error("消息索引无效");
  }
  return normalized;
};

export const resolveIndicesKey = (indices: IndicesInput): string =>
  normalizeIndices(indices).join(",");

export const parseIndicesKey = (key: string): number[] => {
  if (typeof key !== "string" || key.trim().length === 0) {
    throw new Error("消息索引键无效");
  }
  const values = key.split(",");
  if (values.length === 0) {
    throw new Error("消息索引键无效");
  }
  const parsed = values.map((value) => {
    const normalized = value.trim();
    if (!/^\d+$/u.test(normalized)) {
      throw new Error("消息索引键无效");
    }
    const index = Number(normalized);
    if (!Number.isInteger(index)) {
      throw new Error("消息索引键无效");
    }
    return index;
  });
  return normalizeIndices(parsed);
};

export default normalizeIndices;
