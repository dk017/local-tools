import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

/**
 * Polar.sh Webhook Handler
 *
 * Handles subscription/order events from Polar:
 * - checkout.created
 * - checkout.updated
 * - subscription.created
 * - subscription.updated
 * - subscription.canceled
 * - order.created
 *
 * Webhook URL: https://yourdomain.com/api/webhooks/polar
 * Configure this in Polar Dashboard → Settings → Webhooks
 */

const POLAR_WEBHOOK_SECRET = process.env.POLAR_WEBHOOK_SECRET;

function verifyWebhookSignature(payload: string, signature: string): boolean {
  if (!POLAR_WEBHOOK_SECRET) {
    console.error("POLAR_WEBHOOK_SECRET not set");
    return false;
  }

  const hmac = crypto.createHmac("sha256", POLAR_WEBHOOK_SECRET);
  const digest = hmac.update(payload).digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(digest)
    );
  } catch {
    return false;
  }
}

async function updateSubscriptionInBackend(
  subscriptionId: string,
  status: string,
  expiresAt?: string,
  licenseKey?: string
) {
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
          license_key: licenseKey,
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
    console.warn("Backend update failed (may not be available):", error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get("webhook-signature") || request.headers.get("x-polar-signature");
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
    const eventType = payload.type || payload.event;
    const data = payload.data;

    console.log(`Received Polar webhook: ${eventType}`, {
      id: data?.id,
      status: data?.status,
    });

    // Handle different event types
    switch (eventType) {
      case "checkout.created":
      case "checkout.updated": {
        // Checkout session created/updated
        console.log("Checkout event:", data?.id, data?.status);
        break;
      }

      case "order.created": {
        // One-time purchase completed
        const order = data;
        if (order) {
          console.log("Order created:", {
            id: order.id,
            amount: order.amount,
            currency: order.currency,
            customer_email: order.customer?.email,
          });

          // For one-time purchases, you might generate a license key here
          // or the license key might come from Polar's license key feature
        }
        break;
      }

      case "subscription.created":
      case "subscription.updated": {
        const subscription = data;
        if (subscription) {
          const subscriptionId = subscription.id;
          const status = subscription.status;
          const currentPeriodEnd = subscription.current_period_end;

          await updateSubscriptionInBackend(
            subscriptionId,
            status,
            currentPeriodEnd
          );

          console.log("Subscription updated:", {
            id: subscriptionId,
            status,
            ends_at: currentPeriodEnd,
          });
        }
        break;
      }

      case "subscription.canceled":
      case "subscription.revoked": {
        const subscription = data;
        if (subscription) {
          const subscriptionId = subscription.id;
          const status = subscription.status || "canceled";

          await updateSubscriptionInBackend(subscriptionId, status);

          console.log("Subscription canceled:", {
            id: subscriptionId,
            status,
          });
        }
        break;
      }

      case "benefit.granted": {
        // License key benefit granted
        const benefit = data;
        console.log("Benefit granted:", benefit);
        // If using Polar's license key feature, the key would be here
        break;
      }

      case "benefit.revoked": {
        // License key benefit revoked
        const benefit = data;
        console.log("Benefit revoked:", benefit);
        break;
      }

      default:
        console.log(`Unhandled webhook event: ${eventType}`);
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
    message: "Polar webhook endpoint is active",
    timestamp: new Date().toISOString(),
  });
}
