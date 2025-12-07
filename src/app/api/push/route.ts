import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/src/lib/get-session";
import { getHouseholdPushSubscriptions } from "@/src/lib/actions/reminders";
import { getActiveReminders, markReminderAsNotified } from "@/src/lib/actions/reminders";
import * as webpush from "web-push";

// VAPID keys - These should be in environment variables
// For production, generate your own VAPID keys using: npm install -g web-push && web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";

// Configure web-push with VAPID keys
// Note: The mailto: is just metadata required by VAPID spec, not used for sending emails
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_CONTACT_EMAIL || "mailto:app@openledger.local", // Just metadata, not for emails
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

// Send push notification to a subscription
async function sendPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string; data?: any }
) {
  if (!VAPID_PRIVATE_KEY || !VAPID_PUBLIC_KEY) {
    console.error("VAPID keys not configured");
    return false;
  }

  try {
    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
    };

    await webpush.sendNotification(
      pushSubscription,
      JSON.stringify({
        title: payload.title,
        body: payload.body,
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        data: payload.data,
      })
    );

    return true;
  } catch (error: any) {
    console.error("Error sending push notification:", error);
    // If subscription is invalid, we might want to delete it
    if (error.statusCode === 410 || error.statusCode === 404) {
      // Subscription expired or not found
      console.log("Subscription expired or not found, should be deleted");
    }
    return false;
  }
}

// POST /api/push/send - Send notifications for due reminders
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get active reminders that are due
    const reminders = await getActiveReminders();

    if (reminders.length === 0) {
      return NextResponse.json({ message: "No reminders due" });
    }

    // Get all household users' push subscriptions
    const subscriptions = await getHouseholdPushSubscriptions();

    if (subscriptions.length === 0) {
      return NextResponse.json({ message: "No push subscriptions found for household members" });
    }

    // Send notifications for each reminder
    const results = [];
    for (const reminder of reminders) {
      const payload = {
        title: "Payment Reminder",
        body: `${reminder.description} - ₹${reminder.amount}`,
        data: {
          reminderId: reminder.id,
          url: "/reminders",
        },
      };

      // Send to all household users' subscriptions
      let sentCount = 0;
      for (const subscription of subscriptions) {
        const sent = await sendPushNotification(subscription, payload);
        if (sent) {
          sentCount++;
        }
      }

      // Mark as notified if at least one notification was sent
      if (sentCount > 0) {
        await markReminderAsNotified(reminder.id);
        results.push({ reminderId: reminder.id, sent: true, sentCount });
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error("Error in push notification API:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

