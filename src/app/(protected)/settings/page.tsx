import { ClassificationRulesPanel } from "@/components/classification-rules-panel";
import { listClassificationRules } from "@/lib/services/settings";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const rules = await listClassificationRules();

  return <ClassificationRulesPanel rules={rules} />;
}
