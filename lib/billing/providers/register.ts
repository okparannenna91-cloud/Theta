import { providerRegistry } from "./registry";
import { PaystackProvider } from "./paystack-provider";
import { IvnoProvider } from "./ivno-provider";
import { FlutterwaveProvider } from "./flutterwave-provider";

let registered = false;

export function registerProviders() {
  if (registered) return;
  registered = true;

  providerRegistry.register(new PaystackProvider());
  if (process.env.FLUTTERWAVE_SECRET_KEY) {
    providerRegistry.register(new FlutterwaveProvider());
  }
  providerRegistry.register(new IvnoProvider());
}
