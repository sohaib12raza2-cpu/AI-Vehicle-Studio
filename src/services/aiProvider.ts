/**
 * aiProvider.ts — Provider abstraction layer.
 * All app code imports AI functions exclusively from this file.
 * To swap the LLM provider, change only the re-exports below.
 */
export {
  analyzeScript,
  generatePromptsForSegment,
  generatePromptVariations,
  testLongCatConnection as testConnection,
  LongCatError as AIProviderError,
  type ConnectionTestResult,
} from './longcatService';

// Canonical aliases required by the provider contract
export { generatePromptsForSegment as generateScenePlan } from './longcatService';
export { generatePromptsForSegment as regeneratePrompt } from './longcatService';
