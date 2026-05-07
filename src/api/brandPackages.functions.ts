import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type PackageItem = { id: string; label: string; why?: string };
export type BrandPackage = {
  id: string;
  tier: "starter" | "local" | "launch" | "custom";
  name: string;
  bestFor: string;
  items: PackageItem[];
  rationale: string;
  priceRange?: string | null;
  inProposal?: boolean;
  customizedAt?: string;
};

export const saveBrandPackages = createServerFn({ method: "POST" })
  .inputValidator((d: { brandProfileId: string; packages: BrandPackage[] }) => d)
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from("brand_profiles")
      .update({ brand_packages: data.packages as unknown as never })
      .eq("id", data.brandProfileId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const loadBrandPackages = createServerFn({ method: "GET" })
  .inputValidator((d: { brandProfileId: string }) => d)
  .handler(async ({ data }) => {
    const { data: row, error } = await supabaseAdmin
      .from("brand_profiles")
      .select("brand_packages, business_name, industry, phase_2_concept_notes, ab_creative_direction_notes")
      .eq("id", data.brandProfileId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { packages: (row?.brand_packages as unknown as BrandPackage[] | null) || [], context: { business_name: row?.business_name || null, industry: row?.industry || null, direction: row?.phase_2_concept_notes || row?.ab_creative_direction_notes || null } };
  });