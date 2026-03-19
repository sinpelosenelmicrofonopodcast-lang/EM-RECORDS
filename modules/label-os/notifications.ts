export type NotificationPayload = {
  title: string;
  body: string;
  email?: string | null;
  phone?: string | null;
  externalUserId?: string | null;
};

export async function sendLabelNotification(payload: NotificationPayload) {
  const results = {
    email: "skipped",
    sms: "skipped",
    push: "skipped"
  } as Record<string, string>;

  if (payload.email && process.env.RESEND_API_KEY) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? process.env.SIGNING_EMAIL_FROM ?? "EM Records <ops@emrecordsmusic.com>",
        to: [payload.email],
        subject: payload.title,
        text: payload.body
      })
    }).catch(() => null);

    results.email = response?.ok ? "sent" : "failed";
  }

  if (payload.phone && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER) {
    const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64");
    const body = new URLSearchParams({
      To: payload.phone,
      From: process.env.TWILIO_FROM_NUMBER,
      Body: `${payload.title}\n\n${payload.body}`
    });
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`, {
      method: "POST",
      headers: {
        authorization: `Basic ${auth}`,
        "content-type": "application/x-www-form-urlencoded"
      },
      body
    }).catch(() => null);

    results.sms = response?.ok ? "sent" : "failed";
  }

  if (payload.externalUserId && process.env.ONESIGNAL_APP_ID && process.env.ONESIGNAL_API_KEY) {
    const response = await fetch("https://api.onesignal.com/notifications?c=push", {
      method: "POST",
      headers: {
        authorization: `Key ${process.env.ONESIGNAL_API_KEY}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        app_id: process.env.ONESIGNAL_APP_ID,
        include_external_user_ids: [payload.externalUserId],
        headings: { en: payload.title, es: payload.title },
        contents: { en: payload.body, es: payload.body }
      })
    }).catch(() => null);

    results.push = response?.ok ? "sent" : "failed";
  }

  return results;
}
