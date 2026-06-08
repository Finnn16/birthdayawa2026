import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import twilio from "twilio";

let twilioClient: ReturnType<typeof twilio> | null = null;

function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    return null;
  }

  if (!twilioClient) {
    twilioClient = twilio(accountSid, authToken);
  }

  return twilioClient;
}

const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || "";

function getWhatsAppFromAddress() {
  const raw = process.env.TWILIO_WHATSAPP_FROM || TWILIO_PHONE_NUMBER;
  if (!raw) return "";
  return raw.startsWith("whatsapp:") ? raw : `whatsapp:${raw}`;
}

interface UserWithEmail {
  id: string;
  username: string;
  phone_number: string | null;
  email: string;
}

export async function POST(req: NextRequest) {
  // Verify API key for security
  const authHeader = req.headers.get("authorization");
  const apiKey = process.env.NOTIFICATION_API_KEY;

  if (!apiKey || authHeader !== `Bearer ${apiKey}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const twilioClient = getTwilioClient();
    const fromAddress = getWhatsAppFromAddress();

    if (!twilioClient || !fromAddress) {
      return NextResponse.json(
        {
          error: "Twilio configuration is missing",
          details:
            "Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_FROM or TWILIO_PHONE_NUMBER.",
        },
        { status: 500 },
      );
    }

    const cookieStore = await cookies();

    // Create Supabase server client
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
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

    const today = new Date().toISOString().split("T")[0];

    // Get all users with their emails
    const {
      data: { users: authUsers },
      error: authError,
    } = await supabase.auth.admin.listUsers();

    if (authError || !authUsers) {
      return NextResponse.json(
        { error: "Failed to fetch users", details: authError?.message },
        { status: 500 },
      );
    }

    // Get users from public.users table with mood status
    const { data: publicUsers, error: usersError } = await supabase
      .from("users")
      .select("id, username, phone_number");

    if (usersError) {
      return NextResponse.json(
        { error: "Failed to fetch user data", details: usersError.message },
        { status: 500 },
      );
    }

    // Enrich public users with email from auth
    const enrichedUsers: UserWithEmail[] = (publicUsers || []).map(
      (user: any) => ({
        ...user,
        email: authUsers.find((au) => au.id === user.id)?.email || "",
      }),
    );

    // Check for moods today
    const { data: todaysMoods, error: moodsError } = await supabase
      .from("moods")
      .select("user_id")
      .eq("date", today);

    if (moodsError) {
      return NextResponse.json(
        { error: "Failed to fetch moods", details: moodsError.message },
        { status: 500 },
      );
    }

    const usersMoodToday = new Set((todaysMoods || []).map((m) => m.user_id));

    // Find users without mood today and have phone number
    const usersToNotify = enrichedUsers.filter(
      (user) => !usersMoodToday.has(user.id) && user.phone_number,
    );

    if (usersToNotify.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No users to notify",
        notificationsSent: 0,
      });
    }

    // Send WhatsApp messages and log
    const notificationResults = [];

    for (const user of usersToNotify) {
      const rawPhoneNumber = user.phone_number;

      try {
        if (!rawPhoneNumber) {
          throw new Error("Missing phone number");
        }

        // Format phone number to E.164 format if needed
        const phoneNumber = formatPhoneNumber(rawPhoneNumber);

        // Send WhatsApp message via Twilio
        const message = await twilioClient.messages.create({
          from: fromAddress,
          to: `whatsapp:${phoneNumber}`,
          body: `Halo ${user.username}! 👋\n\nUdah isi mood track hari ini? Gimana perasaan lo? Jangan lupa log mood lo di app ya. Ini penting untuk track progress lo!\n\nLet's go! 💪`,
        });

        // Log successful notification
        await supabase.from("notification_logs").insert({
          user_id: user.id,
          notification_type: "mood_reminder",
          phone_number: phoneNumber,
          status: "sent",
          twilio_sid: message.sid,
        });

        notificationResults.push({
          userId: user.id,
          username: user.username,
          phone: phoneNumber,
          status: "sent",
          messageId: message.sid,
        });
      } catch (error: any) {
        console.error(
          `Failed to send notification to ${user.username}:`,
          error,
        );

        // Log failed notification
        await supabase.from("notification_logs").insert({
          user_id: user.id,
          notification_type: "mood_reminder",
          phone_number: rawPhoneNumber,
          status: "failed",
          error_message: error.message,
        });

        notificationResults.push({
          userId: user.id,
          username: user.username,
          phone: rawPhoneNumber,
          status: "failed",
          error: error.message,
        });
      }
    }

    const successCount = notificationResults.filter(
      (r) => r.status === "sent",
    ).length;
    const failureCount = notificationResults.filter(
      (r) => r.status === "failed",
    ).length;

    return NextResponse.json({
      success: true,
      message: `Notifications processed`,
      notificationsSent: successCount,
      notificationsFailed: failureCount,
      details: notificationResults,
    });
  } catch (error: any) {
    console.error("Notification endpoint error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 },
    );
  }
}

// Helper function to format phone numbers to E.164 format
function formatPhoneNumber(phone: string): string {
  // Remove any non-digit characters
  const cleaned = phone.replace(/\D/g, "");

  // If starts with 62 (Indonesia), use as is
  if (cleaned.startsWith("62")) {
    return `+${cleaned}`;
  }

  // If starts with 0 (Indonesia local), replace with +62
  if (cleaned.startsWith("0")) {
    return `+62${cleaned.slice(1)}`;
  }

  // Otherwise assume it's already formatted or needs +
  if (!cleaned.startsWith("+")) {
    return `+${cleaned}`;
  }

  return cleaned;
}
