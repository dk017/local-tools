import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

/**
 * LemonSqueezy Webhook Handler
 *
 * Handles subscription events from LemonSqueezy:
 * - subscription_created
 * - subscription_updated
 * - subscription_cancelled
 * - subscription_payment_success
 * - subscription_payment_failed
 * - subscription_expired
 *
 * Webhook URL: https://yourdomain.com/api/webhooks/lemonsqueezy
 * Configure this in LemonSqueezy Dashboard → Settings → Webhooks
 */

const LEMONSQUEEZY_WEBHOOK_SECRET = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;

function verifyWebhookSignature(payload: string, signature: string): boolean {
  if (!LEMONSQUEEZY_WEBHOOK_SECRET) {
    console.error("LEMONSQUEEZY_WEBHOOK_SECRET not set");
    return false;
  }

  const hmac = crypto.createHmac("sha256", LEMONSQUEEZY_WEBHOOK_SECRET);
  const digest = hmac.update(payload).digest("hex");
  const expectedSignature = Buffer.from(digest, "hex").toString("base64");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

async function updateSubscriptionInBackend(
  subscriptionId: string,
  status: string,
  expiresAt?: string
) {
  // Call Python backend to update local license file
  // This is for desktop app users who have the app installed
  try {
    const backendUrl = process.env.BACKEND_URL || "http://127.0.0.1:8000";
    const response = await fetch(
      `${backendUrl}/api/license/update-subscription`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscription_id: subscriptionId,
          status,
          expires_at: expiresAt,
        }),
      }
    );

    if (!response.ok) {
      console.error(
        "Failed to update subscription in backend:",
        await response.text()
      );
    }
  } catch (error) {
    // Backend might not be running (web-only deployment)
    // This is okay, we'll still process the webhook
    console.warn("Backend update failed (may not be available):", error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get("x-signature");
    const rawBody = await request.text();

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }

    // Verify webhook signature
    if (!verifyWebhookSignature(rawBody, signature)) {
      console.error("Invalid webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const eventName = payload.meta?.event_name;
    const data = payload.data;

    console.log(`Received LemonSqueezy webhook: ${eventName}`, {
      subscription_id: data?.attributes?.id,
      status: data?.attributes?.status,
    });

    // Handle different event types
    switch (eventName) {
      case "subscription_created":
      case "subscription_updated":
      case "subscription_payment_success": {
        const subscription = data?.attributes;
        if (subscription) {
          const subscriptionId = subscription.id || data?.id;
          const status = subscription.status;
          const expiresAt = subscription.expires_at || subscription.renews_at;

          // Update subscription in backend (for desktop app)
          await updateSubscriptionInBackend(subscriptionId, status, expiresAt);

          // Here you could also:
          // - Update database if you have user accounts
          // - Send confirmation email
          // - Update user's subscription status in your system
        }
        break;
      }

      case "subscription_cancelled":
      case "subscription_expired":
      case "subscription_payment_failed": {
        const subscription = data?.attributes;
        if (subscription) {
          const subscriptionId = subscription.id || data?.id;
          const status = subscription.status || "cancelled";

          // Update subscription in backend
          await updateSubscriptionInBackend(subscriptionId, status);

          // Here you could:
          // - Revoke access
          // - Send cancellation email
          // - Update user's subscription status
        }
        break;
      }

      default:
        console.log(`Unhandled webhook event: ${eventName}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

// Handle GET requests (for webhook verification/testing)
export async function GET() {
  return NextResponse.json({
    message: "LemonSqueezy webhook endpoint is active",
    timestamp: new Date().toISOString(),
  });
}
