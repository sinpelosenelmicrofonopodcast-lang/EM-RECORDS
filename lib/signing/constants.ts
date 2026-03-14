export const SIGNING_PIPELINE_STAGES = [
  "lead_received",
  "internal_review",
  "offer_sent",
  "artist_viewed_offer",
  "artist_signed",
  "label_counter_signed",
  "fully_executed",
  "archived",
  "declined",
  "expired"
] as const;

export const SIGNING_CONTRACT_STATUSES = [
  "draft",
  "offer_sent",
  "artist_viewed_offer",
  "artist_signed",
  "label_counter_signed",
  "fully_executed",
  "archived",
  "declined",
  "expired",
  "revoked"
] as const;

export const SIGNING_OFFER_STATUSES = ["draft", "sent", "viewed", "accepted", "declined", "expired", "revoked"] as const;

export const SIGNING_PRO_AFFILIATIONS = ["BMI", "ASCAP", "SESAC", "none"] as const;

export const ONBOARDING_TASK_BLUEPRINT = [
  { key: "complete_profile", title: "Complete profile" },
  { key: "upload_id", title: "Upload ID" },
  { key: "tax_form_placeholder", title: "Tax form upload placeholder" },
  { key: "sign_agreement", title: "Sign agreement" },
  { key: "payment_details_placeholder", title: "Add payment details placeholder" },
  { key: "provide_social_handles", title: "Provide social handles" },
  { key: "press_photos_placeholder", title: "Submit press photos placeholder" }
] as const;

export const EM_RECORDS_DEFAULT_LEGAL_ENTITY = "EM Records LLC";
