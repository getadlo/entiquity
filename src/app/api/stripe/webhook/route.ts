import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";

// Stripe -> database sync. Uses the service role because webhooks have no user
// session; scoped strictly to billing_subscriptions rows for the org in metadata.
export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const body = await req.text();
  let event;
  try {
    event = stripe().webhooks.constructEvent(body, sig!, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const upsert = async (orgId: string, patch: Record<string, any>) => {
    await db.from("billing_subscriptions").upsert(
      { organization_id: orgId, ...patch }, { onConflict: "organization_id" });
  };

  switch (event.type) {
    case "checkout.session.completed": {
      const s: any = event.data.object;
      if (s.metadata?.organization_id) {
        await upsert(s.metadata.organization_id, {
          plan_id: s.metadata.plan_id ?? "solo",
          stripe_customer_id: s.customer,
          stripe_subscription_id: s.subscription,
          status: "active",
        });
      }
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub: any = event.data.object;
      const orgId = sub.metadata?.organization_id;
      if (orgId) {
        await upsert(orgId, {
          status: sub.status === "canceled" ? "canceled" : sub.status,
          interval: sub.items?.data?.[0]?.price?.recurring?.interval ?? "month",
          current_period_end: sub.current_period_end
            ? new Date(sub.current_period_end * 1000).toISOString() : null,
        });
      }
      break;
    }
  }
  return NextResponse.json({ received: true });
}
