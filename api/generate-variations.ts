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
                    content: 'You are an expert AI image prompt engineer for cinematic automotive photography. Output strictly valid JSON arrays of strings only. Do not wrap it in markdown. Do not include introductory text.',
                },
                {
                    role: 'user',
                    content: `I have an existing image prompt. I need ${count} variations.\nKeep the core vehicle and subject the same but vary the camera angle, lighting, environment, or time of day.\n\nOriginal Prompt:\n"${promptText}"\n\nRespond with a JSON array of ${count} prompt strings.`,
                },
            ],
            temperature: 0.8,
            max_tokens: 1200,
        });

        const cleaned = extractJSON(raw);
        let parsed;
        try {
            parsed = JSON.parse(cleaned);
        } catch (e) {
            try {
                const repaired = cleaned.replace(/,\s*([\]}])/g, '$1');
                parsed = JSON.parse(repaired);
            } catch {
                throw new SyntaxError(`${e instanceof Error ? e.message : 'Unknown JSON error'} | Raw Snippet: ${cleaned.slice(0, 100)}...`);
            }
        }

        if (!Array.isArray(parsed)) throw new SyntaxError('Response parsed successfully but is not a JSON array of strings.');

        return res.status(200).json(parsed as string[]);
    } catch (error) {
        const { status, body } = errorToResponse(error);
        return res.status(status).json(body);
    }
}
