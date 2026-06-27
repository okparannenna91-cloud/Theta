import { BillingProvider } from "../billing-provider.interface";
import { Currency } from "../types";
import { ProviderNotFoundError } from "../errors";

class BillingProviderRegistry {
  private providers = new Map<string, BillingProvider>();

  register(provider: BillingProvider): void {
    this.providers.set(provider.id, provider);
  }

  get(id: string): BillingProvider {
    const provider = this.providers.get(id);
    if (!provider) throw new ProviderNotFoundError(id);
    return provider;
  }

  getAll(): BillingProvider[] {
    return Array.from(this.providers.values());
  }

  getForCurrency(currency: Currency): BillingProvider[] {
    return this.getAll().filter((p) => p.currencies.includes(currency));
  }

  has(id: string): boolean {
    return this.providers.has(id);
  }
}

export const providerRegistry = new BillingProviderRegistry();
