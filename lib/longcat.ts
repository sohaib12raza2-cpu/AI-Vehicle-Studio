// Server-side LongCat API helper.
// This file runs ONLY in Vercel serverless functions (Node.js).
// It reads secrets from process.env — NEVER exposed to the browser.

export const LONGCAT_BASE_URL = process.env.LONGCAT_BASE_URL ?? 'https://api.longcat.chat/openai';
export const LONGCAT_API_KEY = process.env.LONGCAT_API_KEY ?? '';
export const LONGCAT_MODEL = process.env.LONGCAT_MODEL ?? 'LongCat-Flash-Chat';

const ENDPOINT = `${LONGCAT_BASE_URL}/v1/chat/completions`;

// ─── Error class ──────────────────────────────────────────────────────────────
export class LongCatError extends Error {
    constructor(
        message: string,
        public statusCode?: number,
        public errorCode?: string,
    ) {
        super(message);
        this.name = 'LongCatError';
    }
}

// ─── HTTP status → error ──────────────────────────────────────────────────────
export function mapHttpError(status: number, body: string): LongCatError {
    switch (status) {
        case 401: return new LongCatError(
            'Invalid LongCat API key. Check LONGCAT_API_KEY in your Vercel environment variables.', 401, 'INVALID_API_KEY');
        case 403: return new LongCatError(
            'Insufficient quota on your LongCat account. Please check your plan.', 403, 'QUOTA_EXCEEDED');
        case 429: return new LongCatError(
            'LongCat rate limit exceeded. Please wait a moment and try again.', 429, 'RATE_LIMIT');
        case 500: case 502: case 503:
            return new LongCatError(`LongCat server error (${status}). Please try again shortly.`, status, 'SERVER_ERROR');
        default:
            return new LongCatError(`LongCat API error (${status}): ${body.slice(0, 200)}`, status, 'UNKNOWN');
    }
}

// ─── Core request helper ──────────────────────────────────────────────────────
export interface LongCatMessage { role: 'system' | 'user' | 'assistant'; content: string }
export interface LongCatRequestOptions { messages: LongCatMessage[]; temperature?: number; max_tokens?: number }

export async function callLongCat(options: LongCatRequestOptions): Promise<string> {
    if (!LONGCAT_API_KEY) {
        throw new LongCatError(
            'LONGCAT_API_KEY is not set. Add it to your Vercel environment variables.',
            500, 'MISSING_API_KEY',
        );
    }

    let response: Response;
    try {
        response = await fetch(ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${LONGCAT_API_KEY}`,
            },
            body: JSON.stringify({
                model: LONGCAT_MODEL,
                messages: options.messages,
                stream: false,
                max_tokens: options.max_tokens ?? 2500,
                temperature: options.temperature ?? 0.7,
            }),
        });
    } catch {
        throw new LongCatError('Network error connecting to LongCat.', 502, 'NETWORK_ERROR');
    }

    if (!response.ok) {
        const bodyText = await response.text().catch(() => '');
        throw mapHttpError(response.status, bodyText);
    }

    const data = await response.json();
    const text: string | undefined = data?.choices?.[0]?.message?.content;

    console.log('[LongCat Response] Status:', response.status);
    console.log('[LongCat Response] Content Preview:', text?.slice(0, 150), '...');

    if (!text) throw new LongCatError('LongCat returned an empty response.', 502, 'EMPTY_RESPONSE');
    return text;
}

// ─── Utilities ────────────────────────────────────────────────────────────────
export function extractJSON(raw: string): string {
    let clean = raw.trim();
    // 1. Strip markdown fences if present
    const m = clean.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (m) {
        clean = m[1].trim();
    }

    // 2. Locate the first valid JSON array/object bounds to ignore conversational text
    const startIdx = clean.search(/[{[]/);
    if (startIdx >= 0) {
        clean = clean.substring(startIdx);
    }
    // Backward search for the closing boundary
    const endRe = /[\]}][^\]}]*$/;
    const endMatch = clean.match(endRe);
    if (endMatch && endMatch.index !== undefined) {
        clean = clean.substring(0, endMatch.index + 1);
    }

    return clean.trim();
}

/** Convert any error to a { status, body } pair suitable for res.json() */
export function errorToResponse(error: unknown): { status: number; body: { error: string; code: string } } {
    if (error instanceof LongCatError) {
        const status = error.statusCode ?? 500;
        // Server-config errors (missing/invalid key) → 500 to client; don't leak auth detail
        const clientStatus = status === 401 ? 500 : status;
        return { status: clientStatus, body: { error: error.message, code: error.errorCode ?? 'UNKNOWN' } };
    }
    if (error instanceof SyntaxError) {
        return { status: 502, body: { error: `LongCat returned non-JSON output. Parser error: ${error.message}`, code: 'PARSE_ERROR' } };
    }
    const msg = error instanceof Error ? error.message : 'Unexpected server error.';
    return { status: 500, body: { error: msg, code: 'SERVER_ERROR' } };
}
