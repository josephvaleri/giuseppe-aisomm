import { z } from "zod";

export const MappingTarget = z.enum([
  "wine_name","producer","vintage","quantity","where_stored","value",
  "currency","status","my_notes","my_rating","drink_from","drink_to",
  "typical_price","ratings_blob","color","alcohol","bottle_size","upc","barcode","url"
]);

export const ColumnMapping = z.record(MappingTarget, z.string().optional());

export const ParsedRow = z.object({
  __rowIndex: z.number(),
  wine_name: z.string().optional(),
  producer: z.string().optional(),
  vintage: z.coerce.number().int().min(1900).max(2100).optional(),
  quantity: z.coerce.number().int().min(0).default(1),
  where_stored: z.string().optional(),
  value: z.coerce.number().min(0).optional(),
  currency: z.string().optional(),
  status: z.string().optional(),
  my_notes: z.string().optional(),
  my_rating: z.union([z.coerce.number(), z.string()]).optional(),
  drink_from: z.string().optional(),
  drink_to: z.string().optional(),
  typical_price: z.coerce.number().min(0).optional(),
  ratings_blob: z.string().optional(),
  color: z.string().optional(),
  alcohol: z.union([z.coerce.number(), z.string()]).optional(),
  bottle_size: z.string().optional(),
  upc: z.string().optional(),
  barcode: z.string().optional(),
  url: z.string().optional(),
});

export const PreviewRow = ParsedRow.extend({
  match_status: z.enum(["EXACT_MATCH","LIKELY_MATCH","NO_MATCH"]),
  match_score: z.number().min(0).max(1).optional(),
  matched_wine_id: z.number().optional(),
  errors: z.array(z.string()).default([]),
});

export const PreviewResponse = z.object({
  stats: z.object({
    total: z.number(),
    valid: z.number(),
    errors: z.number(),
    exactMatches: z.number(),
    likelyMatches: z.number(),
    noMatches: z.number(),
  }),
  rows: z.array(PreviewRow),
});

export const CommitRequest = z.object({
  preview: PreviewResponse,
  acceptLikelyMatches: z.boolean().default(false),
});

export const CommitResponse = z.object({
  success: z.boolean(),
  summary: z.object({
    insertedWines: z.number(),
    upsertedItems: z.number(),
    totalQuantity: z.number(),
    skippedRows: z.number(),
    errorRows: z.number(),
  }),
  errorCsvUrl: z.string().optional(),
});

export type MappingTarget = z.infer<typeof MappingTarget>;
export type ColumnMapping = z.infer<typeof ColumnMapping>;
export type ParsedRow = z.infer<typeof ParsedRow>;
export type PreviewRow = z.infer<typeof PreviewRow>;
export type PreviewResponse = z.infer<typeof PreviewResponse>;
export type CommitRequest = z.infer<typeof CommitRequest>;
export type CommitResponse = z.infer<typeof CommitResponse>;
