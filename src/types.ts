export type ContentType = 
  | 'car review'
  | 'comparison'
  | 'history'
  | 'facts'
  | 'top 10'
  | 'breaking automotive news'
  | 'luxury showcase'
  | 'performance analysis'
  | 'EV explainer';

export type Tone = 
  | 'cinematic'
  | 'aggressive'
  | 'luxury'
  | 'documentary'
  | 'futuristic'
  | 'high-energy YouTube';

export type VisualDensity = 'low' | 'medium' | 'high' | 'extreme';

export type ImageStyle = 
  | 'photoreal cinematic'
  | 'dark moody realism'
  | 'ultra luxury commercial'
  | 'futuristic concept realism'
  | 'dramatic editorial';

export type AspectRatio = '16:9' | '9:16' | '1:1';

export type PromptMode = 'ai' | 'fallback';

export type UseType =
  | 'Hook'
  | 'Main Visual'
  | 'Support Visual'
  | 'Detail Shot'
  | 'Comparison Visual'
  | 'Transition Shot'
  | 'Outro Visual';

export type PlacementType =
  | 'Opening Line'
  | 'Mid Sentence'
  | 'End of Sentence'
  | 'Between Lines'
  | 'Transition'
  | 'Before Next Segment'
  | 'Outro';

export const USE_TYPES: UseType[] = [
  'Hook', 'Main Visual', 'Support Visual', 'Detail Shot',
  'Comparison Visual', 'Transition Shot', 'Outro Visual',
];

export const PLACEMENT_TYPES: PlacementType[] = [
  'Opening Line', 'Mid Sentence', 'End of Sentence',
  'Between Lines', 'Transition', 'Before Next Segment', 'Outro',
];

// Placement display order for timeline sorting
export const PLACEMENT_ORDER: Record<string, number> = {
  'Opening Line': 1,
  'Mid Sentence': 2,
  'End of Sentence': 3,
  'Between Lines': 4,
  'Transition': 5,
  'Before Next Segment': 6,
  'Outro': 7,
};

export interface ScriptSettings {
  title: string;
  contentType: ContentType;
  tone: Tone;
  visualDensity: VisualDensity;
  imageStyle: ImageStyle;
  aspectRatio: AspectRatio;
  promptMode: PromptMode;
}

/** A sentence-level unit of the script with a stable ID like "S01", "S02". */
export interface ScriptSentence {
  id: string;    // e.g. "S01"
  index: number; // 0-based position in the script
  text: string;  // the actual sentence text
}

export interface ScriptSegment {
  id: string;
  segmentNumber: number;
  excerpt: string;
  visualIntent: string;
  recommendedShotType: string;
  vehicleFocus: string;
  locationEnvironment: string;
  emotionalIntensity: number; // 1-10
  motionIntensity: string;
  estimatedImagesNeeded: number;
  hookValue: string;
  purposeInVideo: string;
  sentenceIds: string[]; // e.g. ["S01", "S02"] — which sentences this segment covers
}

export interface ImagePrompt {
  id: string;
  segmentId: string;
  title: string;
  promptText: string;
  shotType: string;
  purposeInVideo: string;
  intensityScore: number; // 1-10
  recommendedPlacement: string;
  selected: boolean;
  imagesToGenerate: number;
  sourceSentenceIds: string[]; // which sentences this prompt is most relevant to
  useType: UseType;            // HOW this visual is intended to be used
}

export interface GeneratedImage {
  id: string;
  promptId: string;
  segmentId: string;
  url: string;
  isFavorite: boolean;
  // Mapping data inherited from the source prompt
  promptTitle: string;
  sourceSentenceIds: string[];
  useType: UseType;
  recommendedPlacement: string;
}

export interface Project {
  id: string;
  createdAt: number;
  updatedAt: number;
  script: string;
  settings: ScriptSettings;
  sentences: ScriptSentence[];
  segments: ScriptSegment[];
  prompts: ImagePrompt[];
  images: GeneratedImage[];
}
