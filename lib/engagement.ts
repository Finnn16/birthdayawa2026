import { getTargetUserEmail } from "@/lib/app-config";

export const REWARD_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "fulfilled",
  "cancelled",
] as const;

export const QUEST_TYPES = [
  "reflection",
  "multiple_choice",
  "checklist",
  "text_answer",
  "self_care",
] as const;

export const QUEST_DIFFICULTIES = ["easy", "medium", "hard"] as const;

export const STREAK_ITEM_TYPES = ["streak_shield", "forgiveness_ticket"] as const;

export type RewardStatus = (typeof REWARD_STATUSES)[number];

export function isRewardStatus(value: unknown): value is RewardStatus {
  return typeof value === "string" && REWARD_STATUSES.includes(value as RewardStatus);
}

export function normalizeJsonList(value: unknown): unknown {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    return value
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return value ?? null;
}

export function isAnswerCorrect(answer: unknown, correctAnswer?: string | null): boolean {
  if (!correctAnswer?.trim()) return true;
  if (typeof answer !== "string") return false;
  return answer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
}

export function getGardenItemTypeForMood(rating: number): string {
  if (rating <= 3) return "care_cloud";
  if (rating <= 6) return "tiny_seed";
  if (rating <= 8) return "soft_flower";
  return "glowing_flower";
}

export function getGardenItemTypeForQuest(difficulty?: string): string {
  if (difficulty === "hard") return "heart_tree";
  if (difficulty === "medium") return "bloom";
  return "sprout";
}

type SupabaseLike = {
  from: (table: string) => any;
  rpc?: (fn: string, args?: Record<string, unknown>) => any;
};

export async function getHeartBalance(db: SupabaseLike, userId: string): Promise<number> {
  const { data, error } = await db
    .from("heart_transactions")
    .select("amount")
    .eq("user_id", userId);

  if (error) return 0;
  return data?.reduce((sum: number, item: { amount: number }) => sum + item.amount, 0) ?? 0;
}

export async function getTargetUserId(db: SupabaseLike): Promise<string | null> {
  const targetEmail = getTargetUserEmail();

  if (db.rpc) {
    const { data } = await db.rpc("get_user_id_by_email", { target_email: targetEmail });
    if (data) return data;
  }

  const { data } = await db
    .from("users")
    .select("id")
    .eq("email", targetEmail)
    .maybeSingle();

  return data?.id ?? null;
}

export async function getExistingProfileId(db: SupabaseLike, userId: string): Promise<string | null> {
  const { data } = await db.from("users").select("id").eq("id", userId).maybeSingle();
  return data?.id ?? null;
}

export async function grantInventoryItem(
  db: SupabaseLike,
  userId: string,
  itemType: string,
  quantity: number,
  sourceType = "admin_grant",
) {
  const { data: existing } = await db
    .from("user_inventory")
    .select("id, quantity")
    .eq("user_id", userId)
    .eq("item_type", itemType)
    .maybeSingle();

  if (existing) {
    return db
      .from("user_inventory")
      .update({
        quantity: existing.quantity + quantity,
        source_type: sourceType,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select()
      .single();
  }

  return db
    .from("user_inventory")
    .insert({
      user_id: userId,
      item_type: itemType,
      quantity,
      source_type: sourceType,
    })
    .select()
    .single();
}
