import { z } from "zod";

export const TastingNoteSchema = z.object({
  tasting_date: z.string().optional(), // yyyy-mm-dd
  wine_name: z.string().min(1),
  producer: z.string().optional(),
  grapes: z.string().optional(),
  vintage: z.string().optional(),
  alcohol_pct: z.string().optional(),
  country_id: z.string().optional().nullable(),
  region_id: z.number().int().optional().nullable(),
  price: z.coerce.number().positive().optional(),
  my_notes: z.string().optional(),
  drink_starting: z.string().optional(),
  drink_by: z.string().optional(),
  bottle_size: z.string().optional(),
  is_bubbly: z.boolean().optional(),

  appearance_color: z.string().optional(),
  aroma_tags: z.array(z.string()).max(50).optional(),

  sweetness: z.number().int().min(1).max(10),
  acidity: z.number().int().min(1).max(10),
  body: z.number().int().min(1).max(10),
  tannin: z.number().int().min(1).max(10),
  oak: z.number().int().min(1).max(10),
  old_world_bias: z.number().int().min(1).max(10),
  finish_len: z.number().int().min(1).max(10),

  rating_bottles: z.coerce.number().min(0).max(5),

  add_to_cellar: z.boolean().optional().default(false),
  add_to_cellar_qty: z.coerce.number().int().min(1).max(999).optional(),
  location: z.string().optional()
});

export type TastingNoteInput = z.infer<typeof TastingNoteSchema>;

// Database types for Supabase
export interface TastingNote {
  note_id: number;
  user_id: string;
  created_at: string;
  updated_at: string;
  tasting_date: string;
  wine_name: string | null;
  producer: string | null;
  grapes: string | null;
  vintage: string | null;
  alcohol_pct: string | null;
  country_id: number | null;
  region_id: number | null;
  price: number | null;
  my_notes: string | null;
  drink_starting: string | null;
  drink_by: string | null;
  bottle_size: string | null;
  is_bubbly: boolean | null;
  appearance_color: string | null;
  aroma_tags: string[] | null;
  sweetness: number | null;
  acidity: number | null;
  body: number | null;
  tannin: number | null;
  oak: number | null;
  old_world_bias: number | null;
  finish_len: number | null;
  rating_bottles: number | null;
}

export interface AromaTerm {
  aroma_id: number;
  label: string;
}
