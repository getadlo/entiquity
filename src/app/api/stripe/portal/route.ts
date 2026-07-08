import { NextResponse } from "next/server";
import { getSession, createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

export async function POST() {
  const session = await getSession();
  if (!session?.membership || !["owner", "admin"].includes(session.membership.role)) {
    return NextResponse.json({ error: "Only owners and admins can manage billing." }, { status: 403 });
  }
  const supabase = createClient();
  const { data: sub } = await supabase.from("billing_subscriptions")
    .select("stripe_customer_id").eq("organization_id", session.membership.organization_id).maybeSingle();
  if (!sub?.stripe_customer_id) {
    return NextResponse.json({ error: "No billing account yet — choose a plan first." }, { status: 400 });
  }
  const portal = await stripe().billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`,
  });
  return NextResponse.json({ url: portal.url });
}
