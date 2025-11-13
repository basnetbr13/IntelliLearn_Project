import React, { useState } from 'react';
import { QuizQuestion } from '../types';

interface QuizProps {
  questions: QuizQuestion[];
}

const QuizQuestionComponent: React.FC<{ question: QuizQuestion; index: number }> = ({ question, index }) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);

  const handleSelectOption = (option: string) => {
    if (isAnswered) return;
    setSelectedOption(option);
  };

  const checkAnswer = () => {
    setIsAnswered(true);
  };
  
  const getOptionClass = (option: string) => {
    if (!isAnswered) {
        return `bg-slate-100 hover:bg-slate-200 ${selectedOption === option ? 'ring-2 ring-sky-500' : 'ring-1 ring-slate-300'}`;
    }
    if (option === question.correctAnswer) {
        return 'bg-emerald-100 ring-2 ring-emerald-500 text-emerald-800';
    }
    if (option === selectedOption && option !== question.correctAnswer) {
        return 'bg-red-100 ring-2 ring-red-500 text-red-800';
    }
    return 'bg-slate-50 ring-1 ring-slate-200 opacity-60';
  }

  return (
    <div className="mb-6 p-5 bg-white rounded-xl border border-slate-200 shadow-lg">
      <p className="font-bold text-lg text-slate-800 mb-5">{index + 1}. {question.question}</p>
      <div className="space-y-3">
        {question.options.map((option, i) => (
          <button
            key={i}
            onClick={() => handleSelectOption(option)}
            className={`w-full text-left p-3.5 rounded-lg transition-all text-slate-700 duration-200 ${getOptionClass(option)}`}
            disabled={isAnswered}
          >
            {option}
          </button>
        ))}
      </div>
      {!isAnswered && (
        <div className="mt-5 text-right">
            <button
                onClick={checkAnswer}
                disabled={!selectedOption}
                className="px-5 py-2 bg-sky-600 text-white font-semibold rounded-lg disabled:bg-slate-300 disabled:cursor-not-allowed hover:bg-sky-700 transition-colors"
            >
                Check Answer
            </button>
        </div>
      )}
      {isAnswered && (
        <div className={`mt-4 p-3 rounded-lg text-sm font-semibold flex items-center gap-2
            ${selectedOption === question.correctAnswer ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}
        >
            {selectedOption === question.correctAnswer ? 
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg> :
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
            }
            {selectedOption === question.correctAnswer ? 'Correct!' : `Correct answer: ${question.correctAnswer}`}
        </div>
      )}
    </div>
  );
};

export const Quiz: React.FC<QuizProps> = ({ questions }) => {
  return (
    <div>
      <h3 className="text-2xl font-bold text-emerald-600 my-4">Test Your Knowledge</h3>
      {questions.map((q, i) => (
        <QuizQuestionComponent key={i} question={q} index={i} />
      ))}
    </div>
  );
};