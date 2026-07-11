import { providerRegistry } from "./registry";
import { PaystackProvider } from "./paystack-provider";
import { IvnoProvider } from "./ivno-provider";
import { FlutterwaveProvider } from "./flutterwave-provider";

export function registerProviders() {
  if (!providerRegistry.has("paystack")) {
    providerRegistry.register(new PaystackProvider());
  }
  if (process.env.FLUTTERWAVE_SECRET_KEY && !providerRegistry.has("flutterwave")) {
    providerRegistry.register(new FlutterwaveProvider());
  }
  if (!providerRegistry.has("ivno")) {
    providerRegistry.register(new IvnoProvider());
  }
}
