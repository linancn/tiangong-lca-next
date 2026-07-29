export type CommandAuditPayload = {
  command: string;
  actorUserId: string;
  targetTable: string;
  targetId: string;
  targetVersion: string;
  payload: Record<string, unknown>;
};

export function buildCommandAuditPayload(input: CommandAuditPayload): CommandAuditPayload {
  return {
    ...input,
    payload: structuredClone(input.payload),
  };
}
