/**
 * Premium Image Generator
 * -----------------------
 * Calls the Lovable AI image gateway with a compiled prompt and uploads the
 * result into the `ab-designs` storage bucket. Returns a public URL plus the
 * model used. This is the MAIN visual concept renderer — not the SVG helper.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { CompiledPrompt, GeneratedImage } from "./types";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const PRIMARY_MODEL = "google/gemini-3-pro-image-preview";

export interface RenderOptions {
  prompt: CompiledPrompt;
  brandProfileId: string;
  modelOverride?: string;
}

async function callImageGateway(prompt: string, model: string): Promise<string> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("AI gateway not configured");
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      modalities: ["image", "text"],
    }),
  });
  if (!res.ok) {
    if (res.status === 429) throw new Error("AI rate limit reached. Try again shortly.");
    if (res.status === 402) throw new Error("AI credits exhausted. Add credits in Workspace → Usage.");
    const txt = await res.text().catch(() => "");
    throw new Error(`Image gateway error ${res.status} ${txt.slice(0, 200)}`);
  }
  const json = await res.json();
  const url = json?.choices?.[0]?.message?.images?.[0]?.image_url?.url as string | undefined;
  if (!url) throw new Error("AI returned no image");
  return url;
}

async function uploadDataUrl(
  dataUrl: string,
  brandProfileId: string,
): Promise<string> {
  const m = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!m) throw new Error("Bad data url returned by image model");
  const mime = m[1];
  const ext = mime.split("/")[1];
  const bytes = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0));
  const path = `${brandProfileId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabaseAdmin.storage
    .from("ab-designs")
    .upload(path, bytes, { contentType: mime, upsert: false });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  const { data } = supabaseAdmin.storage.from("ab-designs").getPublicUrl(path);
  return data.publicUrl;
}

export async function renderPremiumImage(opts: RenderOptions): Promise<GeneratedImage & { publicUrl: string }> {
  const model = opts.modelOverride || PRIMARY_MODEL;
  const dataUrl = await callImageGateway(opts.prompt.finalPrompt, model);
  const publicUrl = await uploadDataUrl(dataUrl, opts.brandProfileId);
  return { dataUrl, modelUsed: model, publicUrl };
}