import React, { useState, useEffect } from 'react';
import { Flashcard } from '../types';

const Card: React.FC<{ flashcard: Flashcard }> = ({ flashcard }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  // Reset flip state when card content changes
  useEffect(() => {
    setIsFlipped(false);
  }, [flashcard]);

  return (
    <div className="w-full h-64 sm:h-72 perspective" onClick={() => setIsFlipped(!isFlipped)}>
      <div className={`relative w-full h-full transition-transform duration-700 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
        {/* Front of the card */}
        <div className="absolute w-full h-full backface-hidden rounded-xl flex items-center justify-center p-6 cursor-pointer bg-gradient-to-br from-white to-slate-100 border border-slate-200 shadow-2xl shadow-slate-900/10">
          <p className="text-2xl sm:text-3xl font-bold text-sky-600 text-center">{flashcard.term}</p>
        </div>
        {/* Back of the card */}
        <div className="absolute w-full h-full backface-hidden rounded-xl flex items-center justify-center p-6 rotate-y-180 cursor-pointer bg-gradient-to-br from-sky-500 to-sky-600 border border-sky-400 shadow-2xl shadow-sky-500/30">
          <p className="text-white text-center text-lg">{flashcard.definition}</p>
        </div>
      </div>
    </div>
  );
};

export const FlashcardViewer: React.FC<{ flashcards: Flashcard[] }> = ({ flashcards }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const goToNext = () => setCurrentIndex(i => (i + 1) % flashcards.length);
  const goToPrev = () => setCurrentIndex(i => (i - 1 + flashcards.length) % flashcards.length);

  if (!flashcards || flashcards.length === 0) {
    return <p>No flashcards available.</p>;
  }

  return (
    <div>
      <h3 className="text-2xl font-bold text-amber-600 my-4">Flashcards</h3>
      <div className="relative max-w-xl mx-auto">
        <Card flashcard={flashcards[currentIndex]} />
      </div>
      <div className="flex justify-between items-center mt-8 max-w-xl mx-auto">
        <button onClick={goToPrev} className="px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg transition-colors font-semibold flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Prev
        </button>
        <span className="text-slate-600 font-bold text-lg tabular-nums">{currentIndex + 1} / {flashcards.length}</span>
        <button onClick={goToNext} className="px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg transition-colors font-semibold flex items-center gap-2">
            Next
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
    </div>
  );
};