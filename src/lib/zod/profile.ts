import { z } from "zod";

export const detailsSchema = z.object({
  preferred_name: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  experience: z.enum(["newbie","casual_fan","appellation_aware","case_pro","sommelier"]),
  time_zone: z.string().min(1, "Time zone is required"),
  people_count: z.coerce.number().int().min(1).default(1),
  share_cellar: z.boolean().default(false),
});

export const tasteSchema = z.object({
  styles: z.array(z.string()).default([]),
  colors: z.array(z.string()).default([]),
  grapes: z.array(z.string()).default([]),
  regions: z.array(z.string()).default([]),
  sweetness: z.number().min(0).max(10).default(2),
  acidity: z.number().min(0).max(10).default(6),
  tannin: z.number().min(0).max(10).default(4),
  body: z.number().min(0).max(10).default(5),
  oak: z.number().min(0).max(10).default(3),
  price_min: z.number().min(0).max(100000).default(10),
  price_max: z.number().min(0).max(100000).default(50),
  old_world_bias: z.number().min(-10).max(10).default(0),
  sparkling_preference: z.boolean().default(false),
  natural_pref: z.boolean().default(false),
  organic_pref: z.boolean().default(false),
  biodynamic_pref: z.boolean().default(false),
  notes: z.string().optional().nullable(),
});

export const profileSchema = z.object({
  full_name: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
});

export const combinedProfileSchema = z.object({
  profile: profileSchema,
  details: detailsSchema,
  taste: tasteSchema,
});

export type ProfileData = z.infer<typeof profileSchema>;
export type DetailsData = z.infer<typeof detailsSchema>;
export type TasteData = z.infer<typeof tasteSchema>;
export type CombinedProfileData = z.infer<typeof combinedProfileSchema>;
