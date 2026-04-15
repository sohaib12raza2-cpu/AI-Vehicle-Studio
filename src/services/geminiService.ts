/**
 * geminiService.ts — DEPRECATED / REMOVED
 *
 * Gemini has been fully removed. This shim re-exports from longcatService
 * so any stale import survives compilation. Do NOT add new imports here.
 * Use aiProvider.ts instead.
 */
export {
  analyzeScript,
  generatePromptsForSegment,
  generatePromptVariations,
} from './longcatService';
