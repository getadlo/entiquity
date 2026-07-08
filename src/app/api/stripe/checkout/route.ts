import { NextResponse } from "next/server";
import { getSession, createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { PLANS } from "@/lib/plans";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.membership || !["owner", "admin"].includes(session.membership.role)) {
    return NextResponse.json({ error: "Only owners and admins can manage billing." }, { status: 403 });
  }
  const { planId, interval } = await req.json();
  const plan = PLANS.find((p) => p.id === planId);
  const priceId = interval === "year" ? plan?.stripeAnnualPriceId : plan?.stripeMonthlyPriceId;
  if (!plan || !priceId) return NextResponse.json({ error: "Unknown plan" }, { status: 400 });
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Billing is not configured yet (missing STRIPE_SECRET_KEY)." }, { status: 503 });
  }

  const orgId = session.membership.organization_id;
  const supabase = createClient();
  const { data: sub } = await supabase.from("billing_subscriptions")
    .select("stripe_customer_id").eq("organization_id", orgId).maybeSingle();

  const checkout = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer: sub?.stripe_customer_id ?? undefined,
    customer_email: sub?.stripe_customer_id ? undefined : session.user.email!,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: { metadata: { organization_id: orgId, plan_id: planId } },
    metadata: { organization_id: orgId, plan_id: planId },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?success=1`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`,
  });
  return NextResponse.json({ url: checkout.url });
}
