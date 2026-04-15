import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { generatePromptsForSegment } from '../services/aiProvider';
import { generateFallbackPromptsForSegment } from '../services/fallbackPromptGenerator';
import { formatSentenceRange } from '../services/scriptParser';
import { Film, Camera, Loader2, Zap, Target, MapPin, Activity, Crosshair, Image as ImageIcon, Settings2, AlertTriangle } from 'lucide-react';
import { ScriptSegment } from '../types';

export function SceneBreakdown() {
  const { 
    segments,
    sentences,
    settings, 
    updateSettings,
    isGeneratingPrompts, 
    setIsGeneratingPrompts,
    prompts,
    setPrompts,
    saveProject
  } = useAppStore();

  const [fallbackMessage, setFallbackMessage] = useState<string | null>(null);

  const handleGeneratePrompts = async (segment: ScriptSegment) => {
    setIsGeneratingPrompts(true);
    setFallbackMessage(null);
    try {
      if (settings.promptMode === 'fallback') {
        const newPrompts = generateFallbackPromptsForSegment(segment, settings);
        setPrompts([...prompts.filter(p => p.segmentId !== segment.id), ...newPrompts]);
        saveProject();
      } else {
        try {
          const newPrompts = await generatePromptsForSegment(segment, settings, sentences);
          setPrompts([...prompts.filter(p => p.segmentId !== segment.id), ...newPrompts]);
          saveProject();
        } catch (error) {
          console.error("AI Prompt generation failed, falling back:", error);
          setFallbackMessage("AI quota exceeded. Switched to Fast Fallback Mode.");
          updateSettings({ promptMode: 'fallback' });
          const newPrompts = generateFallbackPromptsForSegment(segment, settings);
          setPrompts([...prompts.filter(p => p.segmentId !== segment.id), ...newPrompts]);
          saveProject();
        }
      }
    } catch (error) {
      console.error("Failed to generate prompts:", error);
      alert("Failed to generate prompts.");
    } finally {
      setIsGeneratingPrompts(false);
    }
  };

  const handleGenerateAllPrompts = async () => {
    if (segments.length === 0) return;
    setIsGeneratingPrompts(true);
    setFallbackMessage(null);
    try {
      let allNewPrompts = [];
      let currentMode = settings.promptMode;
      
      for (const segment of segments) {
        if (currentMode === 'fallback') {
          const newPrompts = generateFallbackPromptsForSegment(segment, settings);
          allNewPrompts.push(...newPrompts);
        } else {
          try {
            const newPrompts = await generatePromptsForSegment(segment, settings, sentences);
            allNewPrompts.push(...newPrompts);
          } catch (error) {
            console.error("AI Prompt generation failed, falling back:", error);
            setFallbackMessage("AI quota exceeded. Switched to Fast Fallback Mode.");
            updateSettings({ promptMode: 'fallback' });
            currentMode = 'fallback'; // Switch mode for remaining segments
            const newPrompts = generateFallbackPromptsForSegment(segment, settings);
            allNewPrompts.push(...newPrompts);
          }
        }
      }
      setPrompts(allNewPrompts);
      saveProject();
    } catch (error) {
      console.error("Failed to generate all prompts:", error);
      alert("Failed to generate some prompts.");
    } finally {
      setIsGeneratingPrompts(false);
    }
  };

  const handleGenerateWithoutAI = async () => {
    updateSettings({ promptMode: 'fallback' });
    if (segments.length === 0) return;
    setIsGeneratingPrompts(true);
    setFallbackMessage(null);
    try {
      let allNewPrompts = [];
      for (const segment of segments) {
        const newPrompts = generateFallbackPromptsForSegment(segment, { ...settings, promptMode: 'fallback' });
        allNewPrompts.push(...newPrompts);
      }
      setPrompts(allNewPrompts);
      saveProject();
    } catch (error) {
      console.error("Failed to generate fallback prompts:", error);
    } finally {
      setIsGeneratingPrompts(false);
    }
  };

  if (segments.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 bg-zinc-950/50 min-w-[400px] relative">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9IiMzZjNmNDYiLz48L3N2Zz4=')] opacity-[0.03]"></div>
        <div className="w-16 h-16 rounded-full bg-zinc-900/80 flex items-center justify-center mb-4 border border-zinc-800 shadow-inner z-10">
          <Film className="w-8 h-8 text-zinc-600" />
        </div>
        <h3 className="text-sm font-mono tracking-widest text-zinc-400 mb-2 uppercase z-10">Scene Direction Locked</h3>
        <p className="text-xs text-center max-w-xs text-zinc-600 z-10">
          Awaiting script intake. Generate a scene plan to unlock this module.
        </p>
      </div>
    );
  }

  const totalEstimatedImages = segments.reduce((acc, seg) => acc + seg.estimatedImagesNeeded, 0);
  const totalPromptsReady = prompts.length;

  return (
    <div className="flex-1 flex h-full overflow-hidden">
      {/* Center Workspace: Scene Blocks */}
      <div className="flex-1 flex flex-col bg-zinc-950 relative">
        <div className="p-6 border-b border-zinc-800/80 flex items-center gap-3 bg-zinc-950/80 backdrop-blur-sm z-10">
          <div className="w-8 h-8 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            <Film className="w-4 h-4 text-zinc-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-zinc-200 tracking-wide">DIRECTOR'S SCENE BLOCKS</h2>
            <p className="text-[10px] font-mono text-zinc-500 tracking-widest uppercase">Review and adjust the visual breakdown</p>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6 hide-scrollbar bg-zinc-950/30">
          {fallbackMessage && (
            <div className="bg-amber-950/40 border border-amber-900/50 rounded-md p-4 flex items-start gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-amber-400">Fallback Mode Active</h4>
                <p className="text-xs text-amber-500/80 mt-1">{fallbackMessage}</p>
              </div>
            </div>
          )}

          {segments.map((segment) => {
            const segmentPrompts = prompts.filter(p => p.segmentId === segment.id);
            const hasPrompts = segmentPrompts.length > 0;

            return (
              <div key={segment.id} className="bg-zinc-900/40 border border-zinc-800/80 rounded-md overflow-hidden hover:border-zinc-700 transition-colors group shadow-sm">
                <div className="bg-zinc-900/80 px-4 py-3 border-b border-zinc-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-mono font-bold text-red-400 bg-red-950/30 px-2 py-1 rounded border border-red-900/30">
                      SEG {String(segment.segmentNumber).padStart(2, '0')}
                    </span>
                    {segment.sentenceIds && segment.sentenceIds.length > 0 && (
                      <span className="text-[11px] font-mono text-blue-400 bg-blue-950/30 px-2 py-1 rounded border border-blue-900/30">
                        {formatSentenceRange(segment.sentenceIds)}
                      </span>
                    )}
                    <span className="text-sm font-medium text-zinc-200 flex items-center gap-2">
                      <Camera className="w-4 h-4 text-zinc-500" />
                      {segment.recommendedShotType}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5" title={`Emotional Intensity: ${segment.emotionalIntensity}/10`}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div 
                        key={i} 
                        className={`h-1.5 w-4 rounded-sm ${i < Math.ceil(segment.emotionalIntensity / 2) ? 'bg-red-500' : 'bg-zinc-800'}`}
                      />
                    ))}
                  </div>
                </div>
                
                <div className="p-5">
                  <p className="text-sm text-zinc-400 italic border-l-2 border-zinc-700 pl-4 py-1 mb-5 font-serif leading-relaxed">
                    "{segment.excerpt}"
                  </p>
                  
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 bg-zinc-950/50 p-4 rounded border border-zinc-800/50">
                    <div>
                      <span className="text-[10px] font-mono text-zinc-600 uppercase flex items-center gap-1.5 mb-1.5">
                        <Target className="w-3.5 h-3.5" /> Intent
                      </span>
                      <span className="text-xs text-zinc-300 leading-tight block">{segment.visualIntent}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-zinc-600 uppercase flex items-center gap-1.5 mb-1.5">
                        <Crosshair className="w-3.5 h-3.5" /> Focus
                      </span>
                      <span className="text-xs text-zinc-300 leading-tight block">{segment.vehicleFocus}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-zinc-600 uppercase flex items-center gap-1.5 mb-1.5">
                        <MapPin className="w-3.5 h-3.5" /> Location
                      </span>
                      <span className="text-xs text-zinc-300 leading-tight block">{segment.locationEnvironment}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-zinc-600 uppercase flex items-center gap-1.5 mb-1.5">
                        <Activity className="w-3.5 h-3.5" /> Motion
                      </span>
                      <span className="text-xs text-zinc-300 leading-tight block">{segment.motionIntensity}</span>
                    </div>
                  </div>
                  
                  <div className="mt-5 pt-4 border-t border-zinc-800/50 flex items-center justify-between">
                    <div className="text-[11px] font-mono text-zinc-400">
                      <span className="text-zinc-500">PURPOSE:</span> {segment.purposeInVideo}
                    </div>
                    <div className={`text-[10px] font-mono font-bold px-2 py-1 rounded ${
                      segment.hookValue === 'High' ? 'bg-red-950/50 text-red-400 border border-red-900/50' : 
                      segment.hookValue === 'Medium' ? 'bg-amber-950/30 text-amber-500 border border-amber-900/30' : 
                      'bg-zinc-900 text-zinc-500 border border-zinc-800'
                    }`}>
                      {segment.hookValue.toUpperCase()} HOOK
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-zinc-900/80 border-t border-zinc-800/80 flex justify-between items-center">
                  <div className="text-[11px] font-mono text-zinc-400 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-zinc-500" />
                    ~{segment.estimatedImagesNeeded} IMAGES NEEDED
                    {hasPrompts && (
                      <span className="text-green-500 ml-2 bg-green-950/30 px-2 py-0.5 rounded border border-green-900/30">
                        {segmentPrompts.length} READY
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleGeneratePrompts(segment)}
                    disabled={isGeneratingPrompts}
                    className="text-[10px] font-mono font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-4 py-2 rounded transition-colors disabled:opacity-50 flex items-center gap-2 border border-zinc-700"
                  >
                    {isGeneratingPrompts ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 text-zinc-400" />}
                    {hasPrompts ? 'REGENERATE PROMPTS' : 'GENERATE PROMPTS'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Inspector: Scene Settings */}
      <div className="w-80 flex-shrink-0 border-l border-zinc-800/80 bg-zinc-950 flex flex-col h-full relative z-20 shadow-[-4px_0_24px_rgba(0,0,0,0.2)]">
        <div className="p-5 border-b border-zinc-800/80 flex items-center gap-2 bg-zinc-900/30">
          <Settings2 className="w-4 h-4 text-zinc-500" />
          <h2 className="text-[11px] font-mono font-bold tracking-widest text-zinc-300 uppercase">Scene Inspector</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6 hide-scrollbar">
          <div className="bg-zinc-900/50 border border-zinc-800/80 rounded p-4 space-y-4">
            <div>
              <div className="text-[10px] font-mono text-zinc-500 uppercase mb-1">Total Segments</div>
              <div className="text-2xl font-mono text-zinc-200">{segments.length}</div>
            </div>
            <div className="pt-3 border-t border-zinc-800/50">
              <div className="text-[10px] font-mono text-zinc-500 uppercase mb-1">Est. Images Needed</div>
              <div className="text-2xl font-mono text-zinc-200">{totalEstimatedImages}</div>
            </div>
            <div className="pt-3 border-t border-zinc-800/50">
              <div className="text-[10px] font-mono text-zinc-500 uppercase mb-1">Prompts Ready</div>
              <div className="text-2xl font-mono text-zinc-200">{totalPromptsReady}</div>
            </div>
          </div>
          
          <div className="space-y-3">
            <h3 className="text-[10px] font-mono text-zinc-500 uppercase">Prompt Engine Mode</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => updateSettings({ promptMode: 'ai' })}
                className={`py-2 px-3 rounded text-xs font-mono font-bold transition-colors border ${
                  settings.promptMode === 'ai' 
                    ? 'bg-zinc-800 text-zinc-200 border-zinc-600' 
                    : 'bg-zinc-900/50 text-zinc-500 border-zinc-800 hover:bg-zinc-800/50'
                }`}
              >
                AI MODE
              </button>
              <button
                onClick={() => updateSettings({ promptMode: 'fallback' })}
                className={`py-2 px-3 rounded text-xs font-mono font-bold transition-colors border ${
                  settings.promptMode === 'fallback' 
                    ? 'bg-zinc-800 text-zinc-200 border-zinc-600' 
                    : 'bg-zinc-900/50 text-zinc-500 border-zinc-800 hover:bg-zinc-800/50'
                }`}
              >
                FAST FALLBACK
              </button>
            </div>
            <p className="text-[10px] text-zinc-500 leading-relaxed">
              {settings.promptMode === 'ai' 
                ? 'Uses LongCat AI to generate contextual prompts with sentence-level visual mapping.' 
                : 'Uses deterministic rule-based logic for instant, reliable prompt generation without API quota limits.'}
            </p>
          </div>
        </div>

        <div className="p-5 border-t border-zinc-800/80 bg-zinc-900/50 space-y-3">
          <button
            onClick={handleGenerateAllPrompts}
            disabled={isGeneratingPrompts}
            className="w-full py-3.5 bg-red-600 hover:bg-red-500 text-white rounded font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:hover:bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.2)] hover:shadow-[0_0_20px_rgba(220,38,38,0.4)]"
          >
            {isGeneratingPrompts ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-xs tracking-widest uppercase">GENERATING...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                <span className="text-xs tracking-widest uppercase">GENERATE ALL PROMPTS</span>
              </>
            )}
          </button>
          
          <button
            onClick={handleGenerateWithoutAI}
            disabled={isGeneratingPrompts}
            className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs font-mono font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 border border-zinc-700"
          >
            GENERATE WITHOUT AI
          </button>
        </div>
      </div>
    </div>
  );
}
