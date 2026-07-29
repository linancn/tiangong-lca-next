export const HARNESS_PERSONAS = {
  anonymous: {
    authenticated: false,
    expectedRoles: [],
  },
  standard_user: {
    authenticated: true,
    expectedRoles: [],
  },
  data_product_manager: {
    authenticated: true,
    expectedRoles: ['data_product_manager'],
  },
} as const;

export type HarnessPersona = keyof typeof HARNESS_PERSONAS;
export const SEMANTIC_HARNESS_USER_ID = '70400000-0000-4000-8000-000000000704';

export function semanticPersonaRoleProjection(
  persona: HarnessPersona,
): { role: string; user_id: string }[] {
  return HARNESS_PERSONAS[persona].expectedRoles.map((role) => ({
    role,
    user_id: SEMANTIC_HARNESS_USER_ID,
  }));
}

export const CONTROLLED_REQUEST_PHASES = [
  'registered',
  'request_started',
  'response_held',
  'released',
  'settled',
] as const;

export type ControlledRequestPhase = (typeof CONTROLLED_REQUEST_PHASES)[number];

export function createControlledResponseGate() {
  let release!: () => void;
  let markStarted!: () => void;
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  const started = new Promise<void>((resolve) => {
    markStarted = resolve;
  });
  let phase: ControlledRequestPhase = 'registered';

  return {
    get phase() {
      return phase;
    },
    markStarted() {
      phase = 'request_started';
      markStarted();
      phase = 'response_held';
    },
    release() {
      phase = 'released';
      release();
    },
    released,
    settle() {
      phase = 'settled';
    },
    started,
  };
}
