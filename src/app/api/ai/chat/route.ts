import { NextResponse } from "next/server";
import { getSession } from "@/lib/supabase/server";
import { anthropic, AI_SYSTEM_RULES, buildOrgContext } from "@/lib/ai";

export const maxDuration = 60;

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.membership || session.membership.role === "client") {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "AI is not configured yet. Add ANTHROPIC_API_KEY to your environment." }, { status: 503 });
  }
  const { messages } = await req.json();
  if (!Array.isArray(messages) || !messages.length) {
    return NextResponse.json({ error: "No message provided" }, { status: 400 });
  }

  const context = await buildOrgContext(session.membership.organization_id);
  const today = new Date().toISOString().slice(0, 10);

  try {
    const response = await anthropic().messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1500,
      system: `${AI_SYSTEM_RULES}\n\nToday's date is ${today}.\n\nORGANIZATION RECORDS (your only source of truth):\n${context || "(no records yet — tell the user to add entities first)"}`,
      messages: messages.map((m: any) => ({ role: m.role, content: String(m.content).slice(0, 8000) })),
    });
    const reply = response.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n");
    return NextResponse.json({ reply });
  } catch (e: any) {
    return NextResponse.json({ error: "The assistant could not complete that request. Try again." }, { status: 500 });
  }
}
