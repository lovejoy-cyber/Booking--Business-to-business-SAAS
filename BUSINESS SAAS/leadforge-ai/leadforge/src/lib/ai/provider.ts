/**
 * AIProvider abstraction. The rest of the app calls the functions in
 * `ai/functions.ts`, which call `AIProvider.complete()` — never a vendor SDK
 * directly. Swapping models or providers means writing one new class here.
 */

export interface AIProvider {
  /**
   * Sends a single-turn prompt and returns raw text. `system` sets behavior;
   * `prompt` is the task-specific content. Implementations should request
   * the lowest-temperature / most deterministic mode they support, since
   * every caller in this app wants consistent, auditable output, not
   * creative variation.
   */
  complete(params: { system: string; prompt: string; maxTokens?: number }): Promise<string>;
}

class AnthropicProvider implements AIProvider {
  private apiKey: string;
  private model: string;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        "ANTHROPIC_API_KEY is not set. AI features are disabled until it's configured — see .env.example."
      );
    }
    this.apiKey = apiKey;
    this.model = process.env.AI_MODEL || "claude-sonnet-4-6";
  }

  async complete({
    system,
    prompt,
    maxTokens = 1024
  }: {
    system: string;
    prompt: string;
    maxTokens?: number;
  }): Promise<string> {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: maxTokens,
        temperature: 0,
        system,
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`AI provider request failed (${res.status}): ${body.slice(0, 500)}`);
    }

    const data = await res.json();
    const textBlock = (data.content ?? []).find((b: any) => b.type === "text");
    if (!textBlock?.text) {
      throw new Error("AI provider returned no text content");
    }
    return textBlock.text as string;
  }
}

let cached: AIProvider | null = null;

/** Returns the configured AI provider. Swap this factory to change vendors app-wide. */
export function getAIProvider(): AIProvider {
  if (!cached) cached = new AnthropicProvider();
  return cached;
}
