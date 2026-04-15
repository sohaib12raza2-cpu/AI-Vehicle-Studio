import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { analyzeScript } from '../services/aiProvider';
import { parseScriptSentences } from '../services/scriptParser';
import { Settings2, Wand2, Loader2, FileText, AlignLeft, Hash } from 'lucide-react';
import { ContentType, Tone, VisualDensity, ImageStyle, AspectRatio } from '../types';
import { cn } from '../lib/utils';

export function ScriptInputPanel() {
  const {
    script,
    setScript,
    settings,
    updateSettings,
    isAnalyzing,
    setIsAnalyzing,
    setSegments,
    setPrompts,
    setSentences,
    sentences,
    saveProject,
  } = useAppStore();

  const [editorView, setEditorView] = useState<'edit' | 'map'>('edit');

  const handleAnalyze = async () => {
    if (!script.trim()) return;
    setIsAnalyzing(true);
    try {
      // 1. Parse sentences first (synchronous, cheap)
      const parsedSentences = parseScriptSentences(script);
      setSentences(parsedSentences);

      // 2. Analyze script with LLM (pass sentences for mapping)
      const segments = await analyzeScript(script, settings, parsedSentences);
      setSegments(segments);
      setPrompts([]);
      saveProject();
    } catch (error) {
      console.error('Failed to analyze script:', error);
      const msg = error instanceof Error ? error.message : 'Please check your API key and try again.';
      alert(`Failed to analyze script: ${msg}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex-1 flex h-full overflow-hidden">
      {/* Center Workspace: Script Editor */}
      <div className="flex-1 flex flex-col bg-zinc-950 relative">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9IiMzZjNmNDYiLz48L3N2Zz4=')] opacity-[0.02] pointer-events-none"></div>

        <div className="p-6 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-950/80 backdrop-blur-sm z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center">
              <FileText className="w-4 h-4 text-zinc-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-200 tracking-wide">SCRIPT COMMAND CENTER</h2>
              <p className="text-[10px] font-mono text-zinc-500 tracking-widest uppercase">Paste your raw voiceover or script below</p>
            </div>
          </div>

          {/* View toggle — only visible after sentences are parsed */}
          {sentences.length > 0 && (
            <div className="flex items-center gap-1 bg-zinc-900/50 rounded border border-zinc-800/50 p-1">
              <button
                onClick={() => setEditorView('edit')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-mono font-bold tracking-widest uppercase transition-all',
                  editorView === 'edit' ? 'bg-zinc-800 text-zinc-200 border border-zinc-600' : 'text-zinc-500 hover:text-zinc-300'
                )}
              >
                <AlignLeft className="w-3 h-3" />
                EDIT
              </button>
              <button
                onClick={() => setEditorView('map')}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-mono font-bold tracking-widest uppercase transition-all',
                  editorView === 'map' ? 'bg-blue-950/60 text-blue-300 border border-blue-900/50' : 'text-zinc-500 hover:text-zinc-300'
                )}
              >
                <Hash className="w-3 h-3" />
                SENTENCE MAP ({sentences.length})
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 p-6 relative z-10 overflow-hidden flex flex-col">
          {editorView === 'edit' || sentences.length === 0 ? (
            <textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              className="w-full flex-1 bg-zinc-900/30 border border-zinc-800/80 rounded-lg p-6 text-zinc-300 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all resize-none font-mono text-sm leading-relaxed shadow-inner"
              placeholder={`[INTRO]\nThe Porsche 911 GT3 RS isn't just a car. It's a street-legal race car with a license plate.\n\n[SCENE 1]\nLook at this massive rear wing. It generates 860kg of downforce at 285 km/h...\n\n[Paste your full script here...]`}
            />
          ) : (
            /* Sentence Map View */
            <div className="flex-1 overflow-y-auto hide-scrollbar space-y-2 pr-2">
              <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-4">
                Script parsed into {sentences.length} sentence units — each will be mapped to generated visuals
              </p>
              {sentences.map((s) => (
                <div key={s.id} className="flex gap-3 items-start group">
                  <span className="text-[10px] font-mono text-blue-400 bg-blue-950/30 px-2 py-1 rounded border border-blue-900/40 flex-shrink-0 mt-0.5 min-w-[36px] text-center">
                    {s.id}
                  </span>
                  <p className="text-sm text-zinc-300 leading-relaxed border-l border-zinc-800/80 pl-3 py-0.5 group-hover:border-zinc-700 transition-colors">
                    {s.text}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Inspector: Production Settings */}
      <div className="w-80 flex-shrink-0 border-l border-zinc-800/80 bg-zinc-950 flex flex-col h-full relative z-20 shadow-[-4px_0_24px_rgba(0,0,0,0.2)]">
        <div className="p-5 border-b border-zinc-800/80 flex items-center gap-2 bg-zinc-900/30">
          <Settings2 className="w-4 h-4 text-zinc-500" />
          <h2 className="text-[11px] font-mono font-bold tracking-widest text-zinc-300 uppercase">Production Settings</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6 hide-scrollbar">
          <div className="space-y-2">
            <label className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase">Project Title</label>
            <input
              type="text"
              value={settings.title}
              onChange={(e) => updateSettings({ title: e.target.value })}
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded px-3 py-2 text-zinc-200 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all text-sm"
              placeholder="e.g. Porsche 911 GT3 RS Review"
            />
          </div>

          <div className="space-y-4 pt-4 border-t border-zinc-800/50">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-zinc-500 uppercase">Content Type</label>
              <select value={settings.contentType} onChange={(e) => updateSettings({ contentType: e.target.value as ContentType })} className="w-full bg-zinc-900/80 border border-zinc-800 rounded px-2.5 py-2 text-zinc-300 text-xs focus:outline-none focus:border-zinc-600 transition-colors cursor-pointer">
                <option value="car review">Car Review</option>
                <option value="comparison">Comparison</option>
                <option value="history">History</option>
                <option value="facts">Facts</option>
                <option value="top 10">Top 10</option>
                <option value="breaking automotive news">Breaking News</option>
                <option value="luxury showcase">Luxury Showcase</option>
                <option value="performance analysis">Performance Analysis</option>
                <option value="EV explainer">EV Explainer</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-zinc-500 uppercase">Visual Tone</label>
              <select value={settings.tone} onChange={(e) => updateSettings({ tone: e.target.value as Tone })} className="w-full bg-zinc-900/80 border border-zinc-800 rounded px-2.5 py-2 text-zinc-300 text-xs focus:outline-none focus:border-zinc-600 transition-colors cursor-pointer">
                <option value="cinematic">Cinematic</option>
                <option value="aggressive">Aggressive</option>
                <option value="luxury">Luxury</option>
                <option value="documentary">Documentary</option>
                <option value="futuristic">Futuristic</option>
                <option value="high-energy YouTube">High-Energy YouTube</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-zinc-500 uppercase">Visual Density</label>
              <select value={settings.visualDensity} onChange={(e) => updateSettings({ visualDensity: e.target.value as VisualDensity })} className="w-full bg-zinc-900/80 border border-zinc-800 rounded px-2.5 py-2 text-zinc-300 text-xs focus:outline-none focus:border-zinc-600 transition-colors cursor-pointer">
                <option value="low">Low (Economical)</option>
                <option value="medium">Medium (Standard)</option>
                <option value="high">High (Dense)</option>
                <option value="extreme">Extreme (Max Engagement)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-zinc-500 uppercase">Image Style</label>
              <select value={settings.imageStyle} onChange={(e) => updateSettings({ imageStyle: e.target.value as ImageStyle })} className="w-full bg-zinc-900/80 border border-zinc-800 rounded px-2.5 py-2 text-zinc-300 text-xs focus:outline-none focus:border-zinc-600 transition-colors cursor-pointer">
                <option value="photoreal cinematic">Photoreal Cinematic</option>
                <option value="dark moody realism">Dark Moody Realism</option>
                <option value="ultra luxury commercial">Ultra Luxury Commercial</option>
                <option value="futuristic concept realism">Futuristic Concept Realism</option>
                <option value="dramatic editorial">Dramatic Editorial</option>
              </select>
            </div>
          </div>

          <div className="space-y-2 pt-4 border-t border-zinc-800/50">
            <label className="text-[10px] font-mono text-zinc-500 uppercase">Output Format</label>
            <div className="grid grid-cols-3 gap-2">
              {(['16:9', '9:16', '1:1'] as AspectRatio[]).map((ratio) => (
                <button key={ratio} onClick={() => updateSettings({ aspectRatio: ratio })}
                  className={`py-2 rounded border text-xs font-mono transition-all ${settings.aspectRatio === ratio ? 'bg-zinc-800 border-zinc-600 text-zinc-100 shadow-sm' : 'bg-zinc-900/50 border-zinc-800/80 text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300'}`}>
                  {ratio}
                </button>
              ))}
            </div>
          </div>

          {/* Sentence Map Summary */}
          {sentences.length > 0 && (
            <div className="pt-4 border-t border-zinc-800/50 space-y-2">
              <label className="text-[10px] font-mono text-zinc-500 uppercase">Sentence Map</label>
              <div className="bg-blue-950/20 border border-blue-900/30 rounded p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-zinc-500">Detected Sentences</span>
                  <span className="text-sm font-mono font-bold text-blue-400">{sentences.length}</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {sentences.slice(0, 8).map(s => (
                    <span key={s.id} className="text-[9px] font-mono text-blue-400 bg-blue-950/40 px-1.5 py-0.5 rounded border border-blue-900/30">{s.id}</span>
                  ))}
                  {sentences.length > 8 && (
                    <span className="text-[9px] font-mono text-zinc-600">+{sentences.length - 8} more</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-5 border-t border-zinc-800/80 bg-zinc-900/50">
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || !script.trim()}
            className="w-full py-3.5 bg-red-600 hover:bg-red-500 text-white rounded font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:hover:bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.2)] hover:shadow-[0_0_20px_rgba(220,38,38,0.4)]"
          >
            {isAnalyzing ? (
              <><Loader2 className="w-4 h-4 animate-spin" /><span className="text-xs tracking-widest uppercase">ANALYZING SCRIPT...</span></>
            ) : (
              <><Wand2 className="w-4 h-4" /><span className="text-xs tracking-widest uppercase">ANALYZE SCRIPT</span></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
