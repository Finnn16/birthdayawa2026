import { normalizePublishAt, toDateOnly } from "@/lib/admin-publishing";
import { createServiceRoleClient } from "@/lib/server-supabase";

export function getQuestScheduledDate(value: unknown) {
  const publishAt = normalizePublishAt(value);
  return toDateOnly(publishAt);
}

export async function scheduleQuestAssignment(
  db: ReturnType<typeof createServiceRoleClient>,
  questId: string,
  activeDate: string,
  adminUserId: string,
) {
  const { data: assigner } = await db
    .from("users")
    .select("id")
    .eq("id", adminUserId)
    .maybeSingle();

  const assignmentPayload = {
    quest_id: questId,
    active_date: activeDate,
    is_active: true,
    assigned_by: assigner?.id ?? null,
  };

  const { data: existing, error: existingError } = await db
    .from("daily_quest_assignments")
    .select("id")
    .eq("quest_id", questId)
    .eq("active_date", activeDate)
    .maybeSingle();

  if (existingError) {
    return { data: null, error: existingError };
  }

  if (existing) {
    return db
      .from("daily_quest_assignments")
      .update({
        is_active: true,
        assigned_by: assignmentPayload.assigned_by,
      })
      .eq("id", existing.id)
      .select()
      .single();
  }

  return db
    .from("daily_quest_assignments")
    .insert(assignmentPayload)
    .select()
    .single();
}
