export type ProviderName = "OpenRouter" | "Cohere" | "OpenAI" | "Gemini";

export interface ProviderState {
  name: ProviderName;
  circuitState: "CLOSED" | "OPEN" | "HALF_OPEN";
  consecutiveFailures: number;
  lastFailureAt: number | null;
  openedAt: number | null;
  cooldownMs: number;
}

export class ProviderHealth {
  private providers: Map<ProviderName, ProviderState> = new Map();

  constructor() {
    for (const name of ["OpenRouter", "Cohere", "OpenAI", "Gemini"] as ProviderName[]) {
      this.providers.set(name, {
        name,
        circuitState: "CLOSED",
        consecutiveFailures: 0,
        lastFailureAt: null,
        openedAt: null,
        cooldownMs: 30000,
      });
    }
  }

  isAvailable(name: ProviderName): boolean {
    const state = this.providers.get(name);
    if (!state) return false;
    if (state.circuitState === "CLOSED") return true;
    if (state.circuitState === "HALF_OPEN") return true;
    if (state.openedAt && Date.now() - state.openedAt >= state.cooldownMs) {
      state.circuitState = "HALF_OPEN";
      return true;
    }
    return false;
  }

  recordSuccess(name: ProviderName): void {
    const state = this.providers.get(name);
    if (!state) return;
    state.consecutiveFailures = 0;
    state.circuitState = "CLOSED";
    state.lastFailureAt = null;
    state.openedAt = null;
  }

  recordFailure(name: ProviderName): void {
    const state = this.providers.get(name);
    if (!state) return;
    state.consecutiveFailures++;
    state.lastFailureAt = Date.now();
    if (state.consecutiveFailures >= 3) {
      state.circuitState = "OPEN";
      state.openedAt = Date.now();
      state.cooldownMs = Math.min(state.cooldownMs * 2, 300000);
    }
  }

  getAvailableProviders(): ProviderName[] {
    const available: ProviderName[] = [];
    for (const [name, state] of this.providers) {
      if (state.circuitState === "CLOSED" || state.circuitState === "HALF_OPEN") {
        available.push(name);
      } else if (state.openedAt && Date.now() - state.openedAt >= state.cooldownMs) {
        state.circuitState = "HALF_OPEN";
        available.push(name);
      }
    }
    return available;
  }

  isDegraded(): boolean {
    return this.getAvailableProviders().length <= 1;
  }

  getState(name: ProviderName): string {
    return this.providers.get(name)?.circuitState ?? "UNKNOWN";
  }
}
