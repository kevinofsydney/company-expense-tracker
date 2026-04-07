import { z } from "zod";
import {
  ACCOUNT_TYPES,
  CLASSIFICATIONS,
  REVIEW_STATUSES,
} from "@/lib/constants";

function optionalField<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess(
    (value) => {
      if (typeof value === "string" && value.trim() === "") {
        return undefined;
      }

      return value;
    },
    schema.optional(),
  );
}

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
    ids: z.array(z.string().uuid()).min(1),
    classification: classificationSchema,
    exclusionReason: z.string().trim().max(240).nullable().optional(),
  }),
  z.object({
    action: z.literal("confirm-exclusion"),
    ids: z.array(z.string().uuid()).min(1),
    exclusionReason: z.string().trim().max(240).nullable().optional(),
  }),
  z.object({
    action: z.literal("reopen"),
    ids: z.array(z.string().uuid()).min(1),
  }),
]);

export const transactionFiltersSchema = z.object({
  search: optionalField(z.string().trim()),
  accountType: optionalField(accountTypeSchema),
  sign: optionalField(z.enum(["positive", "negative"])),
  classification: optionalField(
    z.union([classificationSchema, z.literal("UNCLASSIFIED")]),
  ),
  reviewStatus: optionalField(reviewStatusSchema),
  year: optionalField(z.string().regex(/^\d{4}$/)),
  month: optionalField(z.string().regex(/^(0[1-9]|1[0-2])$/)),
  startDate: optionalField(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  endDate: optionalField(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  suggestedOnly: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export type TransactionFiltersInput = z.infer<typeof transactionFiltersSchema>;
