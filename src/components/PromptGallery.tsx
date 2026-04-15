import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { generateImages } from '../services/imageService';
import { generatePromptVariations, generatePromptsForSegment } from '../services/aiProvider';
import { generateFallbackPromptsForSegment, generateFallbackPromptVariations } from '../services/fallbackPromptGenerator';
import { formatSentenceRange } from '../services/scriptParser';
import {
  CheckSquare, Square, Play, Loader2, Edit2, RefreshCw, CopyPlus,
  Terminal, Settings2, AlertTriangle, FileText, AlignLeft, LayoutList,
  ChevronDown, ChevronUp, HelpCircle, BookOpen,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { v4 as uuidv4 } from 'uuid';
import { UseType, ImagePrompt } from '../types';

// ─── Label colours ────────────────────────────────────────────────────────────
const USE_TYPE_STYLE: Record<UseType, string> = {
  'Hook':             'text-red-400 bg-red-950/40 border-red-900/50',
  'Main Visual':      'text-emerald-400 bg-emerald-950/40 border-emerald-900/50',
  'Support Visual':   'text-sky-400 bg-sky-950/40 border-sky-900/50',
  'Detail Shot':      'text-amber-400 bg-amber-950/40 border-amber-900/50',
  'Comparison Visual':'text-purple-400 bg-purple-950/40 border-purple-900/50',
  'Transition Shot':  'text-zinc-400 bg-zinc-800/40 border-zinc-700/50',
  'Outro Visual':     'text-zinc-500 bg-zinc-900/40 border-zinc-800/50',
};

// ─── Legend data ──────────────────────────────────────────────────────────────
const LEGEND: Array<{ label: string; color: string; desc: string }> = [
  { label: 'SEG', color: 'text-red-400 bg-red-950/40 border-red-900/50', desc: 'Scene segment — a block of shots in your video' },
  { label: 'S##', color: 'text-blue-400 bg-blue-950/40 border-blue-900/50', desc: 'Script sentence — one sentence from your original script' },
  { label: 'Hook', color: 'text-red-400 bg-red-950/30 border-red-900/40', desc: 'Opening impact visual that grabs the viewer immediately' },
  { label: 'Main Visual', color: 'text-emerald-400 bg-emerald-950/30 border-emerald-900/40', desc: 'Primary hero shot for the segment' },
  { label: 'Support Visual', color: 'text-sky-400 bg-sky-950/30 border-sky-900/40', desc: 'Context or fill shot that supports the main visual' },
  { label: 'Detail Shot', color: 'text-amber-400 bg-amber-950/30 border-amber-900/40', desc: 'Close-up of a mechanical or design detail' },
  { label: 'Comparison Visual', color: 'text-purple-400 bg-purple-950/30 border-purple-900/40', desc: 'Side-by-side or comparison between vehicles' },
  { label: 'Transition Shot', color: 'text-zinc-400 bg-zinc-800/40 border-zinc-700/40', desc: 'Visual bridge between two scenes or segments' },
  { label: 'Outro Visual', color: 'text-zinc-500 bg-zinc-900/40 border-zinc-800/40', desc: 'Closing sequence visual for the end of the video' },
  { label: 'Opening Line', color: 'text-zinc-400 bg-zinc-900/40 border-zinc-800/40', desc: 'Place at the very start, over the first spoken line' },
  { label: 'Mid Sentence', color: 'text-zinc-400 bg-zinc-900/40 border-zinc-800/40', desc: 'Use during the middle of the voiceover narration' },
  { label: 'End of Sentence', color: 'text-zinc-400 bg-zinc-900/40 border-zinc-800/40', desc: 'Place at the end of a sentence or thought' },
  { label: 'Between Lines', color: 'text-zinc-400 bg-zinc-900/40 border-zinc-800/40', desc: 'Insert between two sentences as a visual pause' },
  { label: 'Transition', color: 'text-zinc-400 bg-zinc-900/40 border-zinc-800/40', desc: 'Use as a cut between major segment changes' },
  { label: 'Outro', color: 'text-zinc-400 bg-zinc-900/40 border-zinc-800/40', desc: 'Place over the final lines of the video' },
];

type ViewMode = 'prompts' | 'mapping';

// ─── Shared prompt actions ────────────────────────────────────────────────────
interface PromptActionsProps {
  prompt: ImagePrompt;
  isRegenerating: string | null;
  isGeneratingVariations: string | null;
  onRegenerate: (id: string, segmentId: string) => void;
  onVariations: (id: string, text: string, segmentId: string) => void;
  onSetQty: (id: string, qty: number) => void;
}
function PromptActions({ prompt, isRegenerating, isGeneratingVariations, onRegenerate, onVariations, onSetQty }: PromptActionsProps) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-800/80 rounded px-2 py-1">
        <span className="text-[9px] font-mono text-zinc-500 uppercase">QTY:</span>
        <input
          type="number" min="1" max="10"
          value={prompt.imagesToGenerate || 1}
          onChange={e => onSetQty(prompt.id, parseInt(e.target.value) || 1)}
          className="w-7 bg-transparent text-[11px] font-mono font-bold text-zinc-200 text-center focus:outline-none"
        />
      </div>
      <div className="flex items-center gap-0.5 border-l border-zinc-800/80 pl-1.5">
        <button onClick={() => onRegenerate(prompt.id, prompt.segmentId)} disabled={isRegenerating === prompt.id}
          className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded transition-colors" title="Regenerate Prompt">
          {isRegenerating === prompt.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
        </button>
        <button onClick={() => onVariations(prompt.id, prompt.promptText, prompt.segmentId)} disabled={isGeneratingVariations === prompt.id}
          className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded transition-colors" title="Generate Variations">
          {isGeneratingVariations === prompt.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CopyPlus className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function PromptGallery() {
  const {
    prompts, segments, sentences, settings, updateSettings,
    togglePromptSelection, selectAllPrompts, deselectAllPrompts,
    updatePrompt, setImagesPerPrompt, addPromptVariations,
    isGeneratingImages, setIsGeneratingImages, addImages, saveProject,
  } = useAppStore();

  const [isGeneratingVariations, setIsGeneratingVariations] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState<string | null>(null);
  const [fallbackMessage, setFallbackMessage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('prompts');
  const [showLegend, setShowLegend] = useState(true);

  // Fast lookups
  const sentenceMap = useMemo(() => new Map(sentences.map(s => [s.id, s])), [sentences]);

  const selectedPrompts = prompts.filter(p => p.selected);
  const totalImages = selectedPrompts.reduce((sum, p) => sum + (p.imagesToGenerate || 1), 0);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleGenerateImages = async () => {
    if (!selectedPrompts.length) return;
    setIsGeneratingImages(true);
    try {
      const imgs = await generateImages(selectedPrompts, settings);
      addImages(imgs);
      saveProject();
    } catch (err) {
      console.error('Failed to generate images:', err);
      alert('Failed to generate images. Please try again.');
    } finally {
      setIsGeneratingImages(false);
    }
  };

  const handleVariations = async (promptId: string, promptText: string, _segmentId: string) => {
    setIsGeneratingVariations(promptId);
    setFallbackMessage(null);
    try {
      let variations: string[];
      if (settings.promptMode === 'fallback') {
        variations = generateFallbackPromptVariations(promptText, 2);
      } else {
        try {
          variations = await generatePromptVariations(promptText, 2);
        } catch {
          setFallbackMessage('AI quota exceeded. Switched to Fast Fallback Mode.');
          updateSettings({ promptMode: 'fallback' });
          variations = generateFallbackPromptVariations(promptText, 2);
        }
      }
      const original = prompts.find(p => p.id === promptId);
      const newPrompts = variations.map((text, i) => ({
        ...original!, id: uuidv4(),
        title: `${original?.title} (Var ${i + 1})`,
        promptText: text, selected: true, imagesToGenerate: 1,
      }));
      addPromptVariations(promptId, newPrompts);
      saveProject();
    } catch (err) {
      console.error('Failed to generate variations:', err);
      alert('Failed to generate variations.');
    } finally {
      setIsGeneratingVariations(null);
    }
  };

  const handleRegenerate = async (promptId: string, segmentId: string) => {
    setIsRegenerating(promptId);
    setFallbackMessage(null);
    try {
      const segment = segments.find(s => s.id === segmentId);
      if (!segment) return;
      let newPrompts;
      if (settings.promptMode === 'fallback') {
        newPrompts = generateFallbackPromptsForSegment({ ...segment, estimatedImagesNeeded: 1 }, settings);
      } else {
        try {
          newPrompts = await generatePromptsForSegment({ ...segment, estimatedImagesNeeded: 1 }, settings, sentences);
        } catch {
          setFallbackMessage('AI quota exceeded. Switched to Fast Fallback Mode.');
          updateSettings({ promptMode: 'fallback' });
          newPrompts = generateFallbackPromptsForSegment({ ...segment, estimatedImagesNeeded: 1 }, settings);
        }
      }
      if (newPrompts.length > 0) {
        updatePrompt(promptId, {
          title: newPrompts[0].title,
          promptText: newPrompts[0].promptText,
          shotType: newPrompts[0].shotType,
          intensityScore: newPrompts[0].intensityScore,
        });
        saveProject();
      }
    } catch (err) {
      console.error('Failed to regenerate prompt:', err);
    } finally {
      setIsRegenerating(null);
    }
  };

  // ── Empty state ───────────────────────────────────────────────────────────
  if (prompts.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 bg-zinc-950/50 min-w-[450px] relative">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9IiMzZjNmNDYiLz48L3N2Zz4=')] opacity-[0.03]"></div>
        <div className="w-16 h-16 rounded-full bg-zinc-900/80 flex items-center justify-center mb-4 border border-zinc-800 shadow-inner z-10">
          <Terminal className="w-8 h-8 text-zinc-600" />
        </div>
        <h3 className="text-sm font-mono tracking-widest text-zinc-400 mb-2 uppercase z-10">Prompt Engine Locked</h3>
        <p className="text-xs text-center max-w-xs text-zinc-600 z-10">
          Awaiting scene direction. Generate prompts from your scene plan to unlock this module.
        </p>
      </div>
    );
  }

  // ── Data grouping ──────────────────────────────────────────────────────────
  const groupedBySegment = segments
    .map(seg => ({ segment: seg, segPrompts: prompts.filter(p => p.segmentId === seg.id) }))
    .filter(g => g.segPrompts.length > 0);

  const mappingGroups = segments
    .map(seg => {
      const segPrompts = prompts.filter(p => p.segmentId === seg.id);
      const sentenceTexts = (seg.sentenceIds ?? [])
        .map(id => ({ id, text: sentenceMap.get(id)?.text ?? '' }))
        .filter(s => s.text);
      return { segment: seg, sentenceTexts, segPrompts };
    })
    .filter(g => g.segPrompts.length > 0);

  // ── Shared action props ────────────────────────────────────────────────────
  const actionProps = {
    isRegenerating, isGeneratingVariations,
    onRegenerate: handleRegenerate,
    onVariations: handleVariations,
    onSetQty: setImagesPerPrompt,
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex h-full overflow-hidden">

      {/* ── Center Workspace ────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-zinc-950 relative overflow-hidden">

        {/* Header */}
        <div className="p-5 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-950/80 backdrop-blur-sm z-10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center">
              <Terminal className="w-4 h-4 text-zinc-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-200 tracking-wide">PROMPT ENGINE</h2>
              <p className="text-[10px] font-mono text-zinc-500 tracking-widest uppercase">
                {prompts.length} prompts · {sentences.length} script sentences mapped
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* View toggle */}
            <div className="flex items-center gap-1 bg-zinc-900/50 border border-zinc-800/50 rounded p-1">
              <button onClick={() => setViewMode('prompts')}
                className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-mono font-bold tracking-widest transition-all',
                  viewMode === 'prompts' ? 'bg-zinc-800 text-zinc-200 border border-zinc-600' : 'text-zinc-500 hover:text-zinc-300')}>
                <AlignLeft className="w-3 h-3" /> PROMPT VIEW
              </button>
              <button onClick={() => setViewMode('mapping')}
                className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-mono font-bold tracking-widest transition-all',
                  viewMode === 'mapping' ? 'bg-blue-950/60 text-blue-300 border border-blue-900/50' : 'text-zinc-500 hover:text-zinc-300')}>
                <LayoutList className="w-3 h-3" /> MAPPING VIEW
              </button>
            </div>
            {/* Select all / none */}
            <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500 bg-zinc-900/50 px-3 py-1.5 rounded border border-zinc-800/50">
              <button onClick={() => selectAllPrompts()} className="hover:text-zinc-300 transition-colors">SELECT ALL</button>
              <span className="text-zinc-700">/</span>
              <button onClick={() => deselectAllPrompts()} className="hover:text-zinc-300 transition-colors">NONE</button>
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 hide-scrollbar bg-zinc-950/30">

          {/* Fallback banner */}
          {fallbackMessage && (
            <div className="bg-amber-950/40 border border-amber-900/50 rounded p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-amber-400">Fallback Mode Active</h4>
                <p className="text-xs text-amber-500/80 mt-1">{fallbackMessage}</p>
              </div>
            </div>
          )}

          {/* ════ PROMPT VIEW ════════════════════════════════════════════ */}
          {viewMode === 'prompts' && groupedBySegment.map(({ segment, segPrompts }) => (
            <div key={segment.id} className="space-y-5">

              {/* Segment divider */}
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-mono font-bold text-red-400 bg-red-950/30 px-2 py-1 rounded border border-red-900/30">
                    SEG {String(segment.segmentNumber).padStart(2, '0')}
                  </span>
                  {(segment.sentenceIds ?? []).length > 0 && (
                    <span className="text-[11px] font-mono font-bold text-blue-400 bg-blue-950/30 px-2 py-1 rounded border border-blue-900/30">
                      {formatSentenceRange(segment.sentenceIds)}
                    </span>
                  )}
                  <span className="text-[11px] font-mono text-zinc-400">{segment.recommendedShotType}</span>
                </div>
                <button onClick={() => selectAllPrompts(segment.id)}
                  className="text-[10px] font-mono text-zinc-500 hover:text-zinc-300 transition-colors">
                  SELECT GROUP
                </button>
              </div>

              {/* Prompt cards */}
              {segPrompts.map(prompt => {
                const sentenceIds = prompt.sourceSentenceIds ?? [];
                const segNum = String(segment.segmentNumber).padStart(2, '0');

                return (
                  <div key={prompt.id}
                    className={cn('border rounded-lg transition-colors relative group shadow-sm overflow-hidden',
                      prompt.selected
                        ? 'bg-zinc-900/80 border-red-900/50 shadow-[inset_4px_0_0_rgba(220,38,38,0.5)]'
                        : 'bg-zinc-950 border-zinc-800/80 hover:border-zinc-700')}>

                    {/* Checkbox */}
                    <button onClick={() => togglePromptSelection(prompt.id)}
                      className="absolute top-4 left-4 text-zinc-500 hover:text-zinc-300 z-10 transition-colors">
                      {prompt.selected ? <CheckSquare className="w-4 h-4 text-red-500" /> : <Square className="w-4 h-4" />}
                    </button>

                    <div className="pl-10 pr-4 pt-4 pb-4 space-y-3">

                      {/* Title + Shot Type */}
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-semibold text-zinc-200 leading-snug">{prompt.title}</h4>
                        <span className="text-[10px] font-mono font-bold text-zinc-400 bg-zinc-950 px-2 py-1 rounded border border-zinc-800/80 uppercase flex-shrink-0">
                          {prompt.shotType}
                        </span>
                      </div>

                      {/* ────── MAPPING STRIP ────── */}
                      <div className="bg-zinc-950/80 border border-zinc-800/60 rounded p-3">
                        <div className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest mb-2.5">Mapping</div>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-mono text-zinc-600 uppercase w-[52px] flex-shrink-0">Segment</span>
                            <span className="text-[11px] font-mono font-bold text-zinc-200">SEG {segNum}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-mono text-zinc-600 uppercase w-[52px] flex-shrink-0">Sentence</span>
                            <span className={cn('text-[11px] font-mono font-bold',
                              sentenceIds.length > 0 ? 'text-blue-400' : 'text-zinc-600')}>
                              {sentenceIds.length > 0 ? formatSentenceRange(sentenceIds) : '—'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-mono text-zinc-600 uppercase w-[52px] flex-shrink-0">Use</span>
                            {prompt.useType && (
                              <span className={cn('text-[9px] font-mono px-1.5 py-0.5 rounded border', USE_TYPE_STYLE[prompt.useType])}>
                                {prompt.useType}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-mono text-zinc-600 uppercase w-[52px] flex-shrink-0">Placement</span>
                            <span className="text-[10px] font-mono text-zinc-400">{prompt.recommendedPlacement || '—'}</span>
                          </div>
                        </div>
                      </div>

                      {/* ────── SOURCE SCRIPT ────── */}
                      {sentenceIds.length > 0 && (
                        <div className="rounded-lg overflow-hidden border border-blue-900/30 bg-blue-950/10">
                          <div className="px-3 py-1.5 bg-blue-950/20 border-b border-blue-900/20 flex items-center gap-1.5">
                            <FileText className="w-3 h-3 text-blue-500" />
                            <span className="text-[9px] font-mono font-bold text-blue-400 uppercase tracking-widest">Source Script</span>
                            <span className="text-[9px] font-mono text-blue-700 ml-auto">
                              This prompt was generated for the lines below
                            </span>
                          </div>
                          <div className="px-3 py-3 space-y-2.5">
                            {sentenceIds.map(id => {
                              const s = sentenceMap.get(id);
                              return s ? (
                                <div key={id} className="flex gap-3 items-start">
                                  <span className="text-[10px] font-mono font-bold text-blue-400 bg-blue-950/60 border border-blue-900/50 px-1.5 py-0.5 rounded flex-shrink-0 min-w-[34px] text-center">
                                    {id}
                                  </span>
                                  <p className="text-[12px] text-zinc-200 leading-relaxed">{s.text}</p>
                                </div>
                              ) : null;
                            })}
                          </div>
                        </div>
                      )}

                      {sentenceIds.length === 0 && (
                        <div className="text-[10px] font-mono text-zinc-600 bg-zinc-900/30 border border-zinc-800/40 rounded px-3 py-2 italic">
                          No sentence mapping — re-analyze your script in AI mode to generate linked sentence data.
                        </div>
                      )}

                      {/* ────── PROMPT TEXTAREA ────── */}
                      <div className="relative">
                        <textarea
                          value={prompt.promptText}
                          onChange={e => updatePrompt(prompt.id, { promptText: e.target.value })}
                          className="w-full bg-zinc-950 border border-zinc-800/50 rounded p-3 text-[13px] text-zinc-300 focus:outline-none focus:border-red-500/30 focus:ring-1 focus:ring-red-500/30 resize-none min-h-[80px] font-mono leading-relaxed shadow-inner"
                        />
                        <Edit2 className="w-3.5 h-3.5 text-zinc-600 absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                      </div>

                      {/* ────── FOOTER ────── */}
                      <div className="flex items-center justify-between pt-2 border-t border-zinc-800/40">
                        <div className="text-[10px] font-mono text-zinc-500 uppercase flex items-center gap-3">
                          <span><strong className="text-zinc-400">PURPOSE:</strong> {prompt.purposeInVideo}</span>
                          <span>INTENSITY: <strong className="text-zinc-300">{prompt.intensityScore}/10</strong></span>
                        </div>
                        <PromptActions prompt={prompt} {...actionProps} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

          {/* ════ MAPPING VIEW ════════════════════════════════════════════ */}
          {viewMode === 'mapping' && (
            <div className="space-y-6">
              {/* Explainer banner */}
              <div className="bg-blue-950/20 border border-blue-900/30 rounded p-3 flex items-start gap-2">
                <BookOpen className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-blue-300 leading-relaxed">
                  <strong>Mapping View</strong> — Every segment shows its covered script sentences first, then the prompts that were generated for those lines. Each prompt is directly traceable to its script source.
                </p>
              </div>

              {mappingGroups.map(({ segment, sentenceTexts, segPrompts }) => (
                <div key={segment.id} className="bg-zinc-900/20 border border-zinc-800/60 rounded-xl overflow-hidden">

                  {/* ── Segment header ── */}
                  <div className="bg-zinc-900/80 px-5 py-3 border-b border-zinc-800/60 flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-mono font-bold text-red-400 bg-red-950/30 px-2 py-1 rounded border border-red-900/30">
                      SEG {String(segment.segmentNumber).padStart(2, '0')}
                    </span>
                    {(segment.sentenceIds ?? []).length > 0 && (
                      <span className="text-[11px] font-mono font-bold text-blue-400 bg-blue-950/30 px-2 py-1 rounded border border-blue-900/30">
                        {formatSentenceRange(segment.sentenceIds)}
                      </span>
                    )}
                    <span className="text-[11px] font-mono text-zinc-300 font-medium">{segment.recommendedShotType}</span>
                    <span className="ml-auto text-[10px] font-mono text-zinc-600">
                      {segPrompts.length} prompt{segPrompts.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* ── Script sentences for this segment ── */}
                  {sentenceTexts.length > 0 && (
                    <div className="px-5 py-4 border-b border-zinc-800/40 bg-blue-950/5">
                      <div className="text-[9px] font-mono text-blue-500/70 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                        <FileText className="w-3 h-3" />
                        SCRIPT LINES COVERED BY THIS SEGMENT
                      </div>
                      <div className="space-y-2.5">
                        {sentenceTexts.map(({ id, text }) => (
                          <div key={id} className="flex gap-3 items-start">
                            <span className="text-[10px] font-mono font-bold text-blue-400 bg-blue-950/60 border border-blue-900/50 px-2 py-1 rounded flex-shrink-0 min-w-[36px] text-center">
                              {id}
                            </span>
                            <p className="text-sm text-zinc-200 leading-relaxed">{text}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {sentenceTexts.length === 0 && (
                    <div className="px-5 py-3 border-b border-zinc-800/40 bg-zinc-900/20">
                      <p className="text-[10px] font-mono text-zinc-600 italic">
                        No sentence mapping for this segment. Re-analyze your script to generate mapped data.
                      </p>
                    </div>
                  )}

                  {/* ── Compact prompt cards ── */}
                  <div className="p-4 space-y-3">
                    <div className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">
                      VISUAL PROMPTS ({segPrompts.length})
                    </div>

                    {segPrompts.map(prompt => {
                      const sentenceIds = prompt.sourceSentenceIds ?? [];
                      return (
                        <div key={prompt.id}
                          className={cn('border rounded-lg transition-colors relative overflow-hidden',
                            prompt.selected
                              ? 'bg-zinc-900/80 border-red-900/40 shadow-[inset_3px_0_0_rgba(220,38,38,0.4)]'
                              : 'bg-zinc-950/60 border-zinc-800/60 hover:border-zinc-700')}>

                          <button onClick={() => togglePromptSelection(prompt.id)}
                            className="absolute top-3 left-3 text-zinc-500 hover:text-zinc-300 transition-colors z-10">
                            {prompt.selected ? <CheckSquare className="w-4 h-4 text-red-500" /> : <Square className="w-4 h-4" />}
                          </button>

                          <div className="pl-10 pr-4 pt-3 pb-3 space-y-2">
                            {/* Title + meta badges */}
                            <div className="flex items-start gap-2 flex-wrap">
                              <h4 className="text-sm font-semibold text-zinc-200">{prompt.title}</h4>
                              <div className="flex items-center gap-1.5 flex-wrap ml-auto">
                                {sentenceIds.length > 0 && (
                                  <span className="text-[10px] font-mono font-bold text-blue-400 bg-blue-950/50 px-2 py-0.5 rounded border border-blue-900/40">
                                    {formatSentenceRange(sentenceIds)}
                                  </span>
                                )}
                                {prompt.useType && (
                                  <span className={cn('text-[9px] font-mono px-1.5 py-0.5 rounded border', USE_TYPE_STYLE[prompt.useType])}>
                                    {prompt.useType}
                                  </span>
                                )}
                                {prompt.recommendedPlacement && (
                                  <span className="text-[9px] font-mono text-zinc-500 bg-zinc-900/50 px-1.5 py-0.5 rounded border border-zinc-800/40">
                                    {prompt.recommendedPlacement}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Inline sentence preview for this specific prompt's sentences */}
                            {sentenceIds.length > 0 && (
                              <div className="space-y-1 border-l-2 border-blue-900/40 pl-2.5">
                                {sentenceIds.map(id => {
                                  const s = sentenceMap.get(id);
                                  return s ? (
                                    <div key={id} className="flex gap-2 items-start">
                                      <span className="text-[9px] font-mono font-bold text-blue-500 flex-shrink-0 w-7">{id}:</span>
                                      <p className="text-[11px] text-zinc-400 italic leading-relaxed">"{s.text}"</p>
                                    </div>
                                  ) : null;
                                })}
                              </div>
                            )}

                            {/* Prompt text preview */}
                            <p className="text-[11px] font-mono text-zinc-500 line-clamp-2 leading-relaxed">
                              {prompt.promptText}
                            </p>

                            {/* Actions */}
                            <div className="flex items-center justify-end gap-2 pt-1.5 border-t border-zinc-800/40">
                              <PromptActions prompt={prompt} {...actionProps} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>

      {/* ── Right Inspector ──────────────────────────────────────────────── */}
      <div className="w-80 flex-shrink-0 border-l border-zinc-800/80 bg-zinc-950 flex flex-col h-full relative z-20 shadow-[-4px_0_24px_rgba(0,0,0,0.2)]">
        <div className="p-5 border-b border-zinc-800/80 flex items-center gap-2 bg-zinc-900/30">
          <Settings2 className="w-4 h-4 text-zinc-500" />
          <h2 className="text-[11px] font-mono font-bold tracking-widest text-zinc-300 uppercase">Render Inspector</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5 hide-scrollbar">

          {/* Stats */}
          <div className="bg-zinc-900/50 border border-zinc-800/80 rounded p-4 space-y-3">
            <div>
              <div className="text-[10px] font-mono text-zinc-500 uppercase mb-1">Total Prompts</div>
              <div className="text-2xl font-mono text-zinc-200">{prompts.length}</div>
            </div>
            <div className="pt-3 border-t border-zinc-800/50">
              <div className="text-[10px] font-mono text-zinc-500 uppercase mb-1">Selected</div>
              <div className="text-2xl font-mono text-zinc-200">{selectedPrompts.length}</div>
            </div>
            <div className="pt-3 border-t border-zinc-800/50">
              <div className="text-[10px] font-mono text-zinc-500 uppercase mb-1">Images to Render</div>
              <div className="text-3xl font-mono text-red-400 font-bold">{totalImages}</div>
            </div>
            <div className="pt-3 border-t border-zinc-800/50">
              <div className="text-[10px] font-mono text-zinc-500 uppercase mb-1">Script Sentences</div>
              <div className="text-2xl font-mono text-blue-400">{sentences.length}</div>
            </div>
          </div>

          {/* Legend */}
          <div className="bg-zinc-900/30 border border-zinc-800/60 rounded overflow-hidden">
            <button onClick={() => setShowLegend(!showLegend)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-800/30 transition-colors">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-3.5 h-3.5 text-zinc-500" />
                <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest">Label Legend</span>
              </div>
              {showLegend ? <ChevronUp className="w-3.5 h-3.5 text-zinc-500" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />}
            </button>

            {showLegend && (
              <div className="border-t border-zinc-800/60 px-4 py-3 space-y-2.5 max-h-80 overflow-y-auto hide-scrollbar">
                {LEGEND.map(({ label, color, desc }) => (
                  <div key={label} className="flex gap-2.5 items-start">
                    <span className={cn('text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border flex-shrink-0 mt-0.5 whitespace-nowrap', color)}>
                      {label}
                    </span>
                    <p className="text-[10px] text-zinc-500 leading-snug">{desc}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Render button */}
        <div className="p-5 border-t border-zinc-800/80 bg-zinc-900/50">
          <button
            onClick={handleGenerateImages}
            disabled={isGeneratingImages || selectedPrompts.length === 0}
            className="w-full py-3.5 bg-red-600 hover:bg-red-500 text-white rounded font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:hover:bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.2)] hover:shadow-[0_0_20px_rgba(220,38,38,0.4)]"
          >
            {isGeneratingImages ? (
              <><Loader2 className="w-4 h-4 animate-spin" /><span className="text-xs tracking-widest uppercase">RENDERING...</span></>
            ) : (
              <><Play className="w-4 h-4 fill-current" /><span className="text-xs tracking-widest uppercase">RENDER {totalImages} IMAGES</span></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
