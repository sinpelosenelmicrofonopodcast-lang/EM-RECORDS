type EmailPayload = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

type SendEmailResult = {
  delivered: boolean;
  provider: "resend" | "webhook" | "noop";
  error?: string;
};

export async function sendTransactionalEmail(payload: EmailPayload): Promise<SendEmailResult> {
  const fromEmail = process.env.SIGNING_EMAIL_FROM || process.env.EMAIL_FROM || "EM Records <no-reply@emrecords.local>";
  const resendKey = process.env.RESEND_API_KEY;
  const webhookUrl = process.env.SIGNING_EMAIL_WEBHOOK_URL;

  if (resendKey) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendKey}`
        },
        body: JSON.stringify({
          from: fromEmail,
          to: payload.to,
          subject: payload.subject,
          html: payload.html,
          text: payload.text
        }),
        cache: "no-store"
      });

      if (!response.ok) {
        return { delivered: false, provider: "resend", error: `Resend API returned ${response.status}` };
      }

      return { delivered: true, provider: "resend" };
    } catch (error) {
      return {
        delivered: false,
        provider: "resend",
        error: error instanceof Error ? error.message : "Resend send failed"
      };
    }
  }

  if (webhookUrl) {
    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: fromEmail,
          ...payload
        }),
        cache: "no-store"
      });

      if (!response.ok) {
        return { delivered: false, provider: "webhook", error: `Webhook returned ${response.status}` };
      }

      return { delivered: true, provider: "webhook" };
    } catch (error) {
      return {
        delivered: false,
        provider: "webhook",
        error: error instanceof Error ? error.message : "Webhook send failed"
      };
    }
  }

  return { delivered: false, provider: "noop" };
}

