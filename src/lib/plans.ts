export type PlanId = "solo" | "professional" | "firm" | "business" | "enterprise";

export const PLANS: {
  id: PlanId; name: string; monthly: number | null; annual: number | null;
  users: string; entities: string; blurb: string; features: string[];
  // Paste your real Stripe price IDs here after creating products in Stripe:
  stripeMonthlyPriceId?: string; stripeAnnualPriceId?: string;
}[] = [
  {
    id: "solo", name: "Solo", monthly: 199, annual: 1990,
    users: "1 user", entities: "Up to 100 entities",
    blurb: "For solo attorneys managing entities for a focused client base.",
    features: ["Entity database & profiles","Document storage & search","Compliance calendar & reminders","AI assistant & drafting","Audit log"],
    stripeMonthlyPriceId: "price_solo_monthly", stripeAnnualPriceId: "price_solo_annual",
  },
  {
    id: "professional", name: "Professional", monthly: 500, annual: 5000,
    users: "Up to 3 users", entities: "Up to 1,000 entities",
    blurb: "For boutique corporate practices with a growing entity book.",
    features: ["Everything in Solo","Team roles & permissions","Client portal","Ownership charts","Reports & CSV export"],
    stripeMonthlyPriceId: "price_professional_monthly", stripeAnnualPriceId: "price_professional_annual",
  },
  {
    id: "firm", name: "Firm", monthly: 1200, annual: 12000,
    users: "Up to 25 users", entities: "Unlimited entities",
    blurb: "For mid-sized firms running entity management as a practice group.",
    features: ["Everything in Professional","Unlimited entities","Advanced permissions","Bulk import","Priority support"],
    stripeMonthlyPriceId: "price_firm_monthly", stripeAnnualPriceId: "price_firm_annual",
  },
  {
    id: "business", name: "Business", monthly: 2000, annual: 20000,
    users: "Up to 50 users", entities: "Unlimited entities",
    blurb: "For in-house teams and corporate services providers at scale.",
    features: ["Everything in Firm","50 seats","API access","Data export","Dedicated onboarding"],
    stripeMonthlyPriceId: "price_business_monthly", stripeAnnualPriceId: "price_business_annual",
  },
  {
    id: "enterprise", name: "Enterprise", monthly: null, annual: null,
    users: "50+ users", entities: "Unlimited entities",
    blurb: "Custom onboarding, security review, migration, and support.",
    features: ["Custom seats & terms","SSO / security review","White-glove migration","Named support contact"],
  },
];

export const PLAN_LIMITS: Record<PlanId, { users: number | null; entities: number | null }> = {
  solo: { users: 1, entities: 100 },
  professional: { users: 3, entities: 1000 },
  firm: { users: 25, entities: null },
  business: { users: 50, entities: null },
  enterprise: { users: null, entities: null },
};
