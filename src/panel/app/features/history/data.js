import { getHistory } from "../../../services/index.ts";

const fetchSortedHistory = async () => {
  const history = await getHistory();
  return [...history].sort((a, b) => b.updatedAt - a.updatedAt);
};

export default fetchSortedHistory;
