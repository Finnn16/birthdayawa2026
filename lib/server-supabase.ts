import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { getAdminEmails } from "@/lib/app-config";

export async function createRouteSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: object) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: object) {
          cookieStore.set({ name, value: "", ...options });
        },
      },
    },
  );
}

export function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not configured.");
  }

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
  }

  return createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}

export async function getAuthenticatedUser() {
  const supabase = await createRouteSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return { supabase, user, error };
}

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return getAdminEmails().includes(email.toLowerCase());
}

export async function requireAdmin() {
  const { supabase, user, error } = await getAuthenticatedUser();
  if (error || !user) {
    return { supabase, user: null, error: "Unauthorized" as const };
  }

  const metadataRole = String(user.user_metadata?.role ?? "").toLowerCase();
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const profileRole = String(profile?.role ?? "").toLowerCase();

  if (metadataRole === "admin" || profileRole === "admin" || isAdminEmail(user.email)) {
    return { supabase, user, error: null };
  }

  return { supabase, user, error: "Forbidden" as const };
}
