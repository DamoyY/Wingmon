const normalizeIndices = (indices) => {
  if (Number.isInteger(indices)) {
    return [indices];
  }
  if (!Array.isArray(indices) || indices.length === 0) {
    throw new Error("消息索引无效");
  }
  const normalized = indices.filter((index) => Number.isInteger(index));
  if (normalized.length !== indices.length) {
    throw new Error("消息索引无效");
  }
  return normalized;
};

export const resolveIndicesKey = (indices) =>
  normalizeIndices(indices).join(",");

export default normalizeIndices;
