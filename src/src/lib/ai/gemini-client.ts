import { GoogleGenAI } from "@google/genai";
import { logger } from "@/lib/logger";
import {
  AIGenerationError,
  AIUnavailableError,
  type AICompletionRequest,
  type AICompletionResult,
  type AIProvider,
} from "@/lib/ai/provider";

/**
 * Google Gemini implementation of AIProvider.
 *
 * Nothing above this file knows which provider is in use: services call
 * getAIProvider().complete() and receive the same AICompletionResult shape as
 * before, so caching, cost logging, aiVersion, retry, timeout and every API
 * response contract are untouched by the switch.
 *
 * Gemini errors are never surfaced to callers. They are logged here and
 * re-thrown as the provider-neutral AIUnavailableError / AIGenerationError the
 * routes already understand.
 */

const DEFAULT_MODEL = "gemini-2.5-flash-lite";

/**
 * Tried in order when the configured model reports NOT_FOUND.
 *
 * Google retires model aliases and restricts some of them to existing
 * projects, so a name that works today can start returning 404 for new users
 * without anything in this codebase changing. Rather than hardcoding one model
 * and breaking, the provider walks this chain and keeps working.
 */
const FALLBACK_MODELS = ["gemini-2.5-flash-lite", "gemini-2.0-flash"];

const REQUEST_TIMEOUT_MS = 30_000;
const RETRY_DELAY_MS = 1_000;
const MOCK_MODEL = "development-mock";

/**
 * The configured model first, then the fallbacks, with duplicates removed so
 * no model is tried twice. GEMINI_MODEL always wins as the first attempt.
 */
function modelChain(): string[] {
  const configured = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
  const chain = [configured, ...FALLBACK_MODELS];
  return chain.filter((model, index) => chain.indexOf(model) === index);
}

function hasApiKey(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

/**
 * Retried once, then given up on.
 *
 * The SDK surfaces transport and quota problems as thrown errors rather than
 * status codes, so this matches on the markers Google uses for the transient
 * cases. An invalid key or a malformed request fails identically on a second
 * attempt, so retrying those only delays the error the user is waiting on.
 */
/**
 * The model itself is unusable — retired, renamed, or restricted to existing
 * projects. Distinct from a transient fault: retrying the same model will
 * always fail, but a different model may well succeed, so this is the only
 * condition that advances the chain.
 */
function isModelUnavailable(error: unknown): boolean {
  const text = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  return /\b404\b|NOT_FOUND|no longer available|not found|is not supported/i.test(text);
}

function looksTransient(error: unknown): boolean {
  const text = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  return /\b(429|500|502|503|504)\b|RESOURCE_EXHAUSTED|UNAVAILABLE|DEADLINE_EXCEEDED|INTERNAL/i.test(text);
}

/** Small stable hash so mock content differs per prompt while staying deterministic. */
function stableTag(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0").slice(0, 6);
}

/**
 * Deterministic stand-in used when GEMINI_API_KEY is absent.
 *
 * Development must never be blocked by a missing key: the study flow stays
 * fully clickable, caching and status transitions exercise exactly as they do
 * in production, and nothing 503s or crashes. Output is deterministic so the
 * same question yields the same text every time, and each purpose satisfies
 * the contract its service expects — in particular translation must be valid
 * JSON with question and answer, or TranslationService would reject it.
 *
 * Marked with the model name "development-mock", which is stored in aiVersion,
 * so mock content is identifiable in the database and in analytics and can be
 * regenerated for real later.
 */
function mockCompletion(request: AICompletionRequest, startedAt: number): AICompletionResult {
  const tag = stableTag(`${request.purpose}:${request.user}`);
  let text: string;

  switch (request.purpose) {
    case "translation":
      text = JSON.stringify({
        question: `[development mode ${tag}] Translated question placeholder.`,
        answer: `[development mode ${tag}] Translated answer placeholder.`,
      });
      break;
    case "memoryTip":
      text =
        `[development mode ${tag}] Placeholder memory aid. ` +
        "Set GEMINI_API_KEY to generate real content.";
      break;
    default:
      text =
        `[development mode ${tag}] Placeholder explanation.\n\n` +
        "This text is generated locally because no GEMINI_API_KEY is configured, " +
        "so the study flow stays usable without calling the API.\n\n" +
        "- Caching, status transitions and analytics all behave exactly as in production\n" +
        "- Set GEMINI_API_KEY to replace this with a real explanation";
      break;
  }

  return {
    text,
    model: MOCK_MODEL,
    durationMs: Date.now() - startedAt,
    usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
  };
}

/** Rejects if the underlying call outruns the budget, without depending on SDK-specific cancellation. */
function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("DEADLINE_EXCEEDED: request timed out")), ms);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

export const geminiProvider: AIProvider = {
  name: "gemini",

  isConfigured() {
    return hasApiKey();
  },

  async complete(request: AICompletionRequest): Promise<AICompletionResult> {
    const startedAt = Date.now();

    // No key: serve a deterministic stand-in rather than failing. Production
    // is unaffected because production has a key.
    if (!hasApiKey()) {
      return mockCompletion(request, startedAt);
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const callModel = (model: string) =>
      ai.models.generateContent({
        model,
        contents: request.user,
        config: {
          systemInstruction: request.system,
          temperature: request.temperature ?? 0.4,
          maxOutputTokens: request.maxOutputTokens ?? 700,
        },
      });

    // One transient retry per model, unchanged from before. A model that is
    // simply gone is not transient, so it is never retried here — it advances
    // the chain instead.
    const attempt = async (model: string) => {
      try {
        return await withTimeout(callModel(model), REQUEST_TIMEOUT_MS);
      } catch (error) {
        if (!looksTransient(error) || isModelUnavailable(error)) throw error;
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        return await withTimeout(callModel(model), REQUEST_TIMEOUT_MS);
      }
    };

    const chain = modelChain();
    let response: Awaited<ReturnType<typeof callModel>> | undefined;
    let servedModel = chain[0] ?? DEFAULT_MODEL;

    for (let i = 0; i < chain.length; i += 1) {
      const model = chain[i]!;
      const isLast = i === chain.length - 1;
      try {
        response = await attempt(model);
        servedModel = model;
        break;
      } catch (error) {
        // Only a missing model advances the chain. Anything else — a bad key,
        // a malformed request — would fail identically on every model, so
        // walking the rest would just delay the error.
        if (isModelUnavailable(error) && !isLast) {
          logger.warn("ai.gemini", `Model ${model} unavailable, trying the next one`, error);
          continue;
        }
        // Logged here and deliberately not propagated: a Gemini error can
        // carry request details and must never reach the client.
        logger.error("ai.gemini", `Request failed for ${request.purpose} on ${model}`, error);
        throw new AIUnavailableError("Could not reach the AI service.");
      }
    }

    if (!response) {
      logger.error("ai.gemini", `Every model in the chain failed for ${request.purpose}`);
      throw new AIUnavailableError("Could not reach the AI service.");
    }

    const text = response.text?.trim();
    if (!text) {
      logger.warn("ai.gemini", `Empty response for ${request.purpose}`);
      throw new AIGenerationError("AI service returned empty content.");
    }

    const usage = response.usageMetadata;
    const promptTokens = usage?.promptTokenCount ?? 0;
    const completionTokens = usage?.candidatesTokenCount ?? 0;

    return {
      text,
      // The response names the model actually served where available; falling
      // back to whichever chain entry succeeded. Either way aiVersion records
      // what really produced the text, not what was merely requested.
      model: response.modelVersion ?? servedModel,
      durationMs: Date.now() - startedAt,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: usage?.totalTokenCount ?? promptTokens + completionTokens,
      },
    };
  },
};

export function getAIProvider(): AIProvider {
  return geminiProvider;
}
