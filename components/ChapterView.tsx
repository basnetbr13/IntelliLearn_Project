import React, { useState, useCallback, useEffect } from 'react';
import { FileUpload } from './FileUpload';
import { ActionButtons } from './ActionButtons';
import { ResultDisplay } from './ResultDisplay';
import { Spinner } from './Spinner';
import { generateSummary, generateQuiz, generateFlashcards, generateMangaScript, generateMangaPanelImage } from '../services/geminiService';
import { ActiveTab, Chapter, MangaPanel } from '../types';

interface ChapterViewProps {
    chapter: Chapter;
    // FIX: Updated the prop type to allow function updaters, aligning it with the implementation in App.tsx.
    onUpdateChapter: (updatedChapterData: Partial<Chapter> | { [K in keyof Chapter]?: (prevState: Chapter[K]) => Chapter[K] }) => void;
    onBack: () => void;
}

export const ChapterView: React.FC<ChapterViewProps> = ({ chapter, onUpdateChapter, onBack }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab | null>(null);

  useEffect(() => {
    if (!activeTab) {
        if (chapter.summary) setActiveTab('summary');
        else if (chapter.quiz) setActiveTab('quiz');
        else if (chapter.flashcards) setActiveTab('flashcards');
        else if (chapter.mangaScript) setActiveTab('manga');
        else setActiveTab(null);
    }
  }, [chapter, activeTab]);


  const handleFileSelect = (selectedFile: File, content: string, type: 'text' | 'image' | 'file', mimeType?: string) => {
    onUpdateChapter({
        sourceFile: { name: selectedFile.name, content, type, mimeType },
        summary: null,
        quiz: null,
        flashcards: null,
        mangaScript: null,
    });
    setActiveTab(null);
  };
  
  const handleResetFile = () => {
    onUpdateChapter({
        sourceFile: null,
        summary: null,
        quiz: null,
        flashcards: null,
        mangaScript: null,
    });
    setActiveTab(null);
  }

  const handleGenerate = async (
    generationFn: (content: string, type: Chapter['sourceFile']['type'], mimeType?: string) => Promise<any>,
    updateKey: keyof Chapter,
    tabToActivate: ActiveTab,
    message: string
  ) => {
    if (!chapter.sourceFile) return;
    setIsLoading(true);
    setLoadingMessage(message);
    setError(null);
    try {
      const result = await generationFn(chapter.sourceFile.content, chapter.sourceFile.type, chapter.sourceFile.mimeType);
      onUpdateChapter({ [updateKey]: result });
      setActiveTab(tabToActivate);
    } catch (e) {
      const errorMessage = `Failed to generate ${tabToActivate}. Please check the browser console (F12) for more details.`;
      setError(errorMessage);
      console.error(`Error during ${tabToActivate} generation:`, e);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  const handleGenerateManga = async () => {
    if (!chapter.sourceFile) return;
    setIsLoading(true);
    setLoadingMessage('Generating manga script...');
    setError(null);
    try {
      const script = await generateMangaScript(chapter.sourceFile.content, chapter.sourceFile.type, chapter.sourceFile.mimeType);
      
      const initialPanels: MangaPanel[] = script.map(panel => ({ ...panel, imageUrl: null }));
      onUpdateChapter({ mangaScript: initialPanels });
      setActiveTab('manga');
      setLoadingMessage('Generating panel images...');

      const imagePromises = script.map(async (panel, index) => {
        try {
          const imageUrl = await generateMangaPanelImage(panel.panelPrompt);
          return { index, imageUrl };
        } catch (imgError) {
          console.error(`Failed to generate image for panel ${index}:`, imgError);
          return { index, imageUrl: 'error' };
        }
      });
      
      for (const promise of imagePromises) {
          promise.then(({ index, imageUrl }) => {
              onUpdateChapter({
                  mangaScript: (currentScript) => {
                      const newScript = [...(currentScript || [])];
                      if(newScript[index]) {
                          newScript[index].imageUrl = imageUrl;
                      }
                      return newScript;
                  }
              });
          });
      }

      await Promise.allSettled(imagePromises);

    } catch (e) {
      const errorMessage = `Failed to generate manga. Please check the browser console (F12) for more details.`;
      setError(errorMessage);
      console.error(`Error during manga generation:`, e);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };


  const handleGenerateSummary = () => handleGenerate(generateSummary, 'summary', 'summary', 'Generating summary...');
  const handleGenerateQuiz = () => handleGenerate(generateQuiz, 'quiz', 'quiz', 'Generating quiz...');
  const handleGenerateFlashcards = () => handleGenerate(generateFlashcards, 'flashcards', 'flashcards', 'Generating flashcards...');

  const hasGeneratedContent = chapter.summary || chapter.quiz || chapter.flashcards || chapter.mangaScript;

  return (
    <div>
        <button onClick={onBack} className="mb-6 inline-flex items-center gap-2 text-sm text-sky-600 hover:text-sky-700 transition-colors font-semibold">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" /></svg>
            Back to Course
        </button>
        <h2 className="text-4xl font-bold mb-2 text-slate-800">{chapter.name}</h2>
        <p className="text-slate-600 mb-8">Upload a file to generate study materials for this chapter.</p>
        
        <div className="bg-white/50 rounded-xl shadow-2xl p-6 sm:p-8 backdrop-blur-sm border border-slate-200">
          {!chapter.sourceFile ? (
            <FileUpload onFileSelect={handleFileSelect} />
          ) : (
            <div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 bg-slate-100 p-4 rounded-lg border border-slate-200">
                  <div className="flex items-center space-x-3 overflow-hidden mb-3 sm:mb-0">
                    <span className="text-emerald-500 flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                    </span>
                    <p className="font-medium text-slate-700 truncate" title={chapter.sourceFile.name}>
                        <span className="text-slate-500 font-normal">Source: </span>
                        {chapter.sourceFile.name}
                    </p>
                  </div>
                  <button onClick={handleResetFile} className="text-sm text-slate-700 bg-slate-200 hover:bg-slate-300 transition-colors font-semibold py-2 px-4 rounded-md flex-shrink-0 w-full sm:w-auto">
                    Upload New File
                  </button>
              </div>

              <ActionButtons
                isLoading={isLoading}
                onSummarize={handleGenerateSummary}
                onQuiz={handleGenerateQuiz}
                onFlashcards={handleGenerateFlashcards}
                onMangaMode={handleGenerateManga}
              />

              {error && <div className="mt-6 text-center text-red-700 bg-red-100 p-3 rounded-lg border border-red-200">{error}</div>}

              {isLoading && (
                <div className="mt-8 flex flex-col items-center justify-center text-slate-500 p-8 bg-slate-100/50 rounded-lg">
                  <Spinner />
                  <p className="mt-3 text-lg font-semibold text-slate-700">{loadingMessage}</p>
                  <p className="text-sm text-slate-500">This may take a moment, please don't close the tab.</p>
                </div>
              )}
              
              {hasGeneratedContent && !isLoading && (
                 <ResultDisplay
                  summary={chapter.summary}
                  quiz={chapter.quiz}
                  flashcards={chapter.flashcards}
                  mangaScript={chapter.mangaScript}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                />
              )}
            </div>
          )}
        </div>
    </div>
  );
};
