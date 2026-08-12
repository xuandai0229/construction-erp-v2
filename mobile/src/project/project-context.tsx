import React, { createContext, useContext, useState, useCallback } from 'react';
import { Project } from './project-types';

interface ProjectContextType {
  selectedProjectId: string | null;
  selectedProject: Project | null;
  selectProject: (project: Project) => void;
  clearProject: () => void;
}

const ProjectContext = createContext<ProjectContextType | null>(null);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const selectProject = useCallback((project: Project) => {
    setSelectedProject(project);
  }, []);

  const clearProject = useCallback(() => {
    setSelectedProject(null);
  }, []);

  return (
    <ProjectContext.Provider
      value={{
        selectedProjectId: selectedProject?.id || null,
        selectedProject,
        selectProject,
        clearProject,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return ctx;
}
