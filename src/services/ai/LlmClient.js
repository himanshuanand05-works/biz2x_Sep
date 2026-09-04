import { env } from '../../config/env.js';
import { AppError, ValidationError } from '../../utils/errors.js';

const supportedImageMediaTypes = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

/** Calls the configured LLM wrapper without exposing provider credentials to clients. */
export class LlmClient {
  async query({ prompt, pdfBase64, imageBase64, imageMediaType, metadata } = {}) {
    this.validateRequest({ prompt, pdfBase64, imageBase64, imageMediaType, metadata });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), env.llmTimeoutMs);
    try {
      const response = await fetch(`${env.llmBaseUrl}/llm/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.llmApiKey}`
        },
        body: JSON.stringify({ prompt, pdfBase64, imageBase64, imageMediaType, metadata }),
        signal: controller.signal
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new AppError('LLM provider request failed', 'LLM_PROVIDER_ERROR', 502);
      }
      return this.extractText(body);
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (error.name === 'AbortError') {
        throw new AppError('LLM provider timed out', 'LLM_TIMEOUT', 504);
      }
      throw new AppError('LLM provider is unavailable', 'LLM_PROVIDER_ERROR', 502);
    } finally {
      clearTimeout(timeout);
    }
  }

  validateRequest({ prompt, pdfBase64, imageBase64, imageMediaType, metadata }) {
    if (!env.llmApiKey) throw new AppError('LLM provider is not configured', 'CONFIG_ERROR', 500);
    if (typeof prompt !== 'string' || !prompt.trim()) throw new ValidationError('prompt is required');
    if (pdfBase64 && imageBase64) throw new ValidationError('Provide either pdfBase64 or imageBase64, not both');
    if (imageBase64 && !supportedImageMediaTypes.has(imageMediaType)) {
      throw new ValidationError('imageMediaType must be a supported image MIME type');
    }
    for (const value of [pdfBase64, imageBase64]) {
      if (value != null && (typeof value !== 'string' || !/^[A-Za-z0-9+/]*={0,2}$/.test(value))) {
        throw new ValidationError('Document content must be raw base64');
      }
    }
    if (metadata != null && (typeof metadata !== 'object' || Array.isArray(metadata))) {
      throw new ValidationError('metadata must be an object');
    }
  }

  extractText(body) {
    if (typeof body === 'string') return { text: body, raw: body };
    const text = body?.text ?? body?.response ?? body?.answer ?? body?.output ?? body?.data;
    if (typeof text === 'string') return { text, raw: body };
    return { text: JSON.stringify(body ?? {}), raw: body };
  }
}

export const llmClient = new LlmClient();
