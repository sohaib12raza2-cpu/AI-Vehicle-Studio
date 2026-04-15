import React, { useState, useMemo, useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';
import { cn } from '../lib/utils';
import {
  Monitor, Download, Heart, Copy, Settings2, X, ChevronDown,
  Film, AlignLeft, Clock, Filter, Maximize2,
} from 'lucide-react';
import { GeneratedImage, UseType, PLACEMENT_ORDER } from '../types';

// ─── Badge helpers ────────────────────────────────────────────────────────────
const USE_STYLE: Record<UseType, { pill: string; dot: string }> = {
  'Hook':             { pill: 'text-red-400 bg-red-950/60 border-red-900/60',     dot: 'bg-red-500' },
  'Main Visual':      { pill: 'text-emerald-400 bg-emerald-950/60 border-emerald-900/60', dot: 'bg-emerald-500' },
  'Support Visual':   { pill: 'text-sky-400 bg-sky-950/60 border-sky-900/60',     dot: 'bg-sky-500' },
  'Detail Shot':      { pill: 'text-amber-400 bg-amber-950/60 border-amber-900/60', dot: 'bg-amber-500' },
  'Comparison Visual':{ pill: 'text-purple-400 bg-purple-950/60 border-purple-900/60', dot: 'bg-purple-500' },
  'Transition Shot':  { pill: 'text-zinc-300 bg-zinc-800/60 border-zinc-700/60',  dot: 'bg-zinc-400' },
  'Outro Visual':     { pill: 'text-zinc-400 bg-zinc-900/60 border-zinc-800/60',  dot: 'bg-zinc-500' },
};

function SentenceBadge({ id }: Readonly<{ id: string; key?: React.Key }>) {
  return (
    <span className="text-[9px] font-mono font-bold text-blue-400 bg-blue-950/70 px-1.5 py-0.5 rounded border border-blue-900/60 leading-none">
      {id}
    </span>
  );
}

function SegBadge({ num }: Readonly<{ num: number | undefined }>) {
  if (!num) return null;
  return (
    <span className="text-[9px] font-mono font-bold text-zinc-400 bg-zinc-900/70 px-1.5 py-0.5 rounded border border-zinc-700/60 leading-none">
      SEG {String(num).padStart(2, '0')}
    </span>
  );
}

function UseTypeBadge({ type, tiny = false }: Readonly<{ type: UseType; tiny?: boolean }>) {
  const style = USE_STYLE[type] ?? USE_STYLE['Main Visual'];
  return (
    <span className={cn('font-mono rounded border leading-none', tiny ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2 py-0.5', style.pill)}>
      {type}
    </span>
  );
}

function PlacementBadge({ placement }: Readonly<{ placement: string }>) {
  return (
    <span className="text-[9px] font-mono text-zinc-500 bg-zinc-900/60 px-1.5 py-0.5 rounded border border-zinc-800/50 leading-none">
      {placement}
    </span>
  );
}

// ─── Image Card ───────────────────────────────────────────────────────────────
interface CardProps {
  key?: React.Key;
  image: GeneratedImage;
  segmentNum?: number;
  firstSentenceText?: string;
  onExpand: (img: GeneratedImage) => void;
  onFavorite: (id: string) => void;
  onCopy: (promptId: string) => void;
  onDownload: (img: GeneratedImage) => void;
}

function ImageCard({ image, segmentNum, firstSentenceText, onExpand, onFavorite, onCopy, onDownload }: CardProps) {
  return (
    <div
      className="bg-zinc-900/40 border border-zinc-800/80 rounded-md overflow-hidden group flex flex-col hover:border-zinc-600 transition-all shadow-sm cursor-pointer"
      onClick={() => onExpand(image)}
    >
      <div className="relative aspect-video bg-zinc-950 overflow-hidden">
        <img
          src={image.url}
          alt={image.promptTitle || 'Generated image'}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          referrerPolicy="no-referrer"
        />
        {/* Action overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3">
          <div className="flex justify-end gap-1.5">
            <button onClick={(e) => { e.stopPropagation(); onCopy(image.promptId); }}
              className="p-2 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 rounded backdrop-blur-sm transition-colors border border-zinc-700/50" title="Copy Prompt">
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDownload(image); }}
              className="p-2 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 rounded backdrop-blur-sm transition-colors border border-zinc-700/50" title="Download">
              <Download className="w-3.5 h-3.5" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onFavorite(image.id); }}
              className="p-2 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 rounded backdrop-blur-sm transition-colors border border-zinc-700/50" title="Favorite">
              <Heart className={cn('w-3.5 h-3.5', image.isFavorite ? 'fill-red-500 text-red-500' : '')} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onExpand(image); }}
              className="p-2 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 rounded backdrop-blur-sm transition-colors border border-zinc-700/50" title="Expand">
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
          {/* Bottom badges in overlay */}
          <div className="flex flex-wrap gap-1">
            {(image.sourceSentenceIds ?? []).slice(0, 3).map(id => <SentenceBadge key={id} id={id} />)}
            <SegBadge num={segmentNum} />
          </div>
        </div>
        {/* Favorite indicator */}
        {image.isFavorite && (
          <div className="absolute top-2 right-2 bg-zinc-900/80 backdrop-blur-sm p-1.5 rounded border border-zinc-700/50">
            <Heart className="w-3 h-3 fill-red-500 text-red-500" />
          </div>
        )}
        {/* Dot indicator for use type */}
        {image.useType && (
          <div className="absolute top-2 left-2">
            <div className={cn('w-2 h-2 rounded-full shadow-lg', USE_STYLE[image.useType]?.dot ?? 'bg-zinc-500')} title={image.useType} />
          </div>
        )}
      </div>
      <div className="p-3 flex-1 flex flex-col bg-zinc-900/80 border-t border-zinc-800/80 gap-1.5">
        <h4 className="text-xs font-semibold text-zinc-200 truncate">{image.promptTitle || 'Image'}</h4>
        {/* Sentence IDs + Segment — always visible */}
        <div className="flex flex-wrap gap-1">
          {(image.sourceSentenceIds ?? []).slice(0, 3).map(id => (
            <span key={id} className="text-[9px] font-mono font-bold text-blue-400 bg-blue-950/50 px-1.5 py-0.5 rounded border border-blue-900/40 leading-none">{id}</span>
          ))}
          {segmentNum != null && (
            <span className="text-[9px] font-mono text-zinc-500 bg-zinc-900/50 px-1.5 py-0.5 rounded border border-zinc-800/40 leading-none">
              SEG {String(segmentNum).padStart(2, '0')}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-1">
          {image.useType && <UseTypeBadge type={image.useType} tiny />}
          {image.recommendedPlacement && <PlacementBadge placement={image.recommendedPlacement} />}
        </div>
        {/* First linked sentence text — readable, not just a badge */}
        {firstSentenceText && (
          <p className="text-[9px] font-mono text-zinc-600 italic leading-snug line-clamp-2 mt-0.5 border-t border-zinc-800/40 pt-1.5">
            "{firstSentenceText}"
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Expand Modal ─────────────────────────────────────────────────────────────
interface ExpandModalProps {
  image: GeneratedImage;
  promptText?: string;
  segmentNum?: number;
  sentenceTexts: Array<{ id: string; text: string }>;
  onClose: () => void;
  onFavorite: (id: string) => void;
  onDownload: (img: GeneratedImage) => void;
  onCopy: (promptId: string) => void;
}

function ExpandModal({ image, promptText, segmentNum, sentenceTexts, onClose, onFavorite, onDownload, onCopy }: ExpandModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col lg:flex-row overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Image */}
        <div className="lg:w-3/5 relative bg-black flex-shrink-0">
          <img src={image.url} alt={image.promptTitle || 'Generated image'} className="w-full h-full object-contain max-h-[60vh] lg:max-h-[90vh]" referrerPolicy="no-referrer" />
        </div>

        {/* Info panel */}
        <div className="lg:w-2/5 flex flex-col bg-zinc-950 border-t lg:border-t-0 lg:border-l border-zinc-800 overflow-y-auto">
          {/* Header */}
          <div className="p-5 border-b border-zinc-800/80 flex items-start justify-between gap-3 bg-zinc-900/40">
            <div>
              <h3 className="text-sm font-bold text-zinc-200 leading-snug">{image.promptTitle || 'Visual Asset'}</h3>
              <p className="text-[10px] font-mono text-zinc-500 mt-0.5 uppercase tracking-widest">Script-mapped visual asset</p>
            </div>
            <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200 transition-colors flex-shrink-0">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 p-5 space-y-5">
            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              {(image.sourceSentenceIds ?? []).map(id => <SentenceBadge key={id} id={id} />)}
              <SegBadge num={segmentNum} />
              {image.useType && <UseTypeBadge type={image.useType} />}
              {image.recommendedPlacement && <PlacementBadge placement={image.recommendedPlacement} />}
            </div>

            {/* Linked sentences */}
            {sentenceTexts.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Linked Script Lines</h4>
                {sentenceTexts.map(({ id, text }) => (
                  <div key={id} className="flex gap-2.5 items-start">
                    <span className="text-[10px] font-mono font-bold text-blue-400 bg-blue-950/40 px-2 py-1 rounded border border-blue-900/40 flex-shrink-0 mt-0.5">{id}</span>
                    <p className="text-xs text-zinc-300 leading-relaxed italic">"{text}"</p>
                  </div>
                ))}
              </div>
            )}

            {/* Prompt */}
            {promptText && (
              <div className="space-y-2">
                <h4 className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Prompt Used</h4>
                <p className="text-[11px] font-mono text-zinc-400 leading-relaxed bg-zinc-900/50 border border-zinc-800/60 rounded p-3">{promptText}</p>
              </div>
            )}

            {/* Placement context */}
            <div className="space-y-2">
              <h4 className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Video Placement</h4>
              <div className="bg-zinc-900/50 border border-zinc-800/60 rounded p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-zinc-500">Use As</span>
                  {image.useType && <UseTypeBadge type={image.useType} />}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-zinc-500">Place At</span>
                  <span className="text-xs font-mono text-zinc-300">{image.recommendedPlacement || '—'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="p-5 border-t border-zinc-800/80 space-y-2 bg-zinc-900/30">
            <button onClick={() => onFavorite(image.id)}
              className={cn('w-full py-2.5 rounded text-xs font-mono font-bold flex items-center justify-center gap-2 transition-colors border',
                image.isFavorite ? 'bg-red-950/40 text-red-400 border-red-900/50 hover:bg-red-950/60' : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700')}>
              <Heart className={cn('w-3.5 h-3.5', image.isFavorite && 'fill-red-400')} />
              {image.isFavorite ? 'UNFAVORITE' : 'FAVORITE'}
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => onCopy(image.promptId)}
                className="py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs font-mono font-bold transition-colors border border-zinc-700 flex items-center justify-center gap-1.5">
                <Copy className="w-3.5 h-3.5" /> COPY PROMPT
              </button>
              <button onClick={() => onDownload(image)}
                className="py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs font-mono font-bold transition-colors border border-zinc-700 flex items-center justify-center gap-1.5">
                <Download className="w-3.5 h-3.5" /> DOWNLOAD
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
type ViewMode = 'grid' | 'scriptmap' | 'timeline';

const PLACEMENT_GROUP_LABELS: Record<number, string> = {
  1: 'OPENING',
  2: 'MID VIDEO',
  3: 'END OF SECTION',
  4: 'BETWEEN LINES',
  5: 'TRANSITION',
  6: 'PRE-SEGMENT',
  7: 'OUTRO',
};

export function ImageGallery() {
  const { images, prompts, segments, sentences, toggleImageFavorite } = useAppStore();

  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [expandedImage, setExpandedImage] = useState<GeneratedImage | null>(null);
  const [filterUseType, setFilterUseType] = useState<UseType | 'all'>('all');

  // Fast lookups
  const promptMap = useMemo(() => new Map(prompts.map(p => [p.id, p])), [prompts]);
  const segmentMap = useMemo(() => new Map(segments.map(s => [s.id, s])), [segments]);
  const sentenceMap = useMemo(() => new Map(sentences.map(s => [s.id, s])), [sentences]);

  const filtered = useMemo(() =>
    filterUseType === 'all' ? images : images.filter(i => i.useType === filterUseType),
    [images, filterUseType]
  );

  // ── View: Grid (segment-grouped) ──────────────────────────────────────────
  const groupedBySegment = useMemo(() =>
    segments
      .map(seg => ({ segment: seg, imgs: filtered.filter(i => i.segmentId === seg.id) }))
      .filter(g => g.imgs.length > 0),
    [segments, filtered]
  );

  // ── View: Script Map (sentence → prompts → images) ───────────────────────
  const groupedBySentence = useMemo(() =>
    sentences
      .map(s => ({
        sentence: s,
        groups: prompts
          .filter(p => (p.sourceSentenceIds ?? []).includes(s.id))
          .map(p => ({ prompt: p, imgs: filtered.filter(i => i.promptId === p.id) }))
          .filter(g => g.imgs.length > 0),
      }))
      .filter(g => g.groups.length > 0),
    [sentences, prompts, filtered]
  );

  // ── View: Timeline (placement-ordered) ───────────────────────────────────
  const timelineGroups = useMemo(() => {
    const sorted = [...filtered].sort((a, b) => {
      const ao = PLACEMENT_ORDER[a.recommendedPlacement] ?? 99;
      const bo = PLACEMENT_ORDER[b.recommendedPlacement] ?? 99;
      if (ao !== bo) return ao - bo;
      return (segmentMap.get(a.segmentId)?.segmentNumber ?? 99) - (segmentMap.get(b.segmentId)?.segmentNumber ?? 99);
    });
    const groups: { placement: string; order: number; imgs: GeneratedImage[] }[] = [];
    for (const img of sorted) {
      const placement = img.recommendedPlacement || 'Mid Sentence';
      const order = PLACEMENT_ORDER[placement] ?? 99;
      let group = groups.find(g => g.placement === placement);
      if (!group) { group = { placement, order, imgs: [] }; groups.push(group); }
      group.imgs.push(img);
    }
    return groups.sort((a, b) => a.order - b.order);
  }, [filtered, segmentMap]);

  // ── Helper actions ─────────────────────────────────────────────────────
  const handleCopyPrompt = useCallback((promptId: string) => {
    const p = promptMap.get(promptId);
    if (p) navigator.clipboard.writeText(p.promptText).catch(() => {});
  }, [promptMap]);

  const handleDownload = useCallback(async (image: GeneratedImage) => {
    try {
      const response = await fetch(image.url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `autovisual-${image.id}.jpg`;
      document.body.appendChild(a); a.click();
      URL.revokeObjectURL(url); document.body.removeChild(a);
    } catch { /* silently fail */ }
  }, []);

  const favoriteCount = images.filter(i => i.isFavorite).length;

  // ── Empty state ───────────────────────────────────────────────────────────
  if (images.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 bg-zinc-950/50 min-w-[400px] relative">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9IiMzZjNmNDYiLz48L3N2Zz4=')] opacity-[0.03]"></div>
        <div className="w-16 h-16 rounded-full bg-zinc-900/80 flex items-center justify-center mb-4 border border-zinc-800 shadow-inner z-10">
          <Monitor className="w-8 h-8 text-zinc-600" />
        </div>
        <h3 className="text-sm font-mono tracking-widest text-zinc-400 mb-2 uppercase z-10">Visual Output Locked</h3>
        <p className="text-xs text-center max-w-xs text-zinc-600 z-10">Awaiting prompt execution. Render images from the prompt engine to unlock this module.</p>
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <>
      <div className="flex-1 flex h-full overflow-hidden">
        {/* ── Center Workspace ─────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col bg-zinc-950 relative overflow-hidden">
          {/* Header */}
          <div className="p-5 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-950/80 backdrop-blur-sm z-10 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                <Monitor className="w-4 h-4 text-zinc-400" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-zinc-200 tracking-wide">VISUAL TIMELINE</h2>
                <p className="text-[10px] font-mono text-zinc-500 tracking-widest uppercase">
                  {filtered.length} assets · mapped to script sentences
                </p>
              </div>
            </div>

            {/* View mode tabs */}
            <div className="flex items-center gap-1 bg-zinc-900/50 border border-zinc-800/50 rounded p-1">
              {([
                { id: 'grid', icon: Film, label: 'GRID' },
                { id: 'scriptmap', icon: AlignLeft, label: 'SCRIPT MAP' },
                { id: 'timeline', icon: Clock, label: 'TIMELINE' },
              ] as const).map(({ id, icon: Icon, label }) => (
                <button key={id} onClick={() => setViewMode(id)}
                  className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-mono font-bold tracking-widest transition-all',
                    viewMode === id ? 'bg-zinc-800 text-zinc-200 border border-zinc-600' : 'text-zinc-500 hover:text-zinc-300')}>
                  <Icon className="w-3 h-3" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto p-6 hide-scrollbar bg-zinc-950/30">

            {/* ─── GRID VIEW ─── */}
            {viewMode === 'grid' && (
              <div className="space-y-10">
                {groupedBySegment.map(({ segment, imgs }) => (
                  <div key={segment.id} className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-3">
                      <span className="text-[11px] font-mono font-bold text-red-400 bg-red-950/30 px-2 py-1 rounded border border-red-900/30">
                        SEG {String(segment.segmentNumber).padStart(2, '0')}
                      </span>
                      {(segment.sentenceIds?.length ?? 0) > 0 && (
                        <span className="text-[11px] font-mono text-blue-400 bg-blue-950/30 px-2 py-1 rounded border border-blue-900/30">
                          {segment.sentenceIds.join(', ')}
                        </span>
                      )}
                      <span className="text-[11px] font-mono text-zinc-400 truncate">{segment.visualIntent}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                      {imgs.map(img => (
                        <ImageCard key={img.id} image={img} segmentNum={segment.segmentNumber}
                          firstSentenceText={sentenceMap.get(img.sourceSentenceIds?.[0] ?? '')?.text}
                          onExpand={setExpandedImage} onFavorite={toggleImageFavorite}
                          onCopy={handleCopyPrompt} onDownload={handleDownload} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ─── SCRIPT MAP VIEW ─── */}
            {viewMode === 'scriptmap' && (
              <div className="space-y-8">
                {groupedBySentence.length === 0 ? (
                  <div className="text-center text-zinc-600 text-sm font-mono py-16">
                    No sentence mapping data. Re-analyze your script in AI mode to generate mapped visuals.
                  </div>
                ) : (
                  groupedBySentence.map(({ sentence, groups }) => (
                    <div key={sentence.id} className="space-y-3">
                      {/* Sentence header */}
                      <div className="flex gap-3 items-start">
                        <span className="text-[11px] font-mono font-bold text-blue-400 bg-blue-950/40 border border-blue-900/50 px-2 py-1 rounded flex-shrink-0 mt-0.5">
                          {sentence.id}
                        </span>
                        <p className="text-sm text-zinc-300 italic leading-relaxed border-l-2 border-blue-900/40 pl-3 py-0.5">
                          "{sentence.text}"
                        </p>
                      </div>
                      {/* Prompts + images under this sentence */}
                      <div className="pl-10 space-y-3">
                        {groups.map(({ prompt, imgs }) => (
                          <div key={prompt.id} className="space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-zinc-700 flex-shrink-0" />
                              <span className="text-[11px] font-mono text-zinc-300 font-medium">{prompt.title}</span>
                              <UseTypeBadge type={prompt.useType} tiny />
                              {prompt.recommendedPlacement && <PlacementBadge placement={prompt.recommendedPlacement} />}
                            </div>
                            <div className="pl-4 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                              {imgs.map(img => (
                                <ImageCard key={img.id} image={img}
                                  segmentNum={segmentMap.get(img.segmentId)?.segmentNumber}
                                  firstSentenceText={sentenceMap.get(img.sourceSentenceIds?.[0] ?? '')?.text}
                                  onExpand={setExpandedImage} onFavorite={toggleImageFavorite}
                                  onCopy={handleCopyPrompt} onDownload={handleDownload} />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ─── TIMELINE VIEW ─── */}
            {viewMode === 'timeline' && (
              <div className="space-y-10">
                {timelineGroups.length === 0 ? (
                  <div className="text-center text-zinc-600 text-sm font-mono py-16">No timeline data available.</div>
                ) : (
                  timelineGroups.map(({ placement, order, imgs }) => (
                    <div key={placement} className="space-y-4">
                      {/* Timeline section header */}
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                            <span className="text-[8px] font-mono font-black text-zinc-400">{order}</span>
                          </div>
                          <h3 className="text-[11px] font-mono font-black text-zinc-300 tracking-widest uppercase">
                            {PLACEMENT_GROUP_LABELS[order] ?? placement.toUpperCase()}
                          </h3>
                        </div>
                        <div className="flex-1 h-px bg-zinc-800/80" />
                        <span className="text-[10px] font-mono text-zinc-600">{placement}</span>
                      </div>

                      {/* Horizontal strip of image cards */}
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                        {imgs.map(img => {
                          const seg = segmentMap.get(img.segmentId);
                          return (
                            <div key={img.id} className="flex flex-col gap-0 bg-zinc-900/30 border border-zinc-800/60 rounded-lg overflow-hidden hover:border-zinc-700 transition-colors cursor-pointer group"
                              onClick={() => setExpandedImage(img)}>
                              {/* Sentence + segment info strip */}
                              <div className="px-3 py-2 border-b border-zinc-800/60 flex items-center gap-2 flex-wrap">
                                {(img.sourceSentenceIds ?? []).slice(0, 3).map(id => <SentenceBadge key={id} id={id} />)}
                                {seg && <SegBadge num={seg.segmentNumber} />}
                                <UseTypeBadge type={img.useType} tiny />
                              </div>
                              <ImageCard image={img} segmentNum={seg?.segmentNumber}
                                firstSentenceText={sentenceMap.get(img.sourceSentenceIds?.[0] ?? '')?.text}
                                onExpand={setExpandedImage} onFavorite={toggleImageFavorite}
                                onCopy={handleCopyPrompt} onDownload={handleDownload} />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

          </div>
        </div>

        {/* ── Right Inspector ─────────────────────────────────────────────── */}
        <div className="w-72 flex-shrink-0 border-l border-zinc-800/80 bg-zinc-950 flex flex-col h-full relative z-20 shadow-[-4px_0_24px_rgba(0,0,0,0.2)]">
          <div className="p-5 border-b border-zinc-800/80 flex items-center gap-2 bg-zinc-900/30">
            <Settings2 className="w-4 h-4 text-zinc-500" />
            <h2 className="text-[11px] font-mono font-bold tracking-widest text-zinc-300 uppercase">Visual Inspector</h2>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-6 hide-scrollbar">
            {/* Stats */}
            <div className="bg-zinc-900/50 border border-zinc-800/80 rounded p-4 space-y-3">
              <div><div className="text-[10px] font-mono text-zinc-500 uppercase mb-1">Total Assets</div><div className="text-2xl font-mono text-zinc-200">{images.length}</div></div>
              <div className="pt-3 border-t border-zinc-800/50">
                <div className="text-[10px] font-mono text-zinc-500 uppercase mb-1">Favorited</div>
                <div className="text-2xl font-mono text-red-400 font-bold flex items-center gap-2">{favoriteCount}<Heart className="w-4 h-4 fill-red-400" /></div>
              </div>
              <div className="pt-3 border-t border-zinc-800/50">
                <div className="text-[10px] font-mono text-zinc-500 uppercase mb-1">Script Sentences</div>
                <div className="text-2xl font-mono text-blue-400 font-bold">{sentences.length}</div>
              </div>
            </div>

            {/* Filter by use type */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Filter className="w-3 h-3 text-zinc-500" />
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Filter by Use Type</span>
              </div>
              <div className="space-y-1.5">
                <button onClick={() => setFilterUseType('all')}
                  className={cn('w-full text-left px-3 py-2 rounded text-[10px] font-mono font-bold transition-colors border',
                    filterUseType === 'all' ? 'bg-zinc-800 text-zinc-200 border-zinc-600' : 'text-zinc-500 border-zinc-800/50 hover:bg-zinc-800/50 hover:text-zinc-300')}>
                  ALL TYPES
                </button>
                {(['Hook', 'Main Visual', 'Support Visual', 'Detail Shot', 'Comparison Visual', 'Transition Shot', 'Outro Visual'] as UseType[]).map(type => {
                  const style = USE_STYLE[type];
                  const count = images.filter(i => i.useType === type).length;
                  if (count === 0) return null;
                  return (
                    <button key={type} onClick={() => setFilterUseType(type)}
                      className={cn('w-full text-left px-3 py-1.5 rounded text-[10px] font-mono transition-colors border flex items-center justify-between',
                        filterUseType === type ? `${style.pill} font-bold` : 'text-zinc-500 border-zinc-800/50 hover:bg-zinc-800/50 hover:text-zinc-300')}>
                      <span>{type.toUpperCase()}</span>
                      <span className="text-zinc-600">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Export */}
            <div className="bg-zinc-900/30 border border-zinc-800/50 rounded p-4 space-y-2">
              <h3 className="text-[10px] font-mono text-zinc-500 uppercase mb-2">Export</h3>
              <button className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-xs font-mono font-bold transition-colors border border-zinc-700 flex items-center justify-center gap-2">
                <Download className="w-3.5 h-3.5" /> DOWNLOAD ALL
              </button>
              <button className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-xs font-mono font-bold transition-colors border border-zinc-700 flex items-center justify-center gap-2">
                <Heart className="w-3.5 h-3.5" /> DOWNLOAD FAVORITES
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Expand modal ────────────────────────────────────────────────────── */}
      {expandedImage && (() => {
        const prompt = promptMap.get(expandedImage.promptId);
        const seg = segmentMap.get(expandedImage.segmentId);
        const sentenceTexts = (expandedImage.sourceSentenceIds ?? [])
          .map(id => sentenceMap.get(id))
          .filter((s): s is NonNullable<typeof s> => !!s)
          .map(s => ({ id: s.id, text: s.text }));

        return (
          <ExpandModal
            image={expandedImage}
            promptText={prompt?.promptText}
            segmentNum={seg?.segmentNumber}
            sentenceTexts={sentenceTexts}
            onClose={() => setExpandedImage(null)}
            onFavorite={(id) => { toggleImageFavorite(id); setExpandedImage(prev => prev ? { ...prev, isFavorite: !prev.isFavorite } : null); }}
            onDownload={handleDownload}
            onCopy={handleCopyPrompt}
          />
        );
      })()}
    </>
  );
}
