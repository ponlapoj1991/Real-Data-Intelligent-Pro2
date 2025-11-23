
import React, { useState, useEffect } from 'react';
import Landing from './views/Landing';
import Sidebar from './components/Sidebar';
import DataIngest from './views/DataIngest';
import DataPrep from './views/DataPrep';
import Analytics from './views/Analytics';
import ReportBuilder from './views/ReportBuilder';
import AiAgent from './views/AiAgent';
import Settings from './views/Settings';
import { Project, AppView, ProjectTab } from './types';
import { saveLastState } from './utils/storage';
import { ToastProvider } from './components/ToastProvider';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.LANDING);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<ProjectTab>(ProjectTab.UPLOAD);

  // On Load, check for previous state (Optional - keeping simple for now)
  useEffect(() => {
    // We could impl init logic here
  }, []);

  const handleSelectProject = (project: Project) => {
    setCurrentProject(project);
    setCurrentView(AppView.PROJECT);
    setActiveTab(ProjectTab.UPLOAD); // Default start at upload
    saveLastState(project.id, ProjectTab.UPLOAD);
  };

  const handleTabChange = (tab: ProjectTab) => {
    setActiveTab(tab);
    if (currentProject) {
        saveLastState(currentProject.id, tab);
    }
  };

  const handleBackToLanding = () => {
    setCurrentView(AppView.LANDING);
    setCurrentProject(null);
    saveLastState('', ProjectTab.UPLOAD); // Clear state
  };

  const updateProject = (updated: Project) => {
      setCurrentProject(updated);
  };

  // Render Logic
  if (currentView === AppView.LANDING) {
    return <Landing onSelectProject={handleSelectProject} />;
  }

  if (currentView === AppView.PROJECT && currentProject) {
    return (
      <ToastProvider>
        <div className="flex h-screen overflow-hidden bg-gray-50 font-sans text-gray-900">
          <Sidebar 
              activeTab={activeTab} 
              onTabChange={handleTabChange} 
              onBackToLanding={handleBackToLanding}
              projectName={currentProject.name}
          />
          
          <div className="flex-1 flex flex-col overflow-hidden">
              {/* Top Bar */}
              <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-8 shadow-sm flex-shrink-0 z-10">
                  <span className="text-sm text-gray-500 font-medium">
                      {activeTab === ProjectTab.UPLOAD && 'Step 1: Ingestion'}
                      {activeTab === ProjectTab.PREP && 'Step 2: Processing'}
                      {activeTab === ProjectTab.VISUALIZE && 'Step 3: Analysis'}
                      {activeTab === ProjectTab.AI_AGENT && 'Step 4: AI Enrichment'}
                      {activeTab === ProjectTab.REPORT && 'Step 5: Presentation Builder'}
                      {activeTab === ProjectTab.SETTINGS && 'Configuration'}
                  </span>
                  <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                      <span className="text-xs text-gray-400">Auto-saved (IndexedDB)</span>
                  </div>
              </header>

              <main className="flex-1 overflow-hidden relative">
                  {activeTab === ProjectTab.UPLOAD && (
                      <div className="h-full overflow-y-auto">
                          <DataIngest 
                              project={currentProject} 
                              onUpdateProject={updateProject} 
                              onNext={() => handleTabChange(ProjectTab.PREP)}
                          />
                      </div>
                  )}
                  {activeTab === ProjectTab.PREP && (
                      <DataPrep 
                          project={currentProject}
                          onUpdateProject={updateProject}
                      />
                  )}
                  {activeTab === ProjectTab.VISUALIZE && (
                      <Analytics project={currentProject} onUpdateProject={updateProject} />
                  )}
                  {activeTab === ProjectTab.AI_AGENT && (
                      <AiAgent project={currentProject} onUpdateProject={updateProject} />
                  )}
                  {activeTab === ProjectTab.REPORT && (
                      <ReportBuilder project={currentProject} onUpdateProject={updateProject} />
                  )}
                  {activeTab === ProjectTab.SETTINGS && (
                      <Settings project={currentProject} onUpdateProject={updateProject} />
                  )}
              </main>
          </div>
        </div>
      </ToastProvider>
    );
  }

  return <div>Loading...</div>;
};

export default App;
