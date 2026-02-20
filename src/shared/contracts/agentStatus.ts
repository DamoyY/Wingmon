export const AGENT_STATUS = {
  browsing: "browsing",
  coding: "coding",
  idle: "idle",
  operating: "operating",
  searching: "searching",
  speaking: "speaking",
  thinking: "thinking",
} as const;

export type AgentStatus = (typeof AGENT_STATUS)[keyof typeof AGENT_STATUS];

export const agentStatuses = [
  AGENT_STATUS.idle,
  AGENT_STATUS.thinking,
  AGENT_STATUS.speaking,
  AGENT_STATUS.browsing,
  AGENT_STATUS.searching,
  AGENT_STATUS.operating,
  AGENT_STATUS.coding,
] as const satisfies readonly AgentStatus[];

export const isAgentStatus = (value: unknown): value is AgentStatus => {
  if (typeof value !== "string") {
    return false;
  }
  return agentStatuses.some((status) => status === value);
};
