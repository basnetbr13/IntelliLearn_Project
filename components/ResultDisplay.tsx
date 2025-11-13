import React from 'react';
import { QuizQuestion, ActiveTab, Flashcard, MangaPanel } from '../types';
import { Quiz } from './Quiz';
import { FlashcardViewer } from './FlashcardViewer';
import { MangaViewer } from './MangaViewer';

interface ResultDisplayProps {
  summary: string | null;
  quiz: QuizQuestion[] | null;
  flashcards: Flashcard[] | null;
  mangaScript: MangaPanel[] | null;
  activeTab: ActiveTab | null;
  setActiveTab: (tab: ActiveTab) => void;
}

const TabButton: React.FC<{
  label: string;
  isActive: boolean;
  onClick: () => void;
  isAvailable: boolean;
}> = ({ label, isActive, onClick, isAvailable }) => {
  if (!isAvailable) return null;
  return (
    <button
      onClick={onClick}
      className={`relative px-4 py-2.5 text-sm font-bold rounded-t-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
        isActive
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
  activeTab,
  setActiveTab
}) => {
  const hasContent = summary || quiz || flashcards || mangaScript;
  if (!hasContent) return null;

  return (
    <div className="mt-8">
      <div className="border-b border-slate-200 mb-0">
        <nav className="flex space-x-2" aria-label="Tabs">
          <TabButton label="Summary" isActive={activeTab === 'summary'} onClick={() => setActiveTab('summary')} isAvailable={!!summary} />
          <TabButton label="Quiz" isActive={activeTab === 'quiz'} onClick={() => setActiveTab('quiz')} isAvailable={!!quiz} />
          <TabButton label="Flashcards" isActive={activeTab === 'flashcards'} onClick={() => setActiveTab('flashcards')} isAvailable={!!flashcards} />
          <TabButton label="Manga" isActive={activeTab === 'manga'} onClick={() => setActiveTab('manga')} isAvailable={!!mangaScript} />
        </nav>
      </div>

      <div className="p-1 sm:p-4 bg-white/50 rounded-b-lg min-h-[200px]">
        {activeTab === 'summary' && summary && (
          <div className="p-4 prose prose-p:text-slate-700 prose-headings:text-sky-600 prose-strong:text-slate-900 prose-bullets:marker:text-sky-500 max-w-none" dangerouslySetInnerHTML={{ __html: summary.replace(/\n/g, '<br />') }} />
        )}
        {activeTab === 'quiz' && quiz && <Quiz questions={quiz} />}
        {activeTab === 'flashcards' && flashcards && <FlashcardViewer flashcards={flashcards} />}
        {activeTab === 'manga' && mangaScript && <MangaViewer script={mangaScript} />}
      </div>
    </div>
  );
};