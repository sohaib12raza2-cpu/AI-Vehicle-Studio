import { v4 as uuidv4 } from 'uuid';
import { ScriptSegment, ScriptSettings, ImagePrompt, UseType } from '../types';

const SHOT_TYPES = [
  'Hero Reveal', 'Front Fascia Close-up', 'Rear Three-Quarter Angle',
  'Side Profile Highway Shot', 'Cockpit Interior', 'Dashboard Detail',
  'Steering Wheel Close-up', 'Wheel and Brake Close-up', 'Showroom Luxury Reveal',
  'Night Neon City Shot', 'Mountain Road Action Shot', 'Rain-Soaked Dramatic Shot',
  'EV Charging Scene', 'Comparison Split-Frame', 'Historical Recreation',
];

const USE_TYPE_BY_PURPOSE: Array<[string, UseType]> = [
  ['hook', 'Hook'],
  ['transition', 'Transition Shot'],
  ['outro', 'Outro Visual'],
  ['detail', 'Detail Shot'],
  ['close', 'Detail Shot'],
  ['comparison', 'Comparison Visual'],
  ['b-roll', 'Support Visual'],
  ['support', 'Support Visual'],
  ['overlay', 'Support Visual'],
];

function inferUseType(segment: ScriptSegment, promptIndex: number): UseType {
  if (promptIndex === 0 && segment.hookValue === 'High') return 'Hook';
  const purposeLow = segment.purposeInVideo.toLowerCase();
  for (const [keyword, type] of USE_TYPE_BY_PURPOSE) {
    if (purposeLow.includes(keyword)) return type;
  }
  return promptIndex === 0 ? 'Main Visual' : 'Support Visual';
}

function inferPlacement(
  segment: ScriptSegment,
  promptIndex: number,
  totalPrompts: number
): string {
  if (segment.segmentNumber === 1 && promptIndex === 0) return 'Opening Line';
  if (segment.hookValue === 'High' && promptIndex === 0) return 'Opening Line';
  if (promptIndex === 0) return 'Mid Sentence';
  if (promptIndex === totalPrompts - 1) return 'End of Sentence';
  return 'Between Lines';
}

export function generateFallbackPromptsForSegment(
  segment: ScriptSegment,
  settings: ScriptSettings
): ImagePrompt[] {
  const prompts: ImagePrompt[] = [];
  const count = segment.estimatedImagesNeeded || 2;
  const sentenceIds = segment.sentenceIds ?? [];

  // Determine best shot types based on segment context
  const selectedShots: string[] = [];
  const locLow = segment.locationEnvironment.toLowerCase();
  const focLow = segment.vehicleFocus.toLowerCase();

  if (locLow.includes('night') || locLow.includes('city') || locLow.includes('urban')) selectedShots.push('Night Neon City Shot');
  if (locLow.includes('mountain') || locLow.includes('road') || locLow.includes('highway')) selectedShots.push('Mountain Road Action Shot');
  if (locLow.includes('rain') || locLow.includes('wet')) selectedShots.push('Rain-Soaked Dramatic Shot');
  if (focLow.includes('interior') || focLow.includes('cockpit') || focLow.includes('cabin')) { selectedShots.push('Cockpit Interior'); selectedShots.push('Dashboard Detail'); }
  if (focLow.includes('wheel') || focLow.includes('brake') || focLow.includes('tire')) selectedShots.push('Wheel and Brake Close-up');
  if (focLow.includes('front') || focLow.includes('grille') || focLow.includes('headlight')) selectedShots.push('Front Fascia Close-up');
  if (focLow.includes('rear') || focLow.includes('tail') || focLow.includes('exhaust')) selectedShots.push('Rear Three-Quarter Angle');

  const generalShots = ['Hero Reveal', 'Side Profile Highway Shot', 'Showroom Luxury Reveal', 'Rear Three-Quarter Angle', 'Front Fascia Close-up'];
  let seed = 0;
  for (let i = 0; i < segment.id.length; i++) seed += segment.id.charCodeAt(i);

  while (selectedShots.length < count) {
    const candidate = generalShots[seed % generalShots.length];
    if (!selectedShots.includes(candidate)) selectedShots.push(candidate);
    else selectedShots.push(SHOT_TYPES[(seed + selectedShots.length) % SHOT_TYPES.length]);
    seed++;
  }

  const finalShots = selectedShots.slice(0, count);

  for (let i = 0; i < count; i++) {
    const shotType = finalShots[i];
    const useType = inferUseType(segment, i);
    const placement = inferPlacement(segment, i, count);
    const promptText = `Cinematic automotive photography, ${shotType} of ${segment.vehicleFocus}. Location: ${segment.locationEnvironment}. Style: ${settings.imageStyle}, ${settings.tone} tone. Motion: ${segment.motionIntensity}. Intent: ${segment.visualIntent}. High quality, 8k resolution, photorealistic, dramatically lit, professional color grading.`;

    prompts.push({
      id: uuidv4(),
      segmentId: segment.id,
      title: shotType,
      promptText,
      shotType,
      purposeInVideo: segment.purposeInVideo,
      intensityScore: segment.emotionalIntensity,
      recommendedPlacement: placement,
      selected: true,
      imagesToGenerate: 1,
      useType,
      sourceSentenceIds: sentenceIds.slice(0, Math.ceil(sentenceIds.length / count)) ?? [],
    });
  }

  return prompts;
}

export function generateFallbackPromptVariations(promptText: string, count: number = 2): string[] {
  const variations: string[] = [];
  for (let i = 0; i < count; i++) {
    let v = promptText;
    if (i === 0) {
      v = v.replace('dramatic lighting', 'golden hour lighting, warm sun flares').replace('8k resolution', 'shot on 35mm lens, cinematic depth of field');
    } else if (i === 1) {
      v = v.replace('dramatic lighting', 'moody overcast lighting, soft reflections').replace('8k resolution', 'ultra-wide angle, dynamic perspective');
    } else {
      v = `${v}, alternative angle ${i}`;
    }
    variations.push(v);
  }
  return variations;
}
