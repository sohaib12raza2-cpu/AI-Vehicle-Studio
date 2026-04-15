import { callLongCat, LONGCAT_MODEL, LONGCAT_API_KEY, errorToResponse } from '../lib/longcat.js';

interface Req { method: string }
interface Res { status(code: number): Res; json(data: unknown): void }

export default async function handler(_req: Req, res: Res) {
    // Always allow GET for health-check usage
    if (!LONGCAT_API_KEY) {
        return res.status(200).json({
            success: false,
            latencyMs: 0,
            model: LONGCAT_MODEL,
            message: 'LONGCAT_API_KEY is not set in Vercel environment variables.',
        });
    }

    const start = Date.now();
    try {
        const reply = await callLongCat({
            messages: [
                { role: 'system', content: 'You are a helpful assistant. Reply with exactly one word.' },
                { role: 'user', content: 'Say "OK".' },
            ],
            temperature: 0,
            max_tokens: 10,
        });
        return res.status(200).json({
            success: true,
            latencyMs: Date.now() - start,
            model: LONGCAT_MODEL,
            message: `Connection successful. Model replied: "${reply.trim()}"`,
        });
    } catch (error) {
        const { body } = errorToResponse(error);
        return res.status(200).json({
            success: false,
            latencyMs: Date.now() - start,
            model: LONGCAT_MODEL,
            message: body.error,
        });
    }
}
