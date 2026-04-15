import React, { useState } from 'react';
import { Car, Settings, Save, ChevronRight, CheckCircle2, Circle, Activity, Wifi, WifiOff, Loader2, X } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { cn } from '../lib/utils';
import { testConnection, type ConnectionTestResult } from '../services/aiProvider';

export function Header() {
  const { saveProject, settings, segments, prompts, images, currentStep, setStep } = useAppStore();

  const [sysOpen, setSysOpen] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);

  const steps = [
    { id: 1, name: 'SCRIPT INTAKE', active: currentStep === 1, completed: currentStep > 1, unlocked: true },
    { id: 2, name: 'SCENE DIRECTION', active: currentStep === 2, completed: currentStep > 2, unlocked: segments.length > 0 },
    { id: 3, name: 'PROMPT ENGINE', active: currentStep === 3, completed: currentStep > 3, unlocked: prompts.length > 0 },
    { id: 4, name: 'VISUAL OUTPUT', active: currentStep === 4, completed: false, unlocked: images.length > 0 },
  ];

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testConnection();
      setTestResult(result);
    } finally {
      setTesting(false);
    }
  };

  return (
    <>
      <header className="h-14 border-b border-zinc-800/80 bg-zinc-950 flex items-center justify-between px-6 shrink-0 relative z-20">
        <div className="flex items-center gap-3 w-1/4">
          <div className="w-7 h-7 rounded bg-red-600 flex items-center justify-center shadow-[0_0_10px_rgba(220,38,38,0.3)]">
            <Car className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-lg font-bold text-zinc-100 tracking-tight flex items-center gap-2">
            AUTOVISUAL <span className="text-zinc-600 font-mono text-xs font-normal tracking-widest uppercase">Engine v1.0</span>
          </h1>
        </div>
        
        {/* Pipeline Stepper */}
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-1 bg-zinc-900/50 p-1 rounded-md border border-zinc-800/50">
            {steps.map((step, index) => (
              <React.Fragment key={step.id}>
                <button
                  onClick={() => step.unlocked && setStep(step.id)}
                  disabled={!step.unlocked}
                  className={cn(
                    "flex items-center gap-2 text-[10px] font-mono tracking-wider px-3 py-1.5 rounded transition-all duration-300",
                    step.active ? "text-red-400 bg-red-950/30 border border-red-900/30 shadow-[inset_0_0_10px_rgba(220,38,38,0.05)] cursor-default" : 
                    step.completed ? "text-zinc-300 bg-zinc-800/50 hover:bg-zinc-700/50 cursor-pointer" : 
                    step.unlocked ? "text-zinc-400 hover:bg-zinc-800/30 cursor-pointer" :
                    "text-zinc-600 cursor-not-allowed"
                  )}
                >
                  {step.completed ? (
                    <CheckCircle2 className="w-3 h-3 text-zinc-400" />
                  ) : step.active ? (
                    <Activity className="w-3 h-3 text-red-500 animate-pulse" />
                  ) : (
                    <Circle className="w-3 h-3 text-zinc-700" />
                  )}
                  {step.name}
                </button>
                {index < steps.length - 1 && (
                  <ChevronRight className={cn(
                    "w-3 h-3",
                    steps[index + 1].unlocked ? "text-zinc-600" : "text-zinc-800"
                  )} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 w-1/4">
          <div className="text-xs font-mono text-zinc-500 mr-2 truncate max-w-[150px] border-r border-zinc-800 pr-4">
            {settings.title || 'UNTITLED_PROJ'}
          </div>
          <button 
            onClick={saveProject}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-mono tracking-wide text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            SAVE
          </button>
          <button
            id="sys-panel-toggle"
            onClick={() => { setSysOpen(true); setTestResult(null); }}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-mono tracking-wide text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
            SYS
          </button>
        </div>
      </header>

      {/* SYS / Dev Panel overlay */}
      {sysOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setSysOpen(false); }}
        >
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl w-full max-w-md p-0 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/50">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-zinc-500" />
                <span className="text-sm font-mono font-bold text-zinc-200 tracking-widest uppercase">System Panel</span>
              </div>
              <button
                onClick={() => setSysOpen(false)}
                className="text-zinc-500 hover:text-zinc-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* LongCat Connection Test */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">LongCat API</span>
                  <span className="text-[10px] font-mono text-zinc-700">v1.0 · OpenAI-compatible</span>
                </div>

                <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-400 font-mono">Base URL</span>
                    <span className="text-xs text-zinc-500 font-mono truncate max-w-[200px]">api.longcat.chat/openai</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-400 font-mono">Model</span>
                    <span className="text-xs text-zinc-500 font-mono">LongCat-Flash-Chat</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-400 font-mono">Streaming</span>
                    <span className="text-xs text-zinc-500 font-mono">Disabled</span>
                  </div>
                </div>

                <button
                  id="test-longcat-connection"
                  onClick={handleTestConnection}
                  disabled={testing}
                  className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-200 rounded-lg text-xs font-mono font-bold tracking-widest uppercase flex items-center justify-center gap-2 transition-colors border border-zinc-700"
                >
                  {testing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      TESTING CONNECTION...
                    </>
                  ) : (
                    <>
                      <Wifi className="w-3.5 h-3.5" />
                      TEST LONGCAT CONNECTION
                    </>
                  )}
                </button>

                {testResult && (
                  <div
                    className={cn(
                      'border rounded-lg p-4 flex items-start gap-3',
                      testResult.success
                        ? 'bg-green-950/30 border-green-900/50'
                        : 'bg-red-950/30 border-red-900/50'
                    )}
                  >
                    {testResult.success ? (
                      <Wifi className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <WifiOff className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1">
                      <p className={cn('text-xs font-mono font-bold', testResult.success ? 'text-green-400' : 'text-red-400')}>
                        {testResult.success ? 'CONNECTION SUCCESSFUL' : 'CONNECTION FAILED'}
                      </p>
                      <p className="text-[11px] text-zinc-400 leading-relaxed">{testResult.message}</p>
                      <p className="text-[10px] font-mono text-zinc-600">
                        Latency: {testResult.latencyMs}ms · Model: {testResult.model}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Provider info */}
              <div className="text-[10px] font-mono text-zinc-600 border-t border-zinc-800/50 pt-4 space-y-1">
                <p>Active AI Provider: <span className="text-zinc-400">LongCat</span></p>
                <p>Gemini: <span className="text-red-600/80">Removed</span></p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
