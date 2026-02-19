import { Checkout } from "checkout-sdk-node";

let checkoutClient: Checkout | null = null;

export function getCheckoutClient() {
  if (checkoutClient) {
    return checkoutClient;
  }

  const secretKey = process.env.CHECKOUT_SECRET_KEY;

  // Return null or throw a handled error closer to usage if env is missing
  // For stabilization, we log a warning and throw only when strictly necessary
  if (!secretKey) {
    console.warn("CHECKOUT_SECRET_KEY is not configured. Checkout operations will fail.");
    throw new Error("CHECKOUT_SECRET_KEY is missing");
  }

  const host =
    process.env.NODE_ENV === "production"
      ? "https://api.checkout.com"
      : "https://api.sandbox.checkout.com";

  try {
    checkoutClient = new Checkout(secretKey, { host, client: "theta" });
    return checkoutClient;
  } catch (error) {
    console.error("Failed to initialize Checkout SDK:", error);
    throw error;
  }
}


