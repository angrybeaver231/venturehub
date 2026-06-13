import OpenAI from "openai";

const IMAGE_MODEL = "gpt-image-1";

let _client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    });
  }
  return _client;
}

export interface ShowcaseCoverInput {
  name: string;
  shortDescription?: string | null;
  longDescription?: string | null;
  sector?: string | null;
}

export function isCoverGenerationAvailable(): boolean {
  return Boolean(process.env.AI_INTEGRATIONS_OPENAI_API_KEY);
}

function buildPrompt(input: ShowcaseCoverInput): string {
  const parts: string[] = [];
  parts.push(
    `Create a modern, premium cover banner illustration for a startup project card.`,
  );
  if (input.name) parts.push(`Project name: "${input.name}".`);
  if (input.sector) parts.push(`Sector / industry: ${input.sector}.`);
  if (input.shortDescription) parts.push(`Summary: ${input.shortDescription}.`);
  if (input.longDescription) {
    parts.push(`Details: ${input.longDescription.slice(0, 600)}.`);
  }
  parts.push(
    `Style: clean, abstract, professional tech illustration that visually represents the project's theme. ` +
      `Warm amber and gold accents on a tasteful, slightly dark balanced background. ` +
      `Flat modern vector aesthetic with soft gradients, suitable as a wide banner header on a project card. ` +
      `Absolutely no text, no words, no letters, no numbers, no logos, no watermarks.`,
  );
  return parts.join(" ");
}

/**
 * Generate an AI cover image for an event showcase startup based on its card
 * content. Returns the raw PNG bytes. Uses the OpenAI API (gpt-image-1),
 * which is callable at runtime in dev and production.
 */
export async function generateShowcaseCover(
  input: ShowcaseCoverInput,
): Promise<Buffer> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 90_000);
  try {
    const resp = await getClient().images.generate(
      {
        model: IMAGE_MODEL,
        prompt: buildPrompt(input),
        size: "1536x1024",
      },
      { signal: ctrl.signal },
    );
    const b64 = resp.data?.[0]?.b64_json;
    if (!b64) {
      throw new Error("Image generation returned no data");
    }
    return Buffer.from(b64, "base64");
  } finally {
    clearTimeout(t);
  }
}
