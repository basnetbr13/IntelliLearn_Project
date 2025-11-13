import React from 'react';
import { Spinner } from './Spinner';

interface ActionButtonsProps {
  isLoading: boolean;
  onSummarize: () => void;
  onQuiz: () => void;
  onFlashcards: () => void;
  onMangaMode: () => void;
}

const ActionButton: React.FC<{ onClick: () => void; isLoading: boolean; children: React.ReactNode; icon: React.ReactNode; className: string }> = ({ onClick, isLoading, children, icon, className }) => (
    <button
      onClick={onClick}
      disabled={isLoading}
      className={`w-full sm:w-auto flex-1 text-center font-bold py-3 px-5 rounded-xl transition-all duration-200 ease-in-out transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2.5 text-base ${className}`}
    >
        {isLoading ? <Spinner small /> : icon}
        <span>{children}</span>
    </button>
);


export const ActionButtons: React.FC<ActionButtonsProps> = ({ isLoading, onSummarize, onQuiz, onFlashcards, onMangaMode }) => {
  const SummarizeIcon = <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" /></svg>;
  const QuizIcon = <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
  const FlashcardsIcon = <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>;
  const MangaIcon = <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v11.494m0 0a7.5 7.5 0 007.5-7.5H4.5a7.5 7.5 0 007.5 7.5z" /></svg>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <ActionButton onClick={onSummarize} isLoading={isLoading} icon={SummarizeIcon} className="bg-sky-500 hover:bg-sky-600 text-white shadow-lg shadow-sky-500/30">
        Summarize
      </ActionButton>
      <ActionButton onClick={onQuiz} isLoading={isLoading} icon={QuizIcon} className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30">
        Create Quiz
      </ActionButton>
      <ActionButton onClick={onFlashcards} isLoading={isLoading} icon={FlashcardsIcon} className="bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/30">
        Flashcards
      </ActionButton>
      <ActionButton onClick={onMangaMode} isLoading={isLoading} icon={MangaIcon} className="bg-purple-500 hover:bg-purple-600 text-white shadow-lg shadow-purple-500/30">
        Manga Mode
      </ActionButton>
    </div>
  );
};