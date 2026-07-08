import { NextResponse } from "next/server";
import { getSession } from "@/lib/supabase/server";
import { anthropic, AI_SYSTEM_RULES, buildOrgContext } from "@/lib/ai";

export const maxDuration = 60;

const TYPE_GUIDES: Record<string, string> = {
  board_resolution: "Resolutions of the Board of Directors, with RESOLVED clauses and a general-authority clause.",
  written_consent: "Action by written consent in lieu of a meeting, reciting authority under governing law/agreement.",
  member_consent: "Written consent of the member(s) of an LLC.",
  shareholder_consent: "Written consent of the shareholder(s) of a corporation.",
  officer_appointment: "Appointment of an officer with title, effective date, and term language.",
  annual_meeting_minutes: "Minutes of the annual meeting: call to order, quorum, business conducted, adjournment.",
  banking_resolution: "Banking resolution: institution, account type, authorized signatories, certification block.",
  corporate_authorization: "General corporate authorization for a described transaction.",
  secretary_certificate: "Secretary's certificate certifying attached resolutions/incumbency, with signature block.",
};

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.membership || session.membership.role === "client") {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "AI is not configured yet. Add ANTHROPIC_API_KEY to your environment." }, { status: 503 });
  }
  const { entityId, type, title, details, effectiveDate } = await req.json();
  if (!entityId || !details) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const context = await buildOrgContext(session.membership.organization_id, { entityId });

  try {
    const response = await anthropic().messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 2000,
      system: `${AI_SYSTEM_RULES}\n\nYou are drafting a corporate governance document. Use the entity's actual name, jurisdiction, type, and people from the records provided. Format: ${TYPE_GUIDES[type] ?? "a formal corporate document"}. Use placeholders like [SIGNATURE] and [NAME] only where information is genuinely missing, and note what the reviewing attorney must confirm at the end under "Attorney review notes". Output plain formatted text (light Markdown headings allowed). Do not include any preamble before the document.`,
      messages: [{
        role: "user",
        content: `Draft this document.\nDocument type: ${type}\nWorking title: ${title || "(none)"}\nEffective date: ${effectiveDate}\nAction to approve: ${String(details).slice(0, 2000)}\n\nENTITY RECORDS:\n${context}`,
      }],
    });
    const draft = response.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n");
    return NextResponse.json({ draft, suggestedTitle: title || undefined });
  } catch {
    return NextResponse.json({ error: "Drafting failed. Try again." }, { status: 500 });
  }
}
