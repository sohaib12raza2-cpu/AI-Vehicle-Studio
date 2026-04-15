import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import {
  Project, ScriptSettings, ScriptSegment, ImagePrompt,
  GeneratedImage, ScriptSentence,
} from '../types';

interface AppState {
  projects: Project[];
  currentProjectId: string | null;

  // Current project state
  currentStep: number;
  script: string;
  settings: ScriptSettings;
  sentences: ScriptSentence[];
  segments: ScriptSegment[];
  prompts: ImagePrompt[];
  images: GeneratedImage[];

  isAnalyzing: boolean;
  isGeneratingPrompts: boolean;
  isGeneratingImages: boolean;

  // Actions
  setStep: (step: number) => void;
  setScript: (script: string) => void;
  updateSettings: (settings: Partial<ScriptSettings>) => void;

  // Flow actions
  setSentences: (sentences: ScriptSentence[]) => void;
  setSegments: (segments: ScriptSegment[]) => void;
  setPrompts: (prompts: ImagePrompt[]) => void;
  updatePrompt: (id: string, updates: Partial<ImagePrompt>) => void;
  togglePromptSelection: (id: string) => void;
  selectAllPrompts: (segmentId?: string) => void;
  deselectAllPrompts: (segmentId?: string) => void;
  setImagesPerPrompt: (id: string, count: number) => void;
  addPromptVariations: (originalId: string, newPrompts: ImagePrompt[]) => void;

  addImages: (images: GeneratedImage[]) => void;
  toggleImageFavorite: (id: string) => void;

  // Project actions
  saveProject: () => void;
  loadProject: (id: string) => void;
  createNewProject: () => void;

  // Loading states
  setIsAnalyzing: (v: boolean) => void;
  setIsGeneratingPrompts: (v: boolean) => void;
  setIsGeneratingImages: (v: boolean) => void;
}

const defaultSettings: ScriptSettings = {
  title: 'Untitled AutoVisual Project',
  contentType: 'car review',
  tone: 'cinematic',
  visualDensity: 'medium',
  imageStyle: 'photoreal cinematic',
  aspectRatio: '16:9',
  promptMode: 'ai',
};

/** Ensure backward-compat when loading projects that lack new fields. */
function hydrateSegment(s: ScriptSegment): ScriptSegment {
  return { ...s, sentenceIds: s.sentenceIds ?? [] };
}
function hydratePrompt(p: ImagePrompt): ImagePrompt {
  return {
    ...p,
    sourceSentenceIds: p.sourceSentenceIds ?? [],
    useType: p.useType ?? 'Main Visual',
  };
}
function hydrateImage(i: GeneratedImage): GeneratedImage {
  return {
    ...i,
    promptTitle: i.promptTitle ?? '',
    sourceSentenceIds: i.sourceSentenceIds ?? [],
    useType: i.useType ?? 'Main Visual',
    recommendedPlacement: i.recommendedPlacement ?? '',
  };
}

export const useAppStore = create<AppState>((set, get) => ({
  projects: [],
  currentProjectId: null,

  currentStep: 1,
  script: '',
  settings: defaultSettings,
  sentences: [],
  segments: [],
  prompts: [],
  images: [],

  isAnalyzing: false,
  isGeneratingPrompts: false,
  isGeneratingImages: false,

  setStep: (step) => set({ currentStep: step }),
  setScript: (script) => set({ script }),
  updateSettings: (updates) => set((state) => ({ settings: { ...state.settings, ...updates } })),

  setSentences: (sentences) => set({ sentences }),
  setSegments: (segments) => set({ segments, currentStep: 2 }),
  setPrompts: (prompts) => set({ prompts, currentStep: 3 }),

  updatePrompt: (id, updates) => set((state) => ({
    prompts: state.prompts.map(p => p.id === id ? { ...p, ...updates } : p),
  })),

  togglePromptSelection: (id) => set((state) => ({
    prompts: state.prompts.map(p => p.id === id ? { ...p, selected: !p.selected } : p),
  })),

  selectAllPrompts: (segmentId) => set((state) => ({
    prompts: state.prompts.map(p => (!segmentId || p.segmentId === segmentId) ? { ...p, selected: true } : p),
  })),

  deselectAllPrompts: (segmentId) => set((state) => ({
    prompts: state.prompts.map(p => (!segmentId || p.segmentId === segmentId) ? { ...p, selected: false } : p),
  })),

  setImagesPerPrompt: (id, count) => set((state) => ({
    prompts: state.prompts.map(p => p.id === id ? { ...p, imagesToGenerate: Math.max(1, count) } : p),
  })),

  addPromptVariations: (originalId, newPrompts) => set((state) => {
    const index = state.prompts.findIndex(p => p.id === originalId);
    if (index === -1) return state;
    const updated = [...state.prompts];
    updated.splice(index + 1, 0, ...newPrompts);
    return { prompts: updated };
  }),

  addImages: (newImages) => set((state) => ({
    images: [...state.images, ...newImages],
    currentStep: 4,
  })),

  toggleImageFavorite: (id) => set((state) => ({
    images: state.images.map(img => img.id === id ? { ...img, isFavorite: !img.isFavorite } : img),
  })),

  saveProject: () => {
    const state = get();
    const now = Date.now();
    const projectData: Project = {
      id: state.currentProjectId || uuidv4(),
      createdAt: state.currentProjectId
        ? (state.projects.find(p => p.id === state.currentProjectId)?.createdAt || now)
        : now,
      updatedAt: now,
      script: state.script,
      settings: state.settings,
      sentences: state.sentences,
      segments: state.segments,
      prompts: state.prompts,
      images: state.images,
    };
    set((state) => {
      const idx = state.projects.findIndex(p => p.id === projectData.id);
      const projects = [...state.projects];
      if (idx >= 0) projects[idx] = projectData;
      else projects.push(projectData);
      return { projects, currentProjectId: projectData.id };
    });
  },

  loadProject: (id) => {
    const project = get().projects.find(p => p.id === id);
    if (project) {
      set({
        currentProjectId: project.id,
        currentStep: 1,
        script: project.script,
        settings: project.settings,
        sentences: project.sentences ?? [],
        segments: (project.segments ?? []).map(hydrateSegment),
        prompts: (project.prompts ?? []).map(hydratePrompt),
        images: (project.images ?? []).map(hydrateImage),
      });
    }
  },

  createNewProject: () => set({
    currentProjectId: null,
    currentStep: 1,
    script: '',
    settings: defaultSettings,
    sentences: [],
    segments: [],
    prompts: [],
    images: [],
  }),

  setIsAnalyzing: (v) => set({ isAnalyzing: v }),
  setIsGeneratingPrompts: (v) => set({ isGeneratingPrompts: v }),
  setIsGeneratingImages: (v) => set({ isGeneratingImages: v }),
}));
