import React, { useRef, useEffect, useMemo, useState } from 'react';
import CodeEditor, { type CodeEditorHandle } from '@/components/CodeEditor';
import ChatPanel from '@/components/ChatPanel';
import LiveControls from '@/components/LiveControls';
import AvatarInterviewer, { type AvatarInterviewerHandle } from '@/components/AvatarInterviewer';
import { useTheme } from '@/hooks/useTheme';
import { useLiveInterview } from '@/hooks/useLiveInterview';
import { useInterviewSession } from '@/hooks/useInterviewSession';
import { RefreshCw, Zap } from 'lucide-react';
import { PROBLEMS } from '@/constants';
import DashboardView from '@/components/DashboardView';

const API_KEY = (import.meta as any).env.VITE_API_KEY || '';

const GUEST_USER = {
  email: 'guest@devinterview.local',
  xp: 0,
  problemsSolved: 0,
  mockInterviews: 0,
  successRate: 0,
  languages: { python: 0, typescript: 0, c: 0, cpp: 0, java: 0 },
  activities: [],
};

/**
 * Root application component.
 * Composes the code editor, chat transcript, and live interview controls
 * into a single-page interview workspace.
 */
const App: React.FC = () => {
  const editorRef = useRef<CodeEditorHandle>(null);
  const avatarRef = useRef<AvatarInterviewerHandle>(null);
  const { theme, toggleTheme } = useTheme();
  const [isFemale, setIsFemale] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'practice'>('dashboard');
  
  const [user, setUser] = useState<any>(GUEST_USER);

  const session = useInterviewSession({ apiKey: API_KEY });

  const live = useLiveInterview({
    apiKey: API_KEY,
    currentProblem: session.currentProblem,
    language: session.language,
    code: session.code,
    isFemale,
    editorRef,
    avatarRef,
    setMessages: session.setMessages,
    onUpdateContext: (lang, title, desc, code) => {
      session.setDynamicProblem(lang, title, desc, code);
    },
    onTypeCode: (newCode) => {
      session.typeCodeEffect(newCode);
    }
  });

  // Wire live refs into session for message routing (effect, not render-phase)
  useEffect(() => {
    session.setLiveRefs(live.isLiveConnected, live.liveServiceRef, live.noteUserTurnStarted);
  }, [live.isLiveConnected, live.liveServiceRef, live.noteUserTurnStarted, session.setLiveRefs]);

  // Synchronise page theme class based on activeTab
  useEffect(() => {
    const doc = document.documentElement;
    if (activeTab === 'dashboard') {
      doc.classList.add('light');
    } else {
      if (theme === 'light') {
        doc.classList.add('light');
      } else {
        doc.classList.remove('light');
      }
    }
  }, [activeTab, theme]);

  const handleSolve = async () => {
    setUser((current: any) => ({
      ...current,
      xp: current.xp + 25,
      problemsSolved: current.problemsSolved + 1,
      successRate: Math.min(100, current.successRate + 2),
      languages: {
        ...current.languages,
        [session.language]: (current.languages?.[session.language] || 0) + 1,
      },
    }));
  };

  const totalTokens = useMemo(() => ({
    prompt: session.chatTokens.prompt + live.sessionTokens.prompt,
    candidates: session.chatTokens.candidates + live.sessionTokens.candidates,
    total: session.chatTokens.total + live.sessionTokens.total,
  }), [session.chatTokens, live.sessionTokens]);

  return (
    <div className="h-screen w-full flex flex-col bg-app text-primary font-sans overflow-hidden transition-colors duration-300">
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        user={user}
        currentProblem={session.currentProblem}
        onRandomProblem={session.handleRandomProblem}
        live={live}
        sessionTokens={totalTokens}
      />

      <div className="flex-1 flex overflow-hidden relative">
        {activeTab === 'dashboard' ? (
          <DashboardView
            user={user}
            onNavigateToPractice={(lang) => {
              if (lang) {
                const validLangs = ['python', 'typescript', 'cpp', 'java', 'c'];
                if (validLangs.includes(lang)) {
                  session.handleLanguageChange(lang as any);
                }
              }
              setActiveTab('practice');
            }}
          />
        ) : (
          <main className="flex-1 flex overflow-hidden w-full">
            <div className="flex-1 flex flex-col relative min-w-0">
              <AvatarInterviewer
                ref={avatarRef}
                speechLevel={live.speechLevel}
                isLiveConnected={live.isLiveConnected}
                isCameraEnabled={live.isCameraEnabled}
                subtitles={live.subtitles}
                agentState={live.agentState}
                isFemale={isFemale}
                onAvatarChange={setIsFemale}
              />
              <DescriptionBanner description={session.currentProblem.description} />
              <div className="flex-1 min-h-0 relative">
                <CodeEditor
                  ref={editorRef}
                  code={session.code}
                  onChange={session.setCode}
                  language={session.language}
                  onLanguageChange={session.handleLanguageChange}
                  theme={theme}
                  onThemeToggle={toggleTheme}
                  onSubmitCode={handleSolve}
                />
              </div>
            </div>

            <div className="w-[400px] xl:w-[450px] flex-shrink-0 flex flex-col border-l border-subtle bg-panel z-10 shadow-2xl shadow-black/5 transition-colors duration-300">
              <ChatPanel
                messages={session.messages}
                onSendMessage={session.handleSendMessage}
                isLoading={session.isLoadingChat}
              />
            </div>
          </main>
        )}
      </div>

    </div>
  );
};

export default App;

// --- Sub-components extracted from the layout ---

interface HeaderProps {
  activeTab: 'dashboard' | 'practice';
  onTabChange: (tab: 'dashboard' | 'practice') => void;
  user: any;
  currentProblem: { title: string; difficulty: 'Easy' | 'Medium' | 'Hard' };
  onRandomProblem: () => void;
  sessionTokens: { prompt: number; candidates: number; total: number };
  live: {
    isLiveConnected: boolean;
    isConnectingLive: boolean;
    volume: number;
    isMicMuted: boolean;
    isCameraEnabled: boolean;
    sessionTokens: { prompt: number; candidates: number; total: number };
    toggleMic: () => void;
    toggleCamera: () => void;
    handleConnectLive: () => void;
    handleDisconnectLive: () => void;
  };
}

function Header({ 
  activeTab, 
  onTabChange, 
  user, 
  currentProblem, 
  onRandomProblem, 
  live, 
  sessionTokens 
}: HeaderProps) {
  const difficultyClass =
    currentProblem.difficulty === 'Easy'
      ? 'border-emerald-900/50 text-emerald-500'
      : currentProblem.difficulty === 'Medium'
        ? 'border-amber-900/50 text-amber-500'
        : 'border-rose-900/50 text-rose-500';

  const isDash = activeTab === 'dashboard';
  const headerBg = isDash 
    ? 'bg-[#EEF2FF]/60 border-[#ECE9F8]/20 text-[#1E1B4B]' 
    : 'bg-app border-subtle text-primary';
  const logoColor = 'text-[#6366F1]';
  const nameColor = isDash ? 'text-[#1E1B4B]' : 'text-primary';
  const separatorColor = isDash ? 'bg-indigo-200' : 'bg-subtle';

  return (
    <header className={`relative h-16 border-b flex items-center justify-between px-6 shrink-0 z-50 transition-all duration-300 ${headerBg}`}>
      <div className="flex items-center gap-4 h-full">
        
        {/* Logo matching mockup */}
        <div className="flex items-center gap-2">
          <svg className={`w-6 h-6 ${logoColor}`} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2a1 1 0 0 1 1 1v1.07A7.002 7.002 0 0 1 19 11v8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-8a7.002 7.002 0 0 1 6-6.93V3a1 1 0 0 1 1-1zm6 9H6v8h12v-8zm-9 2a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm6 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z" />
          </svg>
          <span className={`font-black tracking-tight text-sm ${nameColor}`}>DevInterviewBot</span>
        </div>

        {/* Tab Selection matching mockup */}
        <nav className="flex items-center gap-6 ml-6 h-full select-none">
          {[
            { id: 'dashboard', name: 'Dashboard' },
            { id: 'practice', name: 'Practice' },
            { id: 'mock-interviews', name: 'Mock Interviews', disabled: true },
            { id: 'bookmarks', name: 'Bookmarks', disabled: true }
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (tab.disabled) {
                    alert(`${tab.name} is preparing for the next beta release!`);
                  } else {
                    onTabChange(tab.id as 'dashboard' | 'practice');
                  }
                }}
                className={`relative px-1 text-xs font-bold transition-all h-full flex items-center ${
                  isActive 
                    ? (isDash ? 'text-[#6366F1]' : 'text-primary') 
                    : 'text-zinc-500 hover:text-[#6366F1]'
                }`}
              >
                <span>{tab.name}</span>
                {isActive && (
                  <span className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-[#6366F1] rounded-t animate-in fade-in duration-300" />
                )}
              </button>
            );
          })}
        </nav>

        {activeTab === 'practice' && (
          <>
            <div className={`h-4 w-px ${separatorColor} mx-1`} />
            <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
              <span className="text-sm font-medium text-primary">{currentProblem.title}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded border ${difficultyClass} uppercase tracking-wider`}>
                {currentProblem.difficulty}
              </span>
              <button onClick={onRandomProblem} className="p-1.5 text-secondary hover:text-primary transition-colors" title="Next Problem">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </>
        )}
      </div>

      {activeTab === 'practice' && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <LiveControls 
            isConnected={live.isLiveConnected}
            isConnecting={live.isConnectingLive}
            onConnect={live.handleConnectLive}
            onDisconnect={live.handleDisconnectLive}
            volume={live.volume}
            isMicMuted={live.isMicMuted}
            onToggleMic={live.toggleMic}
            isCameraEnabled={live.isCameraEnabled}
            onToggleCamera={live.toggleCamera}
            sessionTokens={sessionTokens}
          />
        </div>
      )}

      {/* Right: Guest Profile controls */}
      <div className="flex items-center gap-4">
        {/* XP Badge matching mockup */}
        <div className="flex items-center gap-1.5 text-[#6366F1] font-black text-xs">
          <Zap className="w-3.5 h-3.5 fill-current animate-pulse text-[#6366F1]" />
          <span>{user.xp} XP</span>
        </div>

        <div className={`w-px h-4 ${separatorColor}`} />

        <div className="flex items-center gap-2 rounded-full border border-[#6366F1]/20 bg-[#6366F1]/10 px-3 py-1.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#6366F1] text-xs font-black text-white">
            G
          </div>
          <div className="text-left leading-none">
            <div className="text-[10px] font-black uppercase tracking-wider text-secondary">Guest Mode</div>
            <div className="mt-1 text-xs font-bold text-primary">No login required</div>
          </div>
        </div>
      </div>
    </header>
  );
}

function DescriptionBanner({ description }: { description: string }) {
  return (
    <div className="px-8 py-6 border-b border-subtle bg-app transition-colors duration-300">
      <p className="text-sm text-secondary leading-relaxed max-w-3xl">{description}</p>
    </div>
  );
}
