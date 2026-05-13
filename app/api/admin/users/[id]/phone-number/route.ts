import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Admin endpoint to update user phone number
 * Uses SERVICE ROLE KEY for admin access (no authentication required)
 */

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
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

    const { phone_number } = await req.json();

    if (!phone_number || typeof phone_number !== "string") {
      return NextResponse.json(
        { error: "Valid phone_number is required" },
        { status: 400 },
      );
    }

    const digitsOnly = phone_number.replace(/\D/g, "");
    if (digitsOnly.length < 10) {
      return NextResponse.json(
        { error: "Phone number must have at least 10 digits" },
        { status: 400 },
      );
    }

    if (digitsOnly.length > 15) {
      return NextResponse.json(
        { error: "Phone number is too long" },
        { status: 400 },
      );
    }

    const { data: user, error: fetchError } = await supabase
      .from("users")
      .select("id, username, phone_number")
      .eq("id", id)
      .single();

    if (fetchError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { error: updateError } = await supabase
      .from("users")
      .update({ phone_number })
      .eq("id", id);

    if (updateError) {
      console.error("Error updating phone number:", updateError);
      return NextResponse.json(
        {
          error: "Failed to update phone number",
          details: updateError.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Phone number updated successfully",
      user: {
        id,
        username: user.username,
        phone_number,
        updated_at: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Admin phone update error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 },
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
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

    const { data: user, error } = await supabase
      .from("users")
      .select("id, username, phone_number, created_at")
      .eq("id", id)
      .single();

    if (error || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error: any) {
    console.error("Admin get user error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
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

    const { error: deleteError } = await supabase
      .from("users")
      .update({ phone_number: null })
      .eq("id", id);

    if (deleteError) {
      return NextResponse.json(
        { error: "Failed to delete phone number" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Phone number deleted successfully",
    });
  } catch (error: any) {
    console.error("Admin delete phone error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
