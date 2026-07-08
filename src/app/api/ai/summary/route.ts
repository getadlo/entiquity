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
  const { entityId } = await req.json();
  const context = await buildOrgContext(session.membership.organization_id, { entityId });
  if (!context.trim()) return NextResponse.json({ error: "Entity not found" }, { status: 404 });

  try {
    const response = await anthropic().messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1200,
      system: AI_SYSTEM_RULES,
      messages: [{
        role: "user",
        content: `Today is ${new Date().toISOString().slice(0, 10)}. Write a plain-English summary of this entity covering: what the entity is, where it is formed, current status, key people, ownership structure, upcoming deadlines, missing information, and potential compliance risks. Use short headed sections. Flag anything uncertain or not on file.\n\nENTITY RECORDS:\n${context}`,
      }],
    });
    const summary = response.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n");
    return NextResponse.json({ summary });
  } catch {
    return NextResponse.json({ error: "Summary generation failed. Try again." }, { status: 500 });
  }
}
