/** Required intake fields that gate moving a profile to Phase 2. */
export const PHASE_2_REQUIRED_FIELDS = [
  { key: "business_name", label: "Business Name", kind: "text" as const },
  { key: "industry", label: "Industry", kind: "text" as const },
  { key: "business_description", label: "Business Description", kind: "text" as const },
  { key: "current_business_setup", label: "Current Business Setup", kind: "text" as const },
  { key: "main_products_services", label: "Services / Products Offered", kind: "text" as const },
  { key: "target_customer", label: "Target Customer", kind: "text" as const },
  { key: "brand_goals", label: "Brand Goal", kind: "array" as const },
  { key: "logo_direction", label: "Logo Direction", kind: "text" as const },
];

export type ProfileLike = Record<string, unknown> | null | undefined;

function hasValue(profile: ProfileLike, key: string, kind: "text" | "array"): boolean {
  if (!profile) return false;
  const v = (profile as Record<string, unknown>)[key];
  if (v == null) return false;
  if (kind === "array") return Array.isArray(v) && v.length > 0;
  return typeof v === "string" && v.trim().length > 0;
}

export function getMissingRequiredFields(profile: ProfileLike): string[] {
  return PHASE_2_REQUIRED_FIELDS.filter((f) => !hasValue(profile, f.key, f.kind)).map((f) => f.label);
}

export function isVectorConfirmed(profile: ProfileLike): boolean {
  return Boolean(profile && (profile as Record<string, unknown>).vector_output_confirmed === true);
}

export const MISSING_FIELDS_MESSAGE =
  "Complete the missing intake fields before moving this profile to Phase 2.";
export const VECTOR_REQUIRED_MESSAGE =
  "AB requires vector-ready logo planning before concept generation.";

/** Build a clean, agency-style brand profile summary from form data. */
export function buildBrandProfileSummary(p: ProfileLike): string {
  if (!p) return "";
  const r = p as Record<string, unknown>;
  const get = (k: string) => {
    const v = r[k];
    if (v == null) return "";
    if (Array.isArray(v)) return v.filter(Boolean).join(", ");
    return String(v).trim();
  };

  const business = get("business_name") || "Unnamed business";
  const client = get("client_name");
  const industry = get("industry");
  const stage = get("business_stage");
  const description = get("business_description");
  const audience = get("target_customer");
  const pain = get("customer_pain_points");
  const solves = get("problem_solved");
  const diff = get("business_differentiator");
  const goals = get("brand_goals");
  const personality = get("brand_personality");
  const feeling = get("brand_feeling");
  const words = get("words_to_describe_brand");
  const notWords = get("words_not_to_describe_brand");
  const vision = get("client_brand_vision");
  const inspiration = get("client_inspiration_notes");
  const must = get("client_must_have_elements");
  const avoid = get("avoidance_checklist");
  const colors = get("color_mood");
  const logoTypes = get("logo_type_preferences");
  const usage = get("digital_usage");
  const tagline = get("tagline_ideas");

  const parts: string[] = [];

  parts.push(`# Brand Profile — ${business}`);
  if (client || industry || stage) {
    const meta = [client && `Client: ${client}`, industry && `Industry: ${industry}`, stage && `Stage: ${stage}`]
      .filter(Boolean)
      .join(" · ");
    parts.push(meta);
  }

  if (description) parts.push(`## The Business\n${description}`);

  const audienceBlock = [
    audience && `Audience — ${audience}`,
    pain && `Pain points — ${pain}`,
    solves && `Problem solved — ${solves}`,
  ].filter(Boolean);
  if (audienceBlock.length) parts.push(`## Audience\n${audienceBlock.join("\n")}`);

  if (diff) parts.push(`## Differentiator\n${diff}`);

  const personalityBlock = [
    goals && `Goals — ${goals}`,
    personality && `Personality — ${personality}`,
    feeling && `Feeling — ${feeling}`,
    words && `Should feel — ${words}`,
    notWords && `Should NOT feel — ${notWords}`,
  ].filter(Boolean);
  if (personalityBlock.length) parts.push(`## Brand Voice\n${personalityBlock.join("\n")}`);

  const visionBlock = [
    vision && `Vision — ${vision}`,
    inspiration && `Inspiration — ${inspiration}`,
    must && `Must have — ${must}`,
    tagline && `Tagline ideas — ${tagline}`,
  ].filter(Boolean);
  if (visionBlock.length) parts.push(`## Creative Vision\n${visionBlock.join("\n")}`);

  const directionBlock = [
    logoTypes && `Logo types — ${logoTypes}`,
    colors && `Color direction — ${colors}`,
    usage && `Usage — ${usage}`,
    avoid && `Avoid — ${avoid}`,
  ].filter(Boolean);
  if (directionBlock.length) parts.push(`## Direction\n${directionBlock.join("\n")}`);

  return parts.join("\n\n");
}