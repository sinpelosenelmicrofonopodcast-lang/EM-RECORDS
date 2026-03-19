type OpenAiMessage = {
  role: "system" | "user";
  content: string;
};

export type OpenAiJsonResult<T> = {
  ok: boolean;
  data: T | null;
  rawText: string;
  provider: "openai" | "fallback";
  error?: string;
};

function getOpenAiConfig() {
  return {
    apiKey: String(process.env.OPENAI_API_KEY ?? "").trim(),
    model: String(process.env.OPENAI_MODEL ?? "gpt-5").trim()
  };
}

function extractText(payload: any): string {
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  const parts = Array.isArray(payload?.output) ? payload.output : [];
  const text = parts
    .flatMap((item: any) => (Array.isArray(item?.content) ? item.content : []))
    .map((item: any) => (typeof item?.text === "string" ? item.text : ""))
    .join("\n")
    .trim();

  return text;
}

export async function generateOpenAiJson<T>(messages: OpenAiMessage[], fallback: T): Promise<OpenAiJsonResult<T>> {
  const config = getOpenAiConfig();
  if (!config.apiKey) {
    return {
      ok: false,
      data: fallback,
      rawText: "",
      provider: "fallback",
      error: "Missing OPENAI_API_KEY."
    };
  }

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        input: messages,
        text: {
          format: {
            type: "json_object"
          }
        }
      })
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      return {
        ok: false,
        data: fallback,
        rawText: "",
        provider: "fallback",
        error: String((payload as { error?: { message?: string } } | null)?.error?.message ?? `OpenAI request failed (${response.status}).`)
      };
    }

    const rawText = extractText(payload);
    if (!rawText) {
      return {
        ok: false,
        data: fallback,
        rawText: "",
        provider: "fallback",
        error: "OpenAI returned an empty response."
      };
    }

    const parsed = JSON.parse(rawText) as T;
    return {
      ok: true,
      data: parsed,
      rawText,
      provider: "openai"
    };
  } catch (error) {
    return {
      ok: false,
      data: fallback,
      rawText: "",
      provider: "fallback",
      error: String((error as Error).message ?? "OpenAI request failed.")
    };
  }
}
