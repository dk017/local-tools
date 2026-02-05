import { NextRequest, NextResponse } from "next/server";

/**
 * API Route: Fetch License Key
 *
 * Fetches the license key for a customer after checkout.
 * Uses checkout_id to find the associated customer and their license key.
 */

const POLAR_ACCESS_TOKEN = process.env.POLAR_ACCESS_TOKEN;
const POLAR_ORGANIZATION_ID = process.env.POLAR_ORGANIZATION_ID;

// Determine if we're in sandbox mode based on the access token or checkout URL
const isSandbox = process.env.NEXT_PUBLIC_POLAR_CHECKOUT_URL?.includes("sandbox") ||
                  process.env.POLAR_ACCESS_TOKEN?.startsWith("polar_oat_");

const POLAR_API_BASE = isSandbox
  ? "https://sandbox-api.polar.sh/v1"
  : "https://api.polar.sh/v1";

interface PolarCheckout {
  id: string;
  status: string;
  customer_id?: string;
  customer_email?: string;
  customer?: {
    id: string;
    email: string;
  };
  product_id?: string;
}

interface PolarLicenseKey {
  id: string;
  key: string;
  display_key: string;
  status: string;
  limit_activations: number | null;
  usage: number;
  limit_usage: number | null;
  expires_at: string | null;
  customer_id: string;
  benefit_id: string;
}

async function fetchCheckout(checkoutId: string): Promise<PolarCheckout | null> {
  try {
    const response = await fetch(`${POLAR_API_BASE}/checkouts/${checkoutId}`, {
      headers: {
        Authorization: `Bearer ${POLAR_ACCESS_TOKEN}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch checkout: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching checkout:", error);
    return null;
  }
}

async function fetchLicenseKeysForCustomer(customerId: string): Promise<PolarLicenseKey[]> {
  try {
    const url = new URL(`${POLAR_API_BASE}/license-keys/`);
    url.searchParams.set("organization_id", POLAR_ORGANIZATION_ID!);
    url.searchParams.set("customer_id", customerId);

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${POLAR_ACCESS_TOKEN}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch license keys: ${response.status}`);
      return [];
    }

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error("Error fetching license keys:", error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const checkoutId = searchParams.get("checkout_id");

  if (!checkoutId) {
    return NextResponse.json(
      { error: "Missing checkout_id parameter" },
      { status: 400 }
    );
  }

  if (!POLAR_ACCESS_TOKEN || !POLAR_ORGANIZATION_ID) {
    console.error("Missing POLAR_ACCESS_TOKEN or POLAR_ORGANIZATION_ID");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  try {
    // Step 1: Fetch checkout to get customer ID
    const checkout = await fetchCheckout(checkoutId);

    if (!checkout) {
      return NextResponse.json(
        { error: "Checkout not found" },
        { status: 404 }
      );
    }

    if (checkout.status !== "succeeded" && checkout.status !== "confirmed") {
      return NextResponse.json(
        {
          error: "Checkout not completed",
          status: checkout.status
        },
        { status: 400 }
      );
    }

    const customerId = checkout.customer_id || checkout.customer?.id;

    if (!customerId) {
      return NextResponse.json(
        { error: "Customer not found in checkout" },
        { status: 404 }
      );
    }

    // Step 2: Fetch license keys for this customer
    const licenseKeys = await fetchLicenseKeysForCustomer(customerId);

    if (licenseKeys.length === 0) {
      return NextResponse.json(
        {
          error: "No license keys found",
          message: "License key may still be generating. Please try again in a few seconds.",
          customer_id: customerId
        },
        { status: 404 }
      );
    }

    // Return the most recent license key
    const latestKey = licenseKeys.sort((a, b) =>
      new Date(b.expires_at || 0).getTime() - new Date(a.expires_at || 0).getTime()
    )[0];

    return NextResponse.json({
      success: true,
      license_key: latestKey.key,
      display_key: latestKey.display_key,
      status: latestKey.status,
      expires_at: latestKey.expires_at,
      activation_limit: latestKey.limit_activations,
      activations_used: latestKey.usage,
    });

  } catch (error) {
    console.error("Error in license fetch:", error);
    return NextResponse.json(
      { error: "Failed to fetch license key" },
      { status: 500 }
    );
  }
}
