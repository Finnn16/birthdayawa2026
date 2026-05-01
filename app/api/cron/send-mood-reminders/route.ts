import { NextRequest, NextResponse } from "next/server";

/**
 * Cron Route for Sending Daily Mood Reminders
 *
 * This route is designed to be called by a cron job service like:
 * - Vercel Cron Jobs (recommended)
 * - EasyCron
 * - AWS CloudWatch + Lambda
 * - Google Cloud Scheduler
 */

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    // Verify the request is from Vercel Cron
    const authHeader = req.headers.get("authorization");

    if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.warn("❌ Unauthorized cron request");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("📅 Starting daily mood reminder cron job...");

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL;

    if (!baseUrl) {
      throw new Error("NEXT_PUBLIC_APP_URL or VERCEL_URL not set");
    }

    const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
    const notificationUrl = `${protocol}://${baseUrl}/api/notifications/send-mood-reminders`;

    console.log(`📤 Calling notification endpoint: ${notificationUrl}`);

    const response = await fetch(notificationUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.NOTIFICATION_API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Notification API returned ${response.status}: ${error}`);
    }

    const data = await response.json();

    console.log("✅ Cron job completed successfully");
    console.log(
      `📊 Results: ${data.notificationsSent} sent, ${data.notificationsFailed} failed`,
    );

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      message: `Cron job completed. Notifications sent: ${data.notificationsSent}`,
      details: data,
    });
  } catch (error: any) {
    console.error("❌ Cron job failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 200 },
    );
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
