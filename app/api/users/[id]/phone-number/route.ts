import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set() {},
        remove() {},
      },
    },
  );

  // Auth check - user can only view their own data
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.id !== id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Get user's phone number
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("phone_number")
    .eq("id", user.id)
    .single();

  if (userError) {
    return NextResponse.json(
      { error: "Failed to fetch user data" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    phone_number: userData?.phone_number || null,
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set() {},
        remove() {},
      },
    },
  );

  // Auth check - user can only update their own data
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.id !== id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { phone_number } = await req.json();

  // Validate phone number format
  if (!phone_number || typeof phone_number !== "string") {
    return NextResponse.json(
      { error: "Valid phone_number is required" },
      { status: 400 },
    );
  }

  // Basic validation - should have at least 10 digits
  const digitsOnly = phone_number.replace(/\D/g, "");
  if (digitsOnly.length < 10) {
    return NextResponse.json(
      { error: "Phone number must have at least 10 digits" },
      { status: 400 },
    );
  }

  // Update phone number
  const { error: updateError } = await supabase
    .from("users")
    .update({ phone_number })
    .eq("id", user.id);

  if (updateError) {
    return NextResponse.json(
      { error: "Failed to update phone number" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    message: "Phone number updated successfully",
    phone_number,
  });
}
