import Stripe from "stripe";

export function stripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder", {
    apiVersion: "2024-12-18.acacia" as any,
  });
}
