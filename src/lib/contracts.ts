import { z } from "zod";
import {
  ACCOUNT_TYPES,
  CLASSIFICATIONS,
  REVIEW_STATUSES,
} from "@/lib/constants";

export const accountTypeSchema = z.enum(ACCOUNT_TYPES);
export const classificationSchema = z.enum(CLASSIFICATIONS);
export const reviewStatusSchema = z.enum(REVIEW_STATUSES);

export const transactionPatchSchema = z.union([
  z.object({
    classification: classificationSchema,
    exclusionReason: z.string().trim().max(240).nullable().optional(),
  }),
  z.object({
    classification: z.null(),
    reviewStatus: z.literal("UNREVIEWED"),
    exclusionReason: z.string().trim().max(240).nullable().optional(),
  }),
]);

export const bulkUpdateSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("classify"),
    ids: z.array(z.string().min(1)).min(1),
    classification: classificationSchema,
    exclusionReason: z.string().trim().max(240).nullable().optional(),
  }),
  z.object({
    action: z.literal("confirm-exclusion"),
    ids: z.array(z.string().min(1)).min(1),
    exclusionReason: z.string().trim().max(240).nullable().optional(),
  }),
  z.object({
    action: z.literal("reopen"),
    ids: z.array(z.string().min(1)).min(1),
  }),
]);

export const transactionFiltersSchema = z.object({
  search: z.string().trim().optional(),
  accountType: accountTypeSchema.optional(),
  sign: z.enum(["positive", "negative"]).optional(),
  classification: z.union([classificationSchema, z.literal("UNCLASSIFIED")]).optional(),
  reviewStatus: reviewStatusSchema.optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  suggestedOnly: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export type TransactionFiltersInput = z.infer<typeof transactionFiltersSchema>;
