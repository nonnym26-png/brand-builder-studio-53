import { createServerFn } from "@tanstack/react-start";
import { generateAndSaveDesignDna } from "@/server/designDna.server";
import { getAdminClient } from "@/server/phase2.server";

/** Build (or rebuild) the Design DNA for a brand profile and persist it. */
export const generateDesignDna = createServerFn({ method: "POST" })
  .inputValidator((input: { brand_profile_id: string }) => {
    if (!input?.brand_profile_id) throw new Error("brand_profile_id is required");
    return input;
  })
  .handler(async ({ data }) => {
    return generateAndSaveDesignDna(data.brand_profile_id);
  });

/** Read the saved Design DNA for a brand profile (may be null). */
export const getDesignDna = createServerFn({ method: "POST" })
  .inputValidator((input: { brand_profile_id: string }) => {
    if (!input?.brand_profile_id) throw new Error("brand_profile_id is required");
    return input;
  })
  .handler(async ({ data }) => {
    const sb = getAdminClient();
    const { data: row, error } = await sb
      .from("brand_profiles")
      .select("design_dna, design_dna_generated_at")
      .eq("id", data.brand_profile_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return {
      design_dna: (row?.design_dna ?? null) as unknown,
      generated_at: (row?.design_dna_generated_at as string | null) ?? null,
    };
  });