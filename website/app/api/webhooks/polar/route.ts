import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

/**
 * Polar.sh Webhook Handler
 *
 * Handles subscription/order events from Polar:
 * - checkout.created / checkout.updated
 * - subscription.created / subscription.updated / subscription.canceled
 * - order.created / order.paid
 * - benefit.granted / benefit.revoked (License Keys!)
 *
 * Webhook URL: https://yourdomain.com/api/webhooks/polar
 * Configure this in Polar Dashboard → Settings → Webhooks
 */

const POLAR_WEBHOOK_SECRET = process.env.POLAR_WEBHOOK_SECRET;
const POLAR_ACCESS_TOKEN = process.env.POLAR_ACCESS_TOKEN;
const POLAR_ORGANIZATION_ID = process.env.POLAR_ORGANIZATION_ID;

// Determine if we're in sandbox mode
const isSandbox =
  process.env.NEXT_PUBLIC_POLAR_CHECKOUT_URL?.includes("sandbox") ||
  process.env.POLAR_ACCESS_TOKEN?.startsWith("polar_oat_");

const POLAR_API_BASE = isSandbox
  ? "https://sandbox-api.polar.sh/v1"
  : "https://api.polar.sh/v1";

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

/**
 * Fetch the actual license key from Polar API when benefit is granted
 */
async function fetchLicenseKeyForCustomer(
  customerId: string,
  benefitId: string
): Promise<{ key: string; expires_at: string | null } | null> {
  if (!POLAR_ACCESS_TOKEN || !POLAR_ORGANIZATION_ID) {
    console.error("Missing Polar API credentials");
    return null;
  }

  try {
    const url = new URL(`${POLAR_API_BASE}/license-keys/`);
    url.searchParams.set("organization_id", POLAR_ORGANIZATION_ID);
    url.searchParams.set("customer_id", customerId);
    url.searchParams.set("benefit_id", benefitId);

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${POLAR_ACCESS_TOKEN}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch license keys: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const items = data.items || [];

    if (items.length > 0) {
      const licenseKey = items[0];
      return {
        key: licenseKey.key,
        expires_at: licenseKey.expires_at,
      };
    }

    return null;
  } catch (error) {
    console.error("Error fetching license key:", error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const signature =
      request.headers.get("webhook-signature") ||
      request.headers.get("x-polar-signature");
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

      case "order.created":
      case "order.paid": {
        // Order created or payment confirmed
        const order = data;
        if (order) {
          console.log("Order event:", {
            id: order.id,
            status: order.status,
            amount: order.amount || order.total_amount,
            currency: order.currency,
            customer_id: order.customer_id,
            customer_email: order.customer?.email,
            subscription_id: order.subscription_id,
          });
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
            customer_id: subscription.customer_id,
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
        // License key benefit granted to customer
        const benefitGrant = data;

        if (benefitGrant) {
          const customerId = benefitGrant.customer_id;
          const benefitId = benefitGrant.benefit_id;
          const benefitType = benefitGrant.benefit?.type;
          const subscriptionId = benefitGrant.subscription_id;

          console.log("Benefit granted:", {
            id: benefitGrant.id,
            customer_id: customerId,
            benefit_id: benefitId,
            benefit_type: benefitType,
            subscription_id: subscriptionId,
          });

          // If this is a license_keys benefit, fetch the actual key
          if (benefitType === "license_keys" && customerId && benefitId) {
            const licenseKeyData = await fetchLicenseKeyForCustomer(
              customerId,
              benefitId
            );

            if (licenseKeyData) {
              console.log("License key granted:", {
                customer_id: customerId,
                key_preview: `****-${licenseKeyData.key.slice(-6)}`,
                expires_at: licenseKeyData.expires_at,
              });

              // Update backend with the license key
              if (subscriptionId) {
                await updateSubscriptionInBackend(
                  subscriptionId,
                  "active",
                  licenseKeyData.expires_at || undefined,
                  licenseKeyData.key
                );
              }
            }
          }
        }
        break;
      }

      case "benefit.revoked": {
        // License key benefit revoked
        const benefitGrant = data;

        if (benefitGrant) {
          console.log("Benefit revoked:", {
            id: benefitGrant.id,
            customer_id: benefitGrant.customer_id,
            benefit_id: benefitGrant.benefit_id,
            subscription_id: benefitGrant.subscription_id,
          });

          // If subscription exists, mark it as inactive
          if (benefitGrant.subscription_id) {
            await updateSubscriptionInBackend(
              benefitGrant.subscription_id,
              "revoked"
            );
          }
        }
        break;
      }

      case "benefit.updated": {
        // Benefit was updated (e.g., activation count changed)
        console.log("Benefit updated:", data);
        break;
      }

      default:
        console.log(`Unhandled webhook event: ${eventType}`, data);
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
    sandbox: isSandbox,
  });
}
