type PayPalLink = {
  href: string;
  rel: string;
  method?: string;
};

export type PayPalOrder = {
  id: string;
  status: string;
  links?: PayPalLink[];
  payer?: {
    email_address?: string;
  };
  payment_source?: {
    paypal?: {
      email_address?: string;
    };
  };
  purchase_units?: Array<{
    reference_id?: string;
    custom_id?: string;
    amount?: {
      currency_code?: string;
      value?: string;
    };
    payments?: {
      captures?: Array<{
        id: string;
        status: string;
        amount?: {
          currency_code?: string;
          value?: string;
        };
      }>;
    };
  }>;
};

type AccessTokenCache = {
  token: string;
  expiresAt: number;
};

let accessTokenCache: AccessTokenCache | null = null;

export function isPayPalConfigured() {
  return Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
}

export function getPayPalEnvironment() {
  return process.env.PAYPAL_ENV === "live" ? "live" : "sandbox";
}

export function getPayPalBaseUrl() {
  return getPayPalEnvironment() === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

function requirePayPalCredentials() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("PayPal is not configured.");
  }

  return { clientId, clientSecret };
}

async function getPayPalAccessToken() {
  if (accessTokenCache && accessTokenCache.expiresAt > Date.now() + 60_000) {
    return accessTokenCache.token;
  }

  const { clientId, clientSecret } = requirePayPalCredentials();
  const response = await fetch(`${getPayPalBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json"
    },
    body: "grant_type=client_credentials",
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`PayPal OAuth failed (${response.status}).`);
  }

  const data = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
  };

  if (!data.access_token) {
    throw new Error("PayPal OAuth did not return an access token.");
  }

  accessTokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + Math.max(Number(data.expires_in ?? 300) - 60, 60) * 1000
  };

  return data.access_token;
}

async function paypalRequest<T>(
  path: string,
  init: {
    method?: string;
    body?: unknown;
    requestId?: string;
  } = {}
): Promise<T> {
  const token = await getPayPalAccessToken();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
    "Content-Type": "application/json"
  };

  if (init.requestId) {
    headers["PayPal-Request-Id"] = init.requestId.slice(0, 38);
  }

  const response = await fetch(`${getPayPalBaseUrl()}${path}`, {
    method: init.method ?? "GET",
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store"
  });

  const text = await response.text();
  let payload: unknown = {};

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { raw: text };
    }
  }

  if (!response.ok) {
    const error = new Error(`PayPal API failed (${response.status}).`);
    (error as Error & { details?: unknown }).details = payload;
    throw error;
  }

  return payload as T;
}

function centsToPayPalValue(cents: number) {
  if (!Number.isInteger(cents) || cents < 0) {
    throw new Error("Invalid payment amount.");
  }

  return (cents / 100).toFixed(2);
}

export async function createPayPalOrder(input: {
  amountCents: number;
  currency?: string;
  description: string;
  referenceId: string;
  returnUrl: string;
  cancelUrl: string;
}) {
  const currency = String(input.currency ?? "USD").toUpperCase();

  return paypalRequest<PayPalOrder>("/v2/checkout/orders", {
    method: "POST",
    requestId: `create-${crypto.randomUUID()}`,
    body: {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: input.referenceId,
          custom_id: input.referenceId,
          description: input.description.slice(0, 127),
          amount: {
            currency_code: currency,
            value: centsToPayPalValue(input.amountCents)
          }
        }
      ],
      payment_source: {
        paypal: {
          experience_context: {
            payment_method_preference: "IMMEDIATE_PAYMENT_REQUIRED",
            landing_page: "LOGIN",
            shipping_preference: "NO_SHIPPING",
            user_action: "PAY_NOW",
            return_url: input.returnUrl,
            cancel_url: input.cancelUrl
          }
        }
      }
    }
  });
}

export async function capturePayPalOrder(orderId: string) {
  const safeOrderId = encodeURIComponent(orderId);

  return paypalRequest<PayPalOrder>(`/v2/checkout/orders/${safeOrderId}/capture`, {
    method: "POST",
    requestId: `capture-${orderId}`,
    body: {}
  });
}

export function getPayPalApprovalUrl(order: PayPalOrder) {
  return order.links?.find((link) => link.rel === "payer-action" || link.rel === "approve")?.href ?? null;
}

export function getPayPalCapture(order: PayPalOrder) {
  return order.purchase_units?.flatMap((unit) => unit.payments?.captures ?? [])[0] ?? null;
}

export function getPayPalBuyerEmail(order: PayPalOrder) {
  return order.payment_source?.paypal?.email_address ?? order.payer?.email_address ?? null;
}

export async function verifyPayPalWebhook(headers: Headers, webhookEvent: unknown) {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId || !isPayPalConfigured()) {
    return false;
  }

  const transmissionId = headers.get("paypal-transmission-id");
  const transmissionTime = headers.get("paypal-transmission-time");
  const certUrl = headers.get("paypal-cert-url");
  const authAlgo = headers.get("paypal-auth-algo");
  const transmissionSig = headers.get("paypal-transmission-sig");

  if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig) {
    return false;
  }

  const result = await paypalRequest<{ verification_status?: string }>(
    "/v1/notifications/verify-webhook-signature",
    {
      method: "POST",
      body: {
        auth_algo: authAlgo,
        cert_url: certUrl,
        transmission_id: transmissionId,
        transmission_sig: transmissionSig,
        transmission_time: transmissionTime,
        webhook_id: webhookId,
        webhook_event: webhookEvent
      }
    }
  );

  return result.verification_status === "SUCCESS";
}
