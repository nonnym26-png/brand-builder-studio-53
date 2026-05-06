export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      brand_profiles: {
        Row: {
          ab_creative_direction_notes: string | null
          ab_professional_recommendation: string | null
          ab_recommendation_notes: string | null
          accent_color_name: string | null
          accent_hex: string | null
          accent_pantone: string | null
          avoidance_checklist: string[] | null
          brand_feeling: string | null
          brand_goals: string[] | null
          brand_personality: string[] | null
          brand_profile_summary: string | null
          branding_kit_needs: string[] | null
          branding_kit_notes: string | null
          business_description: string | null
          business_differentiator: string | null
          business_location_service_area: string | null
          business_name: string | null
          business_stage: string | null
          client_brand_vision: string | null
          client_emotional_goal: string | null
          client_inspiration_notes: string | null
          client_must_have_elements: string | null
          client_name: string | null
          client_nice_to_have_elements: string | null
          client_original_ideas: string | null
          color_mood: string[] | null
          color_notes: string | null
          colors_to_avoid: string | null
          competitors: string | null
          consultation_date: string | null
          consultation_notes_client_story: string | null
          created_at: string | null
          current_logo_status: string | null
          current_marketing_materials: string | null
          customer_long_term_vision: string | null
          customer_pain_points: string | null
          digital_usage: string[] | null
          digital_usage_notes: string | null
          email_address: string | null
          font_style_preferences: string[] | null
          fonts_to_avoid: string | null
          future_brand_vision: string | null
          id: string
          include_initials: string | null
          include_tagline: string | null
          industry: string | null
          industry_symbols_to_consider: string | null
          initials_abbreviation: string | null
          internal_ab_notes: string | null
          is_complete: boolean | null
          is_draft: boolean | null
          logo_direction_notes: string | null
          logo_type_preferences: string[] | null
          logo_version_needs: string[] | null
          logo_version_notes: string | null
          main_products_services: string | null
          mascot_symbol_ideas: string | null
          needs_black_white: string | null
          needs_circular_version: string | null
          needs_distance_readability: string | null
          needs_embroidery_friendly: string | null
          needs_favicon: string | null
          needs_horizontal_header: string | null
          needs_icon_only: string | null
          needs_one_color: string | null
          needs_simplified_print_version: string | null
          needs_small_large_format: string | null
          needs_small_size_readability: string | null
          needs_square_version: string | null
          needs_white_on_dark: string | null
          neutral_color_name: string | null
          neutral_hex: string | null
          neutral_pantone: string | null
          orientation_preferences: string[] | null
          other_avoidance_notes: string | null
          phase_2_ai_prompt: string | null
          phase_2_concept_notes: string | null
          phase_2_logo_concepts: Json | null
          phase_2_refinement_notes: string | null
          phone_number: string | null
          preferred_contact_method: string | null
          primary_color_name: string | null
          primary_hex: string | null
          primary_pantone: string | null
          print_production_notes: string | null
          print_usage: string[] | null
          priority_file_outputs: string | null
          priority_logo_versions: string | null
          problem_solved: string | null
          project_priority: string | null
          project_status: string | null
          ready_for_phase_2: boolean | null
          recommended_next_step: string | null
          required_file_formats: string[] | null
          secondary_color_name: string | null
          secondary_hex: string | null
          secondary_pantone: string | null
          selected_logo_concept: Json | null
          shape_preferences: string[] | null
          shapes_to_avoid: string | null
          styles_to_avoid: string | null
          symbols_to_avoid: string | null
          symbols_to_avoid_logo: string | null
          tagline_ideas: string | null
          target_customer: string | null
          updated_at: string | null
          vector_output_confirmed: boolean | null
          vector_preparation_notes: string | null
          vector_rules_checklist: string[] | null
          words_not_to_describe_brand: string | null
          words_to_describe_brand: string | null
          years_in_business: string | null
        }
        Insert: {
          ab_creative_direction_notes?: string | null
          ab_professional_recommendation?: string | null
          ab_recommendation_notes?: string | null
          accent_color_name?: string | null
          accent_hex?: string | null
          accent_pantone?: string | null
          avoidance_checklist?: string[] | null
          brand_feeling?: string | null
          brand_goals?: string[] | null
          brand_personality?: string[] | null
          brand_profile_summary?: string | null
          branding_kit_needs?: string[] | null
          branding_kit_notes?: string | null
          business_description?: string | null
          business_differentiator?: string | null
          business_location_service_area?: string | null
          business_name?: string | null
          business_stage?: string | null
          client_brand_vision?: string | null
          client_emotional_goal?: string | null
          client_inspiration_notes?: string | null
          client_must_have_elements?: string | null
          client_name?: string | null
          client_nice_to_have_elements?: string | null
          client_original_ideas?: string | null
          color_mood?: string[] | null
          color_notes?: string | null
          colors_to_avoid?: string | null
          competitors?: string | null
          consultation_date?: string | null
          consultation_notes_client_story?: string | null
          created_at?: string | null
          current_logo_status?: string | null
          current_marketing_materials?: string | null
          customer_long_term_vision?: string | null
          customer_pain_points?: string | null
          digital_usage?: string[] | null
          digital_usage_notes?: string | null
          email_address?: string | null
          font_style_preferences?: string[] | null
          fonts_to_avoid?: string | null
          future_brand_vision?: string | null
          id?: string
          include_initials?: string | null
          include_tagline?: string | null
          industry?: string | null
          industry_symbols_to_consider?: string | null
          initials_abbreviation?: string | null
          internal_ab_notes?: string | null
          is_complete?: boolean | null
          is_draft?: boolean | null
          logo_direction_notes?: string | null
          logo_type_preferences?: string[] | null
          logo_version_needs?: string[] | null
          logo_version_notes?: string | null
          main_products_services?: string | null
          mascot_symbol_ideas?: string | null
          needs_black_white?: string | null
          needs_circular_version?: string | null
          needs_distance_readability?: string | null
          needs_embroidery_friendly?: string | null
          needs_favicon?: string | null
          needs_horizontal_header?: string | null
          needs_icon_only?: string | null
          needs_one_color?: string | null
          needs_simplified_print_version?: string | null
          needs_small_large_format?: string | null
          needs_small_size_readability?: string | null
          needs_square_version?: string | null
          needs_white_on_dark?: string | null
          neutral_color_name?: string | null
          neutral_hex?: string | null
          neutral_pantone?: string | null
          orientation_preferences?: string[] | null
          other_avoidance_notes?: string | null
          phase_2_ai_prompt?: string | null
          phase_2_concept_notes?: string | null
          phase_2_logo_concepts?: Json | null
          phase_2_refinement_notes?: string | null
          phone_number?: string | null
          preferred_contact_method?: string | null
          primary_color_name?: string | null
          primary_hex?: string | null
          primary_pantone?: string | null
          print_production_notes?: string | null
          print_usage?: string[] | null
          priority_file_outputs?: string | null
          priority_logo_versions?: string | null
          problem_solved?: string | null
          project_priority?: string | null
          project_status?: string | null
          ready_for_phase_2?: boolean | null
          recommended_next_step?: string | null
          required_file_formats?: string[] | null
          secondary_color_name?: string | null
          secondary_hex?: string | null
          secondary_pantone?: string | null
          selected_logo_concept?: Json | null
          shape_preferences?: string[] | null
          shapes_to_avoid?: string | null
          styles_to_avoid?: string | null
          symbols_to_avoid?: string | null
          symbols_to_avoid_logo?: string | null
          tagline_ideas?: string | null
          target_customer?: string | null
          updated_at?: string | null
          vector_output_confirmed?: boolean | null
          vector_preparation_notes?: string | null
          vector_rules_checklist?: string[] | null
          words_not_to_describe_brand?: string | null
          words_to_describe_brand?: string | null
          years_in_business?: string | null
        }
        Update: {
          ab_creative_direction_notes?: string | null
          ab_professional_recommendation?: string | null
          ab_recommendation_notes?: string | null
          accent_color_name?: string | null
          accent_hex?: string | null
          accent_pantone?: string | null
          avoidance_checklist?: string[] | null
          brand_feeling?: string | null
          brand_goals?: string[] | null
          brand_personality?: string[] | null
          brand_profile_summary?: string | null
          branding_kit_needs?: string[] | null
          branding_kit_notes?: string | null
          business_description?: string | null
          business_differentiator?: string | null
          business_location_service_area?: string | null
          business_name?: string | null
          business_stage?: string | null
          client_brand_vision?: string | null
          client_emotional_goal?: string | null
          client_inspiration_notes?: string | null
          client_must_have_elements?: string | null
          client_name?: string | null
          client_nice_to_have_elements?: string | null
          client_original_ideas?: string | null
          color_mood?: string[] | null
          color_notes?: string | null
          colors_to_avoid?: string | null
          competitors?: string | null
          consultation_date?: string | null
          consultation_notes_client_story?: string | null
          created_at?: string | null
          current_logo_status?: string | null
          current_marketing_materials?: string | null
          customer_long_term_vision?: string | null
          customer_pain_points?: string | null
          digital_usage?: string[] | null
          digital_usage_notes?: string | null
          email_address?: string | null
          font_style_preferences?: string[] | null
          fonts_to_avoid?: string | null
          future_brand_vision?: string | null
          id?: string
          include_initials?: string | null
          include_tagline?: string | null
          industry?: string | null
          industry_symbols_to_consider?: string | null
          initials_abbreviation?: string | null
          internal_ab_notes?: string | null
          is_complete?: boolean | null
          is_draft?: boolean | null
          logo_direction_notes?: string | null
          logo_type_preferences?: string[] | null
          logo_version_needs?: string[] | null
          logo_version_notes?: string | null
          main_products_services?: string | null
          mascot_symbol_ideas?: string | null
          needs_black_white?: string | null
          needs_circular_version?: string | null
          needs_distance_readability?: string | null
          needs_embroidery_friendly?: string | null
          needs_favicon?: string | null
          needs_horizontal_header?: string | null
          needs_icon_only?: string | null
          needs_one_color?: string | null
          needs_simplified_print_version?: string | null
          needs_small_large_format?: string | null
          needs_small_size_readability?: string | null
          needs_square_version?: string | null
          needs_white_on_dark?: string | null
          neutral_color_name?: string | null
          neutral_hex?: string | null
          neutral_pantone?: string | null
          orientation_preferences?: string[] | null
          other_avoidance_notes?: string | null
          phase_2_ai_prompt?: string | null
          phase_2_concept_notes?: string | null
          phase_2_logo_concepts?: Json | null
          phase_2_refinement_notes?: string | null
          phone_number?: string | null
          preferred_contact_method?: string | null
          primary_color_name?: string | null
          primary_hex?: string | null
          primary_pantone?: string | null
          print_production_notes?: string | null
          print_usage?: string[] | null
          priority_file_outputs?: string | null
          priority_logo_versions?: string | null
          problem_solved?: string | null
          project_priority?: string | null
          project_status?: string | null
          ready_for_phase_2?: boolean | null
          recommended_next_step?: string | null
          required_file_formats?: string[] | null
          secondary_color_name?: string | null
          secondary_hex?: string | null
          secondary_pantone?: string | null
          selected_logo_concept?: Json | null
          shape_preferences?: string[] | null
          shapes_to_avoid?: string | null
          styles_to_avoid?: string | null
          symbols_to_avoid?: string | null
          symbols_to_avoid_logo?: string | null
          tagline_ideas?: string | null
          target_customer?: string | null
          updated_at?: string | null
          vector_output_confirmed?: boolean | null
          vector_preparation_notes?: string | null
          vector_rules_checklist?: string[] | null
          words_not_to_describe_brand?: string | null
          words_to_describe_brand?: string | null
          years_in_business?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
