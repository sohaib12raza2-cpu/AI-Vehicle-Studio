import { callLongCat, extractJSON, errorToResponse } from '../lib/longcat.js';

interface Req { method: string; body: { promptText: string; count?: number } }
interface Res { status(code: number): Res; json(data: unknown): void }

export default async function handler(req: Req, res: Res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
    }

    const { promptText, count = 2 } = req.body ?? {};
    if (!promptText) {
        return res.status(400).json({ error: 'Missing required field: promptText', code: 'MISSING_INPUT' });
    }

    try {
        const raw = await callLongCat({
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert AI image prompt engineer for cinematic automotive photography. Reply with ONLY a JSON array of strings, no markdown, no explanation.',
                },
                {
                    role: 'user',
                    content: `I have an existing image prompt. I need ${count} variations.\nKeep the core vehicle and subject the same but vary the camera angle, lighting, environment, or time of day.\n\nOriginal Prompt:\n"${promptText}"\n\nRespond with a JSON array of ${count} prompt strings.`,
                },
            ],
            temperature: 0.8,
            max_tokens: 1200,
        });

        const parsed = JSON.parse(extractJSON(raw));
        if (!Array.isArray(parsed)) throw new SyntaxError('Expected a JSON array of strings');

        return res.status(200).json(parsed as string[]);
    } catch (error) {
        const { status, body } = errorToResponse(error);
        return res.status(status).json(body);
    }
}
