import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { FolderOpen, Plus, Database } from 'lucide-react';
import { cn } from '../lib/utils';

export function ProjectSidebar() {
  const { projects, currentProjectId, loadProject, createNewProject } = useAppStore();

  return (
    <div className="w-16 border-r border-zinc-800/80 bg-zinc-950 flex flex-col items-center h-full shrink-0 relative z-20 shadow-[4px_0_24px_rgba(0,0,0,0.3)] py-4">
      <button
        onClick={createNewProject}
        className="w-10 h-10 flex items-center justify-center bg-zinc-100 hover:bg-white text-zinc-900 rounded-md transition-colors shadow-sm mb-6"
        title="New Project"
      >
        <Plus className="w-5 h-5" />
      </button>
      
      <div className="w-full flex flex-col items-center gap-3 overflow-y-auto hide-scrollbar">
        <div className="w-10 h-[1px] bg-zinc-800/80 mb-2"></div>
        
        {projects.sort((a, b) => b.updatedAt - a.updatedAt).map(project => (
          <button
            key={project.id}
            onClick={() => loadProject(project.id)}
            title={project.settings.title || 'Untitled Project'}
            className={cn(
              "w-10 h-10 flex items-center justify-center rounded-md transition-all group border",
              currentProjectId === project.id 
                ? "bg-zinc-900 border-zinc-700 text-red-500 shadow-sm" 
                : "bg-transparent border-transparent text-zinc-500 hover:bg-zinc-900/50 hover:border-zinc-800 hover:text-zinc-300"
            )}
          >
            <FolderOpen className="w-4 h-4" />
          </button>
        ))}
      </div>
    </div>
  );
}
