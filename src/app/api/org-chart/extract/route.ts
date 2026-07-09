import { NextResponse } from "next/server";
import { getSession, createClient } from "@/lib/supabase/server";
import { anthropic } from "@/lib/ai";

export const maxDuration = 60;

const MAX_BYTES = 15 * 1024 * 1024;
const IMAGE_TYPES: Record<string, string> = {
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif",
};

const EXTRACT_PROMPT = `You are reading an organizational / ownership structure chart for a legal entity management system.

Extract every box, name, and connection you can see and return ONLY a JSON object — no prose, no markdown fences — with this exact shape:

{
  "nodes": [
    { "name": "Acme Holdings LLC", "kind": "entity", "entity_type": "llc", "jurisdiction": "Delaware" },
    { "name": "Jane Smith", "kind": "individual", "entity_type": null, "jurisdiction": null }
  ],
  "links": [
    { "owner": "Jane Smith", "owned": "Acme Holdings LLC", "percentage": 60, "share_class": null }
  ]
}

Rules:
- "kind" is one of: "entity" (companies, LLCs, corps, partnerships, funds), "individual" (people), "trust", "other".
- "entity_type" only for kind "entity", one of: llc, corporation, lp, llp, nonprofit, trust, partnership, foreign_entity, other. Infer from suffixes (LLC, Inc., Corp., L.P., LLP…). Use "other" if unclear.
- "jurisdiction" only if stated (e.g. "Delaware", "Cayman"). Otherwise null.
- "percentage" as a number if a % is shown on or near the connecting line, else null.
- A link means the OWNER holds an interest in the OWNED node. Arrows in org charts usually point from parent/owner down to the owned subsidiary.
- Include every node even if it has no connections. Do not invent names that are not in the source.
- If the file contains no organizational chart at all, return {"nodes":[],"links":[]}.`;

function stripFences(s: string) {
  return s.replace(/```json/gi, "").replace(/```/g, "").trim();
}

async function pptxToContent(buf: Buffer): Promise<any[]> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(buf);
  const content: any[] = [];

  // Slide text, in slide order
  const slideNames = Object.keys(zip.files)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => parseInt(a.match(/\d+/)![0]) - parseInt(b.match(/\d+/)![0]));
  const texts: string[] = [];
  for (const name of slideNames.slice(0, 20)) {
    const xml = await zip.files[name].async("string");
    const runs = Array.from(xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)).map((m) => m[1]).filter(Boolean);
    if (runs.length) texts.push(`Slide ${name.match(/\d+/)![0]}: ${runs.join(" | ")}`);
  }
  if (texts.length) content.push({ type: "text", text: "Text found on the slides:\n" + texts.join("\n") });

  // Embedded images (charts are often pasted as pictures)
  const media = Object.keys(zip.files).filter((n) => /^ppt\/media\/.+\.(png|jpe?g|gif|webp)$/i.test(n)).slice(0, 4);
  for (const name of media) {
    const data = await zip.files[name].async("base64");
    if (data.length > 5.5 * 1024 * 1024) continue; // skip very large images
    const ext = name.split(".").pop()!.toLowerCase();
    content.push({ type: "image", source: { type: "base64", media_type: IMAGE_TYPES[ext] ?? "image/png", data } });
  }
  return content;
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.membership || session.membership.role === "client") {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "AI is not configured yet. Add ANTHROPIC_API_KEY to your environment." }, { status: 503 });
  }

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "File is too large (max 15 MB)." }, { status: 400 });

  const buf = Buffer.from(await file.arrayBuffer());
  const ext = (file.name.split(".").pop() ?? "").toLowerCase();

  let content: any[];
  try {
    if (ext === "pdf") {
      content = [{ type: "document", source: { type: "base64", media_type: "application/pdf", data: buf.toString("base64") } }];
    } else if (IMAGE_TYPES[ext]) {
      content = [{ type: "image", source: { type: "base64", media_type: IMAGE_TYPES[ext], data: buf.toString("base64") } }];
    } else if (ext === "pptx") {
      content = await pptxToContent(buf);
      if (!content.length) return NextResponse.json({ error: "Could not read any text or images from that PowerPoint. Try exporting the slide as PDF or an image instead." }, { status: 422 });
    } else {
      return NextResponse.json({ error: "Unsupported file type. Upload a PDF, PNG, JPG, WebP, GIF, or PPTX — or export your chart to one of those." }, { status: 415 });
    }
  } catch {
    return NextResponse.json({ error: "Could not read that file. Try exporting it as a PDF or image." }, { status: 422 });
  }

  try {
    const response = await anthropic().messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 4000,
      messages: [{ role: "user", content: [...content, { type: "text", text: EXTRACT_PROMPT }] }],
    });
    const raw = response.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n");
    const parsed = JSON.parse(stripFences(raw));
    const nodes = (Array.isArray(parsed.nodes) ? parsed.nodes : [])
      .filter((n: any) => typeof n?.name === "string" && n.name.trim())
      .map((n: any) => ({
        name: String(n.name).trim().slice(0, 200),
        kind: ["entity","individual","trust","other"].includes(n.kind) ? n.kind : "entity",
        entity_type: n.entity_type ?? null,
        jurisdiction: n.jurisdiction ? String(n.jurisdiction).slice(0, 100) : null,
      }));
    const names = new Set(nodes.map((n: any) => n.name.toLowerCase()));
    const links = (Array.isArray(parsed.links) ? parsed.links : [])
      .filter((l: any) => l?.owner && l?.owned && names.has(String(l.owner).trim().toLowerCase()) && names.has(String(l.owned).trim().toLowerCase()))
      .map((l: any) => ({
        owner: String(l.owner).trim(),
        owned: String(l.owned).trim(),
        percentage: typeof l.percentage === "number" && l.percentage >= 0 && l.percentage <= 100 ? l.percentage : null,
        share_class: l.share_class ? String(l.share_class).slice(0, 50) : null,
      }));

    if (!nodes.length) {
      return NextResponse.json({ error: "No organizational chart was found in that file. Make sure the chart is visible on the page you uploaded." }, { status: 422 });
    }

    // Flag matches against entities already in the workspace
    const supabase = createClient();
    const { data: existing } = await supabase.from("entities")
      .select("id, legal_name").eq("organization_id", session.membership.organization_id);
    const byName = new Map((existing ?? []).map((e) => [e.legal_name.trim().toLowerCase(), e.id]));
    for (const n of nodes as any[]) n.existing_id = byName.get(n.name.toLowerCase()) ?? null;

    return NextResponse.json({ nodes, links });
  } catch (e: any) {
    return NextResponse.json({ error: "The AI could not extract a chart from that file. Try a clearer image or a PDF export." }, { status: 500 });
  }
}
