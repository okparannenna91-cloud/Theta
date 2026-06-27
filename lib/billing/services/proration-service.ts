import { differenceInDays } from "date-fns";
import { BillingInterval, ProrationResult } from "../types";
import { getPlanPrice, Currency } from "@/lib/billing-plans";

class ProrationService {
  calculate(
    workspaceId: string,
    currentPlan: string,
    newPlan: string,
    currentInterval: BillingInterval,
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
    memberCount: number,
    currency: Currency = "USD"
  ): ProrationResult {
    const totalDays = differenceInDays(currentPeriodEnd, currentPeriodStart) || 1;
    const remainingDays = Math.max(1, differenceInDays(currentPeriodEnd, new Date()));
    const usedDays = totalDays - remainingDays;

    const oldPrice = getPlanPrice(currentPlan, currentInterval, memberCount, currency);
    const newPrice = getPlanPrice(newPlan, currentInterval, memberCount, currency);

    const oldDaily = oldPrice / totalDays;
    const newDaily = newPrice / totalDays;
    const alreadyUsedValue = oldDaily * usedDays;
    const remainingValueIfChanged = newDaily * remainingDays;

    let chargeAmount = 0;
    let creditAmount = 0;

    if (newPrice > oldPrice) {
      chargeAmount = Math.round((newDaily - oldDaily) * remainingDays);
    } else if (newPrice < oldPrice) {
      creditAmount = Math.round((oldDaily - newDaily) * remainingDays);
    }

    const direction = newPrice > oldPrice ? "upgrade" : "downgrade";

    return {
      direction,
      chargeAmount,
      creditAmount,
      remainingDays,
      usedDays,
      totalDays,
      prorationStart: new Date(),
      prorationEnd: currentPeriodEnd,
      oldDaily,
      newDaily,
    };
  }
}

export const prorationService = new ProrationService();
