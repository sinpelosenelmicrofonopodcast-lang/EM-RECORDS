type BaseEmailInput = {
  artistName: string;
  contractName?: string;
  actionUrl?: string;
  labelName?: string;
};

function shell(title: string, intro: string, bodyLines: string[], actionLabel?: string, actionUrl?: string): { subject: string; text: string; html: string } {
  const text = [intro, "", ...bodyLines, actionLabel && actionUrl ? `\n${actionLabel}: ${actionUrl}` : ""].filter(Boolean).join("\n");
  const html = `
    <div style="background:#0b0b0c;padding:28px;font-family:Arial,sans-serif;color:#f4f4f5;">
      <div style="max-width:620px;margin:0 auto;border:1px solid rgba(198,168,91,0.35);border-radius:14px;background:#101013;padding:28px;">
        <p style="margin:0;font-size:12px;letter-spacing:0.2em;text-transform:uppercase;color:#c6a85b;">EM Records</p>
        <h1 style="margin:12px 0 16px;font-size:24px;line-height:1.2;">${title}</h1>
        <p style="margin:0 0 14px;color:#d4d4d8;">${intro}</p>
        ${bodyLines.map((line) => `<p style="margin:0 0 10px;color:#d4d4d8;">${line}</p>`).join("")}
        ${
          actionLabel && actionUrl
            ? `<a href="${actionUrl}" style="display:inline-block;margin-top:16px;padding:10px 18px;border-radius:999px;background:#c6a85b;color:#000;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;font-weight:700;text-decoration:none;">${actionLabel}</a>`
            : ""
        }
      </div>
    </div>
  `;

  return {
    subject: title,
    text,
    html
  };
}

export function buildInviteToReviewOfferEmail(input: BaseEmailInput) {
  return shell(
    "EM Records Offer Ready",
    `Hi ${input.artistName}, your artist offer is ready to review.`,
    [
      `Agreement: ${input.contractName ?? "EM Records Artist Agreement"}`,
      "Use your secure invite link to review terms and continue the signing flow."
    ],
    "Review Offer",
    input.actionUrl
  );
}

export function buildSignAgreementEmail(input: BaseEmailInput) {
  return shell(
    "Please Sign Your Agreement",
    `Hi ${input.artistName}, your agreement is pending signature.`,
    [
      `Agreement: ${input.contractName ?? "EM Records Artist Agreement"}`,
      "Electronic signature consent is required before signing."
    ],
    "Open Signing Portal",
    input.actionUrl
  );
}

export function buildContractCompletedEmail(input: BaseEmailInput) {
  return shell(
    "Contract Fully Executed",
    `Hi ${input.artistName}, your agreement has been fully executed.`,
    [
      `Label: ${input.labelName ?? "EM Records LLC"}`,
      "You can now download the executed PDF and continue onboarding."
    ],
    "View Agreement",
    input.actionUrl
  );
}

export function buildWelcomeToEmRecordsEmail(input: BaseEmailInput) {
  return shell(
    "Welcome to EM Records",
    `Welcome ${input.artistName}, your onboarding portal is ready.`,
    [
      "Complete your onboarding checklist, upload documents, and keep your profile up to date.",
      "Your team will review each step and notify you in the portal."
    ],
    "Open Artist Portal",
    input.actionUrl
  );
}

export function buildOnboardingIncompleteReminderEmail(input: BaseEmailInput) {
  return shell(
    "Onboarding Reminder",
    `Hi ${input.artistName}, a few onboarding steps are still pending.`,
    [
      "Please complete your checklist items to activate full portal access and internal label handoff.",
      "If you need help, reply directly from your portal Messages section."
    ],
    "Open Checklist",
    input.actionUrl
  );
}
