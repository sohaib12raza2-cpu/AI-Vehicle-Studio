/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { Header } from './components/Header';
import { ProjectSidebar } from './components/ProjectSidebar';
import { ScriptInputPanel } from './components/ScriptInputPanel';
import { SceneBreakdown } from './components/SceneBreakdown';
import { PromptGallery } from './components/PromptGallery';
import { ImageGallery } from './components/ImageGallery';
import { useAppStore } from './store/useAppStore';

export default function App() {
  const { createNewProject, projects, currentStep } = useAppStore();

  useEffect(() => {
    // Initialize a new project if none exists
    if (projects.length === 0) {
      createNewProject();
    }
  }, [projects.length, createNewProject]);

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-300 overflow-hidden font-sans">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <ProjectSidebar />
        <div className="flex-1 flex overflow-hidden bg-zinc-950">
          {currentStep === 1 && <ScriptInputPanel />}
          {currentStep === 2 && <SceneBreakdown />}
          {currentStep === 3 && <PromptGallery />}
          {currentStep === 4 && <ImageGallery />}
        </div>
      </div>
    </div>
  );
}

