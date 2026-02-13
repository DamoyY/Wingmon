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
