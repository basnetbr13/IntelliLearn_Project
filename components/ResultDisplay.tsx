import React from 'react';
import { QuizQuestion, ActiveTab, Flashcard, MangaScriptSection, ChatMessage } from '../types';
import { Quiz } from './Quiz';
import { FlashcardViewer } from './FlashcardViewer';
import { MangaViewer } from './MangaViewer';
import { ChatInterface } from './ChatInterface';

interface ResultDisplayProps {
  summary: string | null;
  quiz: QuizQuestion[] | null;
  flashcards: Flashcard[] | null;
  mangaScript: MangaScriptSection[] | null;
  mangaSpriteUrl: string | null;
  
  // Chat props
  chatHistory: ChatMessage[] | null;
  onSendMessage: (msg: string) => void;
  isChatProcessing: boolean;

  activeTab: ActiveTab | null;
  setActiveTab: (tab: ActiveTab) => void;

  // New Quiz Props
  onGenerateMoreQuiz?: () => void;
  isGeneratingMoreQuiz?: boolean;
}

const TabButton: React.FC<{
  label: string;
  isActive: boolean;
  onClick: () => void;
  isAvailable: boolean;
}> = ({ label, isActive, onClick, isAvailable }) => {
  if (!isAvailable && !isActive) return null;

  return (
    <button
      onClick={onClick}
      className={`relative px-4 py-2.5 text-sm font-bold rounded-t-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${isActive
          ? 'text-sky-600'
          : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
        }`}
    >
      {label}
      {isActive && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-500"></div>}
    </button>
  );
};

export const ResultDisplay: React.FC<ResultDisplayProps> = ({
  summary,
  quiz,
  flashcards,
  mangaScript,
  mangaSpriteUrl,
  chatHistory,
  onSendMessage,
  isChatProcessing,
  activeTab,
  setActiveTab,
  onGenerateMoreQuiz,
  isGeneratingMoreQuiz = false
}) => {
  if (!activeTab && !summary && !quiz && !flashcards && !mangaScript && !chatHistory) return null;

  return (
    <div className="mt-8">
      <div className="border-b border-slate-200 mb-0">
        <nav className="flex space-x-2 overflow-x-auto" aria-label="Tabs">
          <TabButton label="Summary" isActive={activeTab === 'summary'} onClick={() => setActiveTab('summary')} isAvailable={!!summary} />
          <TabButton label="Quiz" isActive={activeTab === 'quiz'} onClick={() => setActiveTab('quiz')} isAvailable={!!quiz} />
          <TabButton label="Flashcards" isActive={activeTab === 'flashcards'} onClick={() => setActiveTab('flashcards')} isAvailable={!!flashcards} />
          <TabButton label="AI Tutor" isActive={activeTab === 'chat'} onClick={() => setActiveTab('chat')} isAvailable={true} />
          <TabButton label="Manga" isActive={activeTab === 'manga'} onClick={() => setActiveTab('manga')} isAvailable={!!mangaScript} />
        </nav>
      </div>

      <div className="p-1 sm:p-4 bg-white/50 rounded-b-lg min-h-[200px]">
        {activeTab === 'summary' && (
          summary ? (
            <div className="p-4 prose prose-p:text-slate-700 prose-headings:text-sky-600 prose-strong:text-slate-900 prose-bullets:marker:text-sky-500 max-w-none" dangerouslySetInnerHTML={{ __html: summary.replace(/\n/g, '<br />') }} />
          ) : <div className="p-8 text-center text-slate-400">No summary generated.</div>
        )}

        {activeTab === 'quiz' && (
          quiz ? (
            <Quiz 
              questions={quiz} 
              onGenerateMore={onGenerateMoreQuiz}
              isGeneratingMore={isGeneratingMoreQuiz}
            />
          ) : <div className="p-8 text-center text-slate-400">No quiz generated.</div>
        )}

        {activeTab === 'flashcards' && (
          flashcards ? <FlashcardViewer flashcards={flashcards} /> : <div className="p-8 text-center text-slate-400">No flashcards generated.</div>
        )}

        {activeTab === 'chat' && (
          <ChatInterface 
            messages={chatHistory || []} 
            onSendMessage={onSendMessage} 
            isProcessing={isChatProcessing} 
          />
        )}
        
        {activeTab === 'manga' && (
          mangaScript ? <MangaViewer script={mangaScript} spriteUrl={mangaSpriteUrl} /> : <div className="p-8 text-center text-slate-400">No manga generated.</div>
        )}
      </div>
    </div>
  );
};
