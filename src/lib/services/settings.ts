import { asc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import type { Classification } from "@/lib/constants";
import { ensureDb } from "@/lib/db";
import { appSettings, classificationRules } from "@/lib/schema";

const DEFAULT_RULES: Array<{ id: string; pattern: string; classification: Classification }> = [
  { id: "rule-google", pattern: "Google", classification: "BUSINESS" },
  { id: "rule-myob", pattern: "MYOB", classification: "BUSINESS" },
  { id: "rule-wages", pattern: "*wages*", classification: "BUSINESS" },
  { id: "rule-ln-australa", pattern: "LN Australa", classification: "INCOME" },
];

const DEFAULT_RULES_SEEDED_KEY = "classification_rules_seeded";

async function ensureDefaultClassificationRulesSeeded() {
  const db = await ensureDb();

  await db.transaction(async (tx) => {
    const seededSetting = await tx.query.appSettings.findFirst({
      where: eq(appSettings.key, DEFAULT_RULES_SEEDED_KEY),
    });

    if (seededSetting) {
      return;
    }

    const createdAt = "2026-04-08T00:00:00.000Z";
    await tx.insert(classificationRules).values(
      DEFAULT_RULES.map((rule) => ({
        ...rule,
        createdAt,
      })),
    );

    await tx.insert(appSettings).values({
      key: DEFAULT_RULES_SEEDED_KEY,
      value: "true",
    });
  });
}

export async function listClassificationRules() {
  await ensureDefaultClassificationRulesSeeded();
  const db = await ensureDb();
  return db.query.classificationRules.findMany({
    orderBy: [asc(classificationRules.createdAt), asc(classificationRules.pattern)],
  });
}

export async function createClassificationRule(args: {
  pattern: string;
  classification: Classification;
}) {
  const db = await ensureDb();
  const rule = {
    id: randomUUID(),
    pattern: args.pattern.trim(),
    classification: args.classification,
    createdAt: new Date().toISOString(),
  };

  await db.insert(classificationRules).values(rule);
  return rule;
}

export async function deleteClassificationRule(id: string) {
  const db = await ensureDb();
  await db.delete(classificationRules).where(eq(classificationRules.id, id));
}
