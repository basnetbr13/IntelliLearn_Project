
import React, { useState, useEffect } from 'react';
import { FileUpload } from './FileUpload';
import { ActionButtons } from './ActionButtons';
import { ResultDisplay } from './ResultDisplay';
import { Spinner } from './Spinner';
import { generateSummary, generateQuiz, generateFlashcards, generateMangaScript, generateMangaSprite } from '../services/geminiService';
import { askHuggingFace } from '../services/huggingFaceService';
import { ActiveTab, Chapter, Resource, ChatMessage } from '../types';
// FIX: Import blobToFile helper to convert Blob to File for processing.
import { saveSourceFile, getSourceFile, deleteSourceFiles, blobToFile } from '../services/db';
// FIX: Import useAuth to get the current user for file operations.
import { useAuth } from '../contexts/AuthContext';

declare global {
  interface Window {
    mammoth: any;
    JSZip: any;
    aistudio?: AIStudio;
  }
}

interface ChapterViewProps {
  chapter: Chapter;
  onUpdateChapter: (updatedChapterData: Partial<Chapter> | { [K in keyof Chapter]?: (prevState: Chapter[K]) => Chapter[K] }) => void;
  onBack: () => void;
}

// Helpers need to handle File object which we now get from fetch/blob
const fileToText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
};

const extractTextFromDocx = async (file: File): Promise<string> => {
  if (!window.mammoth) throw new Error("Mammoth library not loaded");
  const arrayBuffer = await file.arrayBuffer();
  const result = await window.mammoth.extractRawText({ arrayBuffer });
  return result.value;
};

const extractTextFromPptx = async (file: File): Promise<string> => {
  if (!window.JSZip) throw new Error("JSZip library not loaded");
  const zip = new window.JSZip();
  const loadedZip = await zip.loadAsync(file);
  const slides: string[] = [];

  const slideFiles = Object.keys(loadedZip.files).filter(filename => filename.match(/ppt\/slides\/slide\d+\.xml/));

  slideFiles.sort((a: string, b: string) => {
    const numA = parseInt(a.match(/slide(\d+)\.xml/)![1]);
    const numB = parseInt(b.match(/slide(\d+)\.xml/)![1]);
    return numA - numB;
  });

  for (const filename of slideFiles) {
    const content = await loadedZip.files[filename].async('string');
    const textMatches = content.match(/<a:t[^>]*>(.*?)<\/a:t>/g);
    if (textMatches) {
      const slideText = textMatches.map((t: string) => t.replace(/<\/?a:t[^>]*>/g, '')).join(' ');
      if (slideText.trim()) {
        slides.push(`[Slide ${slides.length + 1}]: ${slideText}`);
      }
    }
  }
  return slides.join('\n\n');
};

export const ChapterView: React.FC<ChapterViewProps> = ({ chapter, onUpdateChapter, onBack }) => {
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingMore, setIsGeneratingMore] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<React.ReactNode | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab | null>(null);

  const [isChatProcessing, setIsChatProcessing] = useState(false);
  const [cachedContext, setCachedContext] = useState<string[] | null>(null);

  // FIX: Get current user from auth context.
  const { currentUser } = useAuth();

  const activeResource = chapter.resources?.find(r => r.id === selectedResourceId) || null;

  useEffect(() => {
    if (activeResource) {
      if (activeResource.summary) setActiveTab('summary');
      else if (activeResource.quiz) setActiveTab('quiz');
      else if (activeResource.flashcards) setActiveTab('flashcards');
      else if (activeResource.mangaScript) setActiveTab('manga');
      else setActiveTab(null);
    }
  }, [selectedResourceId]);

  useEffect(() => {
    setCachedContext(null);
  }, [chapter.resources.length]);


  const handleFileSelect = async (selectedFile: File) => {
    const fileMimeType = selectedFile.type;
    const fileName = selectedFile.name.toLowerCase();
    let fileType: Resource['type'] = 'file';

    if (fileMimeType.startsWith('image/')) {
      fileType = 'image';
    } else if (fileMimeType === 'text/plain') {
      fileType = 'text';
    } else if (fileName.endsWith('.docx') || fileName.endsWith('.pptx')) {
      fileType = 'file';
    }

    const dbKey = `resource-${chapter.id}-${Date.now()}-${selectedFile.name}`;

    // await saveSourceFile(dbKey, selectedFile);

    const newResource: Resource = {
      id: Date.now().toString(),
      name: selectedFile.name,
      dbKey: dbKey,
      type: fileType,
      mimeType: fileMimeType,
      file: selectedFile, // Store file locally
      summary: null,
      quiz: null,
      flashcards: null,
      mangaScript: null,
      mangaSpriteUrl: null
    };

    onUpdateChapter({
      resources: [...(chapter.resources || []), newResource]
    });
  };

  const handleDeleteResource = async (resourceId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Delete this resource and its study materials?")) return;

    // FIX: Add a check for currentUser before proceeding.
    if (!currentUser) {
      setError("You must be logged in to delete a resource.");
      return;
    }

    const resource = chapter.resources?.find(r => r.id === resourceId);
    if (resource) {
      // FIX: Pass the user ID to deleteSourceFiles as required by its signature.
      await deleteSourceFiles(currentUser.uid, [resource.dbKey]);
      const updatedResources = chapter.resources.filter(r => r.id !== resourceId);
      onUpdateChapter({ resources: updatedResources });
      if (selectedResourceId === resourceId) setSelectedResourceId(null);
    }
  };

  const prepareContentForAI = async (file: File, type: Resource['type']): Promise<{ content: string, type: Resource['type'] }> => {
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.pdf') || type === 'image') {
      const base64 = await fileToBase64(file);
      return { content: base64, type: type };
    }
    if (type === 'text' || fileName.endsWith('.txt')) {
      const text = await fileToText(file);
      return { content: text, type: 'text' };
    }
    if (fileName.endsWith('.docx')) {
      const text = await extractTextFromDocx(file);
      return { content: text, type: 'text' };
    }
    if (fileName.endsWith('.pptx')) {
      const text = await extractTextFromPptx(file);
      return { content: text, type: 'text' };
    }

    throw new Error("Unsupported file type for processing.");
  }

  const buildContextFromResources = async (): Promise<string[]> => {
    if (cachedContext) return cachedContext;
    if (!chapter.resources || chapter.resources.length === 0) return [];

    const texts: string[] = [];

    for (const res of chapter.resources) {
      try {
        let file: File;
        if (res.file) {
          file = res.file;
        } else {
          // Fallback for existing resources (might fail if storage is broken)
          const blob = await getSourceFile(res.dbKey);
          if (!blob) continue;
          file = blobToFile(blob, res.name);
        }

        let text = "";
        const fileName = res.name.toLowerCase();

        if (res.type === 'text' || fileName.endsWith('.txt')) {
          text = await fileToText(file);
        } else if (fileName.endsWith('.docx')) {
          text = await extractTextFromDocx(file);
        } else if (fileName.endsWith('.pptx')) {
          text = await extractTextFromPptx(file);
        }

        if (text) {
          texts.push(`Source: ${res.name}\n${text}`);
        }
      } catch (e) {
        console.error(`Failed to extract context from ${res.name}`, e);
      }
    }

    setCachedContext(texts);
    return texts;
  };

  const handleSendMessage = async (userMessage: string) => {
    const newHistory: ChatMessage[] = [...(chapter.chatHistory || []), { role: 'user', content: userMessage }];

    onUpdateChapter({ chatHistory: newHistory });
    setIsChatProcessing(true);

    try {
      const contextArray = await buildContextFromResources();
      // Combine all context into a single string for Hugging Face
      const combinedContext = contextArray.join('\n\n--- NEXT RESOURCE ---\n\n');

      const response = await askHuggingFace(userMessage, combinedContext);

      onUpdateChapter({ chatHistory: [...newHistory, response] });
    } catch (e) {
      console.error("Chat error:", e);
      const errorMsg: ChatMessage = { role: 'model', content: "Sorry, I encountered an error while processing your request." };
      onUpdateChapter({ chatHistory: [...newHistory, errorMsg] });
    } finally {
      setIsChatProcessing(false);
    }
  };

  const handleGenerate = async (
    generationFn: (content: string, type: Resource['type'], mimeType?: string) => Promise<any>,
    updateKey: keyof Resource,
    tabToActivate: ActiveTab,
    message: string
  ) => {
    if (!activeResource) return;

    setIsLoading(true);
    setLoadingMessage(message);
    setError(null);

    try {
      let file: File;
      if (activeResource.file) {
        file = activeResource.file;
      } else {
        // FIX: getSourceFile returns a Blob; convert it to a File before processing.
        const fileBlob = await getSourceFile(activeResource.dbKey);
        if (!fileBlob) throw new Error("Could not load source file from local database.");
        file = blobToFile(fileBlob, activeResource.name);
      }

      const { content, type } = await prepareContentForAI(file, activeResource.type);

      const updateResource = (updates: Partial<Resource>) => {
        const updatedResources = chapter.resources.map(r =>
          r.id === activeResource.id ? { ...r, ...updates } : r
        );
        onUpdateChapter({ resources: updatedResources });
      };

      if (updateKey === 'mangaScript') {
        const script = await generateMangaScript(content, type, activeResource.mimeType);
        updateResource({ mangaScript: script });
        setActiveTab('manga');

        setLoadingMessage("Drawing manga pages...");
        try {
          const spriteUrl = await generateMangaSprite(script);
          updateResource({ mangaScript: script, mangaSpriteUrl: spriteUrl });
        } catch (imgErr) {
          console.error("Failed to generate manga sprite:", imgErr);
        }
      } else {
        const result = await generationFn(content, type, activeResource.mimeType);
        updateResource({ [updateKey]: result });
        setActiveTab(tabToActivate);
      }

    } catch (e) {
      const errorMessage = `Failed to generate ${tabToActivate}. ` + (e instanceof Error ? e.message : 'Unknown error');
      setError(errorMessage);
      console.error(`Error during ${tabToActivate} generation:`, e);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  const handleGenerateMoreQuiz = async () => {
    if (!activeResource) return;
    setIsGeneratingMore(true);

    try {
      let file: File;
      if (activeResource.file) {
        file = activeResource.file;
      } else {
        // FIX: getSourceFile returns a Blob; convert it to a File before processing.
        const fileBlob = await getSourceFile(activeResource.dbKey);
        if (!fileBlob) throw new Error("Source file not found.");
        file = blobToFile(fileBlob, activeResource.name);
      }

      const { content, type } = await prepareContentForAI(file, activeResource.type);
      const newQuestions = await generateQuiz(content, type, activeResource.mimeType);

      const currentQuestions = activeResource.quiz || [];
      const updatedQuestions = [...currentQuestions, ...newQuestions];

      const updatedResources = chapter.resources.map(r =>
        r.id === activeResource.id ? { ...r, quiz: updatedQuestions } : r
      );
      onUpdateChapter({ resources: updatedResources });

    } catch (e) {
      console.error("Failed to generate more quiz questions", e);
      setError("Failed to generate more questions. Please try again.");
    } finally {
      setIsGeneratingMore(false);
    }
  };

  const handleGenerateSummary = () => handleGenerate(generateSummary, 'summary', 'summary', 'Generating summary...');
  const handleGenerateQuiz = () => handleGenerate(generateQuiz, 'quiz', 'quiz', 'Generating quiz...');
  const handleGenerateFlashcards = () => handleGenerate(generateFlashcards, 'flashcards', 'flashcards', 'Generating flashcards...');
  const handleGenerateManga = () => handleGenerate(generateMangaScript, 'mangaScript', 'manga', 'Writing manga script...');
  const handleAiTutor = () => setActiveTab('chat');

  return (
    <div className="relative">
      <div className="flex justify-between items-center mb-6">
        <button onClick={onBack} className="inline-flex items-center gap-2 text-sm text-sky-600 hover:text-sky-700 transition-colors font-semibold">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" /></svg>
          Back to Course
        </button>
      </div>

      {!selectedResourceId ? (
        <div>
          <div className="flex items-baseline gap-4 mb-2">
            <h2 className="text-4xl font-bold text-slate-800">{chapter.name}</h2>
          </div>
          <p className="text-slate-600 mb-8">Manage your learning resources. Upload multiple files to organize your study materials.</p>

          <div className="mb-8">
            <h3 className="text-lg font-bold text-slate-700 mb-4">Add New Resource</h3>
            <div className="bg-white/50 rounded-xl shadow-lg border border-slate-200">
              <FileUpload onFileSelect={handleFileSelect} />
              {isLoading && (
                <div className="p-4 text-center text-sky-600 font-medium animate-pulse">{loadingMessage}</div>
              )}
            </div>
          </div>

          <h3 className="text-lg font-bold text-slate-700 mb-4">Library ({chapter.resources?.length || 0})</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">
            {(chapter.resources || []).map(resource => (
              <div
                key={resource.id}
                onClick={() => setSelectedResourceId(resource.id)}
                className="bg-white rounded-xl shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer border border-slate-100 p-5 group relative"
              >
                <button
                  onClick={(e) => handleDeleteResource(resource.id, e)}
                  className="absolute top-3 right-3 text-slate-300 hover:text-red-500 transition-colors z-10"
                  title="Delete Resource"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>

                <div className="flex items-center gap-4 mb-4">
                  <div className="bg-sky-100 text-sky-600 p-3 rounded-lg">
                    {resource.type === 'image' ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    )}
                  </div>
                  <div className="overflow-hidden">
                    <h4 className="font-bold text-slate-800 truncate" title={resource.name}>{resource.name}</h4>
                    <p className="text-xs text-slate-500 uppercase font-semibold">{resource.type}</p>
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  {resource.summary && <span className="bg-sky-50 text-sky-600 text-[10px] px-2 py-1 rounded-full font-bold border border-sky-100">Summary</span>}
                  {resource.quiz && <span className="bg-emerald-50 text-emerald-600 text-[10px] px-2 py-1 rounded-full font-bold border border-emerald-100">Quiz</span>}
                  {resource.flashcards && <span className="bg-amber-50 text-amber-600 text-[10px] px-2 py-1 rounded-full font-bold border border-amber-100">Cards</span>}
                  {resource.mangaScript && <span className="bg-purple-50 text-purple-600 text-[10px] px-2 py-1 rounded-full font-bold border border-purple-100">Manga</span>}
                  {!resource.summary && !resource.quiz && !resource.flashcards && !resource.mangaScript && (
                    <span className="text-[10px] text-slate-400 font-medium italic px-1">Ready to study</span>
                  )}
                </div>
              </div>
            ))}
          </div>
          {(chapter.resources || []).length === 0 && (
            <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300 mt-6">
              <p className="text-slate-500">No resources yet. Upload a file to get started.</p>
            </div>
          )}
        </div>
      ) : (
        <div>
          <button onClick={() => setSelectedResourceId(null)} className="mb-6 inline-flex items-center gap-2 text-sm text-sky-600 hover:text-sky-700 transition-colors font-semibold">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" /></svg>
            Back to Resources
          </button>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
            <h2 className="text-3xl font-bold text-slate-800 truncate pr-4">{activeResource?.name}</h2>
            <span className="bg-slate-200 text-slate-700 text-xs font-bold px-3 py-1 rounded-full uppercase mt-2 sm:mt-0">
              {activeResource?.type} Mode
            </span>
          </div>

          <div className="bg-white/50 rounded-xl shadow-2xl p-6 sm:p-8 backdrop-blur-sm border border-slate-200 mb-20">
            <ActionButtons
              isLoading={isLoading}
              onSummarize={handleGenerateSummary}
              onQuiz={handleGenerateQuiz}
              onFlashcards={handleGenerateFlashcards}
              onAiTutor={handleAiTutor}
              onMangaScript={handleGenerateManga}
            />

            {error && <div className="mt-6 text-center text-red-700 bg-red-100 p-3 rounded-lg border border-red-200 animate-pulse">{error}</div>}

            {isLoading && (
              <div className="mt-8 flex flex-col items-center justify-center text-slate-500 p-8 bg-slate-100/50 rounded-lg">
                <Spinner />
                <p className="mt-3 text-lg font-semibold text-slate-700">{loadingMessage}</p>
                <p className="text-sm text-slate-500">Processing... this may take a moment.</p>
              </div>
            )}

            {!isLoading && activeResource && (
              <ResultDisplay
                summary={activeResource.summary}
                quiz={activeResource.quiz}
                flashcards={activeResource.flashcards}
                mangaScript={activeResource.mangaScript}
                mangaSpriteUrl={activeResource.mangaSpriteUrl}

                chatHistory={chapter.chatHistory}
                onSendMessage={handleSendMessage}
                isChatProcessing={isChatProcessing}

                activeTab={activeTab}
                setActiveTab={setActiveTab}

                onGenerateMoreQuiz={handleGenerateMoreQuiz}
                isGeneratingMoreQuiz={isGeneratingMore}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};
