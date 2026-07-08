import { getSession, createClient } from "@/lib/supabase/server";
import { PageHeader, Badge } from "@/components/ui";
import { fmtDate } from "@/lib/utils";
import BillingPlans from "@/components/billing-plans";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const session = await getSession();
  const orgId = session!.membership!.organization_id;
  const isAdmin = ["owner", "admin"].includes(session!.membership!.role);
  const supabase = createClient();

  const [{ data: sub }, { count: userCount }, { count: entityCount }] = await Promise.all([
    supabase.from("billing_subscriptions").select("*, plans(name, max_users, max_entities)").eq("organization_id", orgId).maybeSingle(),
    supabase.from("memberships").select("id", { count: "exact", head: true }).eq("organization_id", orgId).neq("role", "client"),
    supabase.from("entities").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
  ]);

  const plan: any = sub?.plans;
  const overUsers = plan?.max_users != null && (userCount ?? 0) > plan.max_users;
  const overEntities = plan?.max_entities != null && (entityCount ?? 0) > plan.max_entities;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Billing & plan" description="Manage your subscription, payment method, and invoices." />

      <div className="card mb-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold">{plan?.name ?? "No plan"} plan</h2>
              <Badge className={sub?.status === "active" ? "bg-accent-soft text-accent" : sub?.status === "past_due" ? "bg-red-50 text-danger" : "bg-amber-50 text-warn"}>
                {sub?.status ?? "none"}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-ink-soft">
              {sub?.status === "trialing" && sub.trial_ends_at && `Trial ends ${fmtDate(sub.trial_ends_at)}. `}
              {sub?.current_period_end && `Renews ${fmtDate(sub.current_period_end)}. `}
              Billed {sub?.interval === "year" ? "annually" : "monthly"}.
            </p>
          </div>
          <div className="text-right text-sm">
            <div className={overUsers ? "font-medium text-danger" : "text-ink-soft"}>
              {userCount ?? 0}{plan?.max_users != null ? ` / ${plan.max_users}` : ""} staff users
            </div>
            <div className={overEntities ? "font-medium text-danger" : "text-ink-soft"}>
              {entityCount ?? 0}{plan?.max_entities != null ? ` / ${plan.max_entities}` : ""} entities
            </div>
          </div>
        </div>
        {(overUsers || overEntities) && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-danger">
            You're over this plan's limits — upgrade below to keep adding {overUsers ? "users" : "entities"}.
          </p>
        )}
      </div>

      <BillingPlans currentPlan={sub?.plan_id ?? null} isAdmin={isAdmin} hasStripeCustomer={!!sub?.stripe_customer_id} />
    </div>
  );
}
