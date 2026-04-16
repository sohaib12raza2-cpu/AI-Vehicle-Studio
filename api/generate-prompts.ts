import { callLongCat, extractJSON, errorToResponse } from '../lib/longcat.js';
import { v4 as uuidv4 } from 'uuid';
import type { ScriptSegment, ScriptSettings, ScriptSentence, UseType } from '../src/types.js';

const VALID_USE_TYPES: UseType[] = [
    'Hook', 'Main Visual', 'Support Visual', 'Detail Shot',
    'Comparison Visual', 'Transition Shot', 'Outro Visual',
];
const VALID_PLACEMENTS = [
    'Opening Line', 'Mid Sentence', 'End of Sentence',
    'Between Lines', 'Transition', 'Before Next Segment', 'Outro',
];

function validateUseType(val: unknown): UseType {
    return VALID_USE_TYPES.includes(val as UseType) ? (val as UseType) : 'Main Visual';
}
function validatePlacement(val: unknown): string {
    if (typeof val === 'string' && VALID_PLACEMENTS.includes(val)) return val;
    if (typeof val === 'string' && val.trim()) return val.trim();
    return 'Mid Sentence';
}
function validateSentenceIds(val: unknown, fallback: string[]): string[] {
    return Array.isArray(val) && val.length > 0 && typeof val[0] === 'string' ? val : fallback ?? [];
}

interface Req { method: string; body: { segment: ScriptSegment; settings: ScriptSettings; sentences?: ScriptSentence[] } }
interface Res { status(code: number): Res; json(data: unknown): void }

export default async function handler(req: Req, res: Res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' });
    }

    const { segment, settings, sentences = [] } = req.body ?? {};
    if (!segment || !settings) {
        return res.status(400).json({ error: 'Missing required fields: segment, settings', code: 'MISSING_INPUT' });
    }

    const linkedSentences = (segment.sentenceIds ?? [])
        .map(id => {
            const s = sentences.find(s => s.id === id);
            return s ? `${id}: "${s.text}"` : null;
        })
        .filter(Boolean)
        .join('\n');

    const sentenceContext = linkedSentences ? `\nLinked Script Sentences:\n${linkedSentences}` : '';

    const userPrompt =
        `Generate ${segment.estimatedImagesNeeded} highly detailed, cinematic image prompts for the following script segment.

Context:
Content Type: ${settings.contentType}
Tone: ${settings.tone}
Image Style: ${settings.imageStyle}
Aspect Ratio: ${settings.aspectRatio}${sentenceContext}

Segment Details:
Excerpt: "${segment.excerpt}"
Visual Intent: ${segment.visualIntent}
Recommended Shot Type: ${segment.recommendedShotType}
Vehicle Focus: ${segment.vehicleFocus}
Location/Environment: ${segment.locationEnvironment}
Emotional Intensity: ${segment.emotionalIntensity}/10
Motion Intensity: ${segment.motionIntensity}
Hook Value: ${segment.hookValue}
Purpose in Video: ${segment.purposeInVideo}

Rules for Prompts:
- Must be very detailed, cinematic, specific, and visually strong.
- Optimized for automotive visuals (cars, roads, interiors, exteriors, speed, drama, luxury, mechanical details).
- DO NOT use vague words like "a nice car" or "a luxury car".
- Include: main vehicle subject, camera angle, framing, environment, lighting, mood, motion implication, surface details.
- Ensure variety across the prompts (different angles, focal lengths, lighting).
- Use common shot patterns: hero reveal, front fascia detail, rear three-quarter angle, cockpit interior, dashboard close-up, wheel/brake detail, highway motion, night neon, luxury showroom, performance chase.

Example: "matte black European performance coupe speeding through a wet neon-lit city street at night, low front tracking angle, reflections on asphalt, cinematic contrast, aggressive headlights, motion blur on wheels, 8k resolution, shot on 35mm lens"

For each prompt also determine:
- useType: one of exactly: "Hook", "Main Visual", "Support Visual", "Detail Shot", "Comparison Visual", "Transition Shot", "Outro Visual"
- recommendedPlacement: one of exactly: "Opening Line", "Mid Sentence", "End of Sentence", "Between Lines", "Transition", "Before Next Segment", "Outro"
- sourceSentenceIds: array of sentence IDs from the linked sentences list above that this specific image relates to most closely${sentenceContext ? '' : ' (use empty array [] if no sentences provided)'}

Respond with ONLY a JSON array with keys: title, promptText, shotType, purposeInVideo, intensityScore, recommendedPlacement, useType, sourceSentenceIds.`;

    try {
        const raw = await callLongCat({
            messages: [
                { role: 'system', content: 'You are an expert AI image prompt engineer for cinematic automotive photography. Output strictly valid JSON arrays only. Do not wrap it in markdown. Do not include introductory text.' },
                { role: 'user', content: userPrompt },
            ],
            temperature: 0.8,
            max_tokens: 2500,
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

        if (!Array.isArray(parsed)) throw new SyntaxError('Response parsed successfully but is not a JSON array.');

        const prompts = parsed.map((item: Record<string, unknown>) => ({
            id: uuidv4(),
            segmentId: segment.id,
            title: String(item.title ?? 'Cinematic Shot'),
            promptText: String(item.promptText ?? ''),
            shotType: String(item.shotType ?? ''),
            purposeInVideo: String(item.purposeInVideo ?? segment.purposeInVideo),
            intensityScore: Number(item.intensityScore) || segment.emotionalIntensity,
            recommendedPlacement: validatePlacement(item.recommendedPlacement),
            selected: true,
            imagesToGenerate: 1,
            useType: validateUseType(item.useType),
            sourceSentenceIds: validateSentenceIds(item.sourceSentenceIds, segment.sentenceIds ?? []),
        }));

        return res.status(200).json(prompts);
    } catch (error) {
        const { status, body } = errorToResponse(error);
        return res.status(status).json(body);
    }
}
