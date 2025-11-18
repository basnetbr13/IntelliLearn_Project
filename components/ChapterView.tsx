
import React, { useState, useCallback, useEffect } from 'react';
import { Chapter, GenerationType } from '../types';
import * as geminiService from '../services/geminiService';
import * as db from '../services/db';
import FileUpload from './FileUpload';
import ActionButtons from './ActionButtons';
import ResultDisplay from './ResultDisplay';
import Spinner from './Spinner';
import PdfPreviewer from './PdfPreviewer';

// jsPDF is loaded from a script tag in index.html
declare const jsPDF: any;

interface ChapterViewProps {
  chapter: Chapter;
  onUpdateChapter: (updatedChapter: Chapter) => void;
  onBack: () => void;
}

const ChapterView: React.FC<ChapterViewProps> = ({ chapter, onUpdateChapter, onBack }) => {
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isConvertingToPdf, setIsConvertingToPdf] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [generatingType, setGeneratingType] = useState<GenerationType | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Effect to cleanup blob URL on component unmount
  useEffect(() => {
    return () => {
      if (pdfPreviewUrl) {
        URL.revokeObjectURL(pdfPreviewUrl);
      }
    };
  }, [pdfPreviewUrl]);

  const handleFileSelect = useCallback((file: File) => {
    setSourceFile(file);
    // Reset chapter content when a new file is uploaded
    onUpdateChapter({
        ...chapter,
        sourceContent: '',
        sourceFileName: file.name,
        generatedPdfKey: undefined,
        generatedContent: { summary: '', quiz: [], flashcards: [], mangaScript: [] }
    });
  }, [chapter, onUpdateChapter]);
  
  const handleRemoveFile = async () => {
    setSourceFile(null);
    const keysToDelete: string[] = [];
    if (chapter.generatedPdfKey) {
        keysToDelete.push(chapter.generatedPdfKey);
    }
    if (keysToDelete.length > 0) {
        await db.deletePdfs(keysToDelete);
    }
    onUpdateChapter({
        ...chapter,
        sourceContent: '',
        sourceFileName: undefined,
        generatedPdfKey: undefined,
        generatedContent: { summary: '', quiz: [], flashcards: [], mangaScript: [] }
    });
  };

  const handleProcessFile = useCallback(async () => {
    if (!sourceFile) return;
    setIsProcessingFile(true);
    setError(null);
    try {
      const content = await geminiService.extractTextFromContent(sourceFile);
      onUpdateChapter({ ...chapter, sourceContent: content, sourceFileName: sourceFile.name });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An unknown error occurred during file processing.');
    } finally {
      setIsProcessingFile(false);
    }
  }, [chapter, onUpdateChapter, sourceFile]);

  const handleConvertToPdf = async () => {
    if (!sourceFile) return;

    setIsConvertingToPdf(true);
    setError(null);

    try {
      const doc = new jsPDF();
      
      if (sourceFile.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const imgData = event.target?.result as string;
          const img = new Image();
          img.src = imgData;
          img.onload = async () => {
            const pdfWidth = doc.internal.pageSize.getWidth();
            const pdfHeight = doc.internal.pageSize.getHeight();
            const ratio = Math.min(pdfWidth / img.width, pdfHeight / img.height);
            const imgWidth = img.width * ratio;
            const imgHeight = img.height * ratio;
            const x = (pdfWidth - imgWidth) / 2;
            const y = (pdfHeight - imgHeight) / 2;
            doc.addImage(imgData, 'JPEG', x, y, imgWidth, imgHeight);
            finalizePdf(doc);
          }
        };
        reader.readAsDataURL(sourceFile);
      } else if (sourceFile.type === 'text/plain') {
        const text = await sourceFile.text();
        const splitText = doc.splitTextToSize(text, 180);
        doc.text(splitText, 10, 10);
        finalizePdf(doc);
      }

    } catch (e) {
      setError(e instanceof Error ? e.message : 'An error occurred during PDF conversion.');
      setIsConvertingToPdf(false);
    }
    
    async function finalizePdf(doc: any) {
        const pdfBlob = doc.output('blob');
        const pdfKey = `${chapter.id}-generated-pdf`;
        await db.savePdf(pdfKey, pdfBlob);
        onUpdateChapter({ ...chapter, generatedPdfKey: pdfKey });
        
        const url = URL.createObjectURL(pdfBlob);
        setPdfPreviewUrl(url);
        setShowPdfPreview(true);
        setIsConvertingToPdf(false);
    }
  };

  const handleGenerate = useCallback(async (type: GenerationType) => {
    setGeneratingType(type);
    setError(null);
    try {
      let updatedChapter = { ...chapter };
      switch (type) {
        case 'summary':
          const summary = await geminiService.generateSummary(chapter.sourceContent);
          updatedChapter.generatedContent.summary = summary;
          break;
        case 'quiz':
          const quiz = await geminiService.generateQuiz(chapter.sourceContent);
          updatedChapter.generatedContent.quiz = quiz;
          break;
        case 'flashcards':
          const flashcards = await geminiService.generateFlashcards(chapter.sourceContent);
          updatedChapter.generatedContent.flashcards = flashcards;
          break;
        case 'manga':
          const script = await geminiService.generateMangaScript(chapter.sourceContent);
          updatedChapter.generatedContent.mangaScript = script.map(panel => ({ ...panel, imageUrl: undefined }));
          onUpdateChapter(updatedChapter);

          const updatedScriptWithKeys = [...script];
          for (let i = 0; i < script.length; i++) {
            try {
              const panel = script[i];
              const imageKey = `${chapter.id}-${panel.id}`;
              // Fixed: Using the correct exported function name 'generateMangaImage'
              const base64Image = await geminiService.generateMangaImage(panel.description);
              await db.saveImage(imageKey, base64Image);
              updatedScriptWithKeys[i] = { ...panel, imageUrl: imageKey };
              onUpdateChapter({ ...updatedChapter, generatedContent: { ...updatedChapter.generatedContent, mangaScript: [...updatedScriptWithKeys] }});
            } catch (imgErr) {
               console.error(`Failed to generate image for panel ${i+1}:`, imgErr);
            }
          }
          return;
      }
      onUpdateChapter(updatedChapter);
    } catch (e) {
      setError(e instanceof Error ? e.message : `An unknown error occurred during ${type} generation.`);
    } finally {
      setGeneratingType(null);
    }
  }, [chapter, onUpdateChapter]);
  
  const canConvertToPdf = sourceFile && sourceFile.type !== 'application/pdf';

  return (
    <>
      {showPdfPreview && pdfPreviewUrl && sourceFile && (
        <PdfPreviewer
          pdfUrl={pdfPreviewUrl}
          fileName={sourceFile.name}
          onClose={() => setShowPdfPreview(false)}
        />
      )}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button onClick={onBack} className="mb-6 text-sm font-medium text-sky-600 dark:text-sky-400 hover:underline">
          &larr; Back to Course
        </button>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{chapter.title}</h1>
        
        {error && (
          <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md" role="alert">
            <p className="font-bold">An Error Occurred</p>
            <p>{error}</p>
          </div>
        )}

        <div className="mt-8 p-6 bg-white dark:bg-slate-800/50 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-4">1. Upload Source Material</h2>
          {chapter.sourceFileName ? (
             <div className="p-4 rounded-md bg-slate-100 dark:bg-slate-700">
               <div className="flex justify-between items-center">
                 <p className="text-slate-700 dark:text-slate-300">
                    <span className="font-medium">File:</span> {chapter.sourceFileName}
                 </p>
                 <button onClick={handleRemoveFile} className="text-sm text-red-500 hover:underline">
                   Remove
                 </button>
               </div>
               <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-600 flex gap-4">
                  <button onClick={handleProcessFile} disabled={isProcessingFile || !!chapter.sourceContent} className="px-4 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 disabled:bg-slate-400 dark:disabled:bg-slate-500 disabled:cursor-not-allowed flex items-center">
                    {isProcessingFile && <Spinner size="sm" />}
                    <span className="ml-2">{chapter.sourceContent ? 'Content Processed' : 'Process Content'}</span>
                  </button>
                  <button onClick={handleConvertToPdf} disabled={!canConvertToPdf || isConvertingToPdf} className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-200 dark:bg-slate-600 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-500 disabled:bg-slate-300 dark:disabled:bg-slate-500 disabled:cursor-not-allowed flex items-center">
                    {isConvertingToPdf && <Spinner size="sm" />}
                    <span className="ml-2">Convert & Preview PDF</span>
                  </button>
               </div>
             </div>
          ) : (
            <FileUpload onFileUpload={handleFileSelect} isProcessing={isProcessingFile} />
          )}
        </div>

        <div className="mt-8 p-6 bg-white dark:bg-slate-800/50 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">2. Generate Study Aids</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Once your material is processed, use the power of AI to create study aids.
          </p>
          <ActionButtons onGenerate={handleGenerate} generatingType={generatingType} hasContent={!!chapter.sourceContent} />
        </div>

        <div className="mt-8">
          <ResultDisplay content={chapter.generatedContent} />
        </div>
      </div>
    </>
  );
};

export default ChapterView;
