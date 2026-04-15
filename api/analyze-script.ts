import { callLongCat, extractJSON, errorToResponse } from '../lib/longcat.js';
import { mapSentencesToExcerpt } from '../src/services/scriptParser';
import { v4 as uuidv4 } from 'uuid';
import type { ScriptSettings, ScriptSentence } from '../src/types';

interface Req { method: string; body: { script: string; settings: ScriptSettings; sentences?: ScriptSentence[] } }
interface Res { status(code: number): Res; json(data: unknown): void }

export default async function handler(req: Req, res: Res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
    }

    const { script, settings, sentences = [] } = req.body ?? {};
    if (!script || !settings) {
        return res.status(400).json({ error: 'Missing required fields: script, settings', code: 'MISSING_INPUT' });
    }

    const sentenceList = sentences.length > 0
        ? `\n\nScript sentence list (for mapping — use these exact IDs in sentenceIds):\n${sentences.map(s => `${s.id}: ${s.text}`).join('\n')}`
        : '';

    const userPrompt =
        `Analyze the following script and break it down into logical visual segments.
The goal is to maximize visual engagement for a YouTube video about cars.

Script Title: ${settings.title}
Content Type: ${settings.contentType}
Tone: ${settings.tone}
Visual Density: ${settings.visualDensity} (low = fewer segments, extreme = many segments)

For each segment determine:
- excerpt: The exact excerpt from the script.
- visualIntent: What we are trying to show or make the viewer feel.
- recommendedShotType: e.g. hero reveal, front fascia detail, rear three-quarter angle, cockpit interior, dashboard close-up, wheel and brake detail, highway motion shot, night neon shot, luxury showroom shot, performance chase-style shot, EV charging visual, comparison split-frame, historical recreation.
- vehicleFocus: The specific car model, engine, driver, wheels, etc.
- locationEnvironment: e.g. wet neon city street, desert highway, luxury garage, track.
- emotionalIntensity: Integer 1-10.
- motionIntensity: e.g. static, slow pan, high-speed tracking, aggressive shake.
- estimatedImagesNeeded: Integer — estimated number of images needed.
- hookValue: "High", "Medium", or "Low".
- purposeInVideo: e.g. B-roll overlay, main talking point visual, transition, hook.
- sentenceIds: array of sentence IDs from the list below that this segment's excerpt covers (e.g. ["S01","S02"]).${sentenceList}

Script:
"""
${script}
"""

Respond with ONLY a JSON array with exactly these keys: excerpt, visualIntent, recommendedShotType, vehicleFocus, locationEnvironment, emotionalIntensity, motionIntensity, estimatedImagesNeeded, hookValue, purposeInVideo, sentenceIds.`;

    try {
        const raw = await callLongCat({
            messages: [
                { role: 'system', content: 'You are an expert automotive YouTube video director and visual planner. Reply with ONLY a JSON array, no markdown, no explanation.' },
                { role: 'user', content: userPrompt },
            ],
            temperature: 0.7,
            max_tokens: 3000,
        });

        const parsed = JSON.parse(extractJSON(raw));
        if (!Array.isArray(parsed)) throw new SyntaxError('Expected a JSON array');

        const segments = parsed.map((item: Record<string, unknown>, index: number) => {
            let sentenceIds: string[] = [];
            if (Array.isArray(item.sentenceIds) && item.sentenceIds.length > 0) {
                sentenceIds = (item.sentenceIds as string[]).filter(id => sentences.some(s => s.id === id));
            }
            if (sentenceIds.length === 0 && sentences.length > 0) {
                sentenceIds = mapSentencesToExcerpt(String(item.excerpt ?? ''), sentences);
            }
            return {
                id: uuidv4(),
                segmentNumber: index + 1,
                excerpt: String(item.excerpt ?? ''),
                visualIntent: String(item.visualIntent ?? ''),
                recommendedShotType: String(item.recommendedShotType ?? ''),
                vehicleFocus: String(item.vehicleFocus ?? ''),
                locationEnvironment: String(item.locationEnvironment ?? ''),
                emotionalIntensity: Number(item.emotionalIntensity) || 5,
                motionIntensity: String(item.motionIntensity ?? ''),
                estimatedImagesNeeded: Number(item.estimatedImagesNeeded) || 2,
                hookValue: String(item.hookValue ?? 'Medium'),
                purposeInVideo: String(item.purposeInVideo ?? ''),
                sentenceIds,
            };
        });

        return res.status(200).json(segments);
    } catch (error) {
        const { status, body } = errorToResponse(error);
        return res.status(status).json(body);
    }
}
