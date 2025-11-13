import React, { useCallback, useState } from 'react';

interface FileUploadProps {
  onFileSelect: (file: File, content: string, type: 'text' | 'image' | 'file', mimeType?: string) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    const fileMimeType = file.type;
    const supportedFileTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ];
    if (fileMimeType.startsWith('image/')) {
      setIsProcessing(true);
      const reader = new FileReader();
      reader.onload = (e) => {
        onFileSelect(file, e.target?.result as string, 'image', fileMimeType);
        setIsProcessing(false);
      };
      reader.onerror = () => {
        alert('Failed to read the image file.');
        setIsProcessing(false);
      }
      reader.readAsDataURL(file);
    } else if (fileMimeType === 'text/plain') {
      setIsProcessing(true);
      const reader = new FileReader();
      reader.onload = (e) => {
        onFileSelect(file, e.target?.result as string, 'text');
        setIsProcessing(false);
      };
      reader.onerror = () => {
        alert('Failed to read the text file.');
        setIsProcessing(false);
      }
      reader.readAsText(file);
    } else if (supportedFileTypes.includes(fileMimeType)) {
        setIsProcessing(true);
        const reader = new FileReader();
        reader.onload = (e) => {
            onFileSelect(file, e.target?.result as string, 'file', fileMimeType);
            setIsProcessing(false);
        };
        reader.onerror = () => {
            alert('Failed to read the file.');
            setIsProcessing(false);
        }
        reader.readAsDataURL(file);
    } else {
      alert('Unsupported file type. Please upload a PDF, DOCX, PPTX, .txt, .jpg, or .png file.');
    }
  }, [onFileSelect]);

  const onDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (event.dataTransfer.files && event.dataTransfer.files[0] && !isProcessing) {
      handleFile(event.dataTransfer.files[0]);
    }
  }, [handleFile, isProcessing]);

  const onDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!isProcessing) setIsDragging(true);
  };

  const onDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };
  
  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0] && !isProcessing) {
      handleFile(event.target.files[0]);
    }
  };

  return (
    <div
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      className={`relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-xl transition-all duration-300
        ${isDragging ? 'border-sky-500 bg-sky-100/50 scale-105 shadow-2xl shadow-sky-500/20' : 'border-slate-300 hover:border-slate-400 bg-white/50'}
        ${isProcessing ? 'cursor-wait opacity-70' : 'cursor-pointer'}`}
    >
        <div className="absolute inset-0 bg-grid-slate-200/50 [mask-image:linear-gradient(0deg,#fff,rgba(255,255,255,0))]"></div>
        <input 
            type="file" 
            id="file-upload" 
            className="hidden" 
            accept=".txt,.jpg,.jpeg,.png,.pdf, .docx, .pptx"
            onChange={onFileChange}
            disabled={isProcessing}
        />
        <label htmlFor="file-upload" className={`z-10 flex flex-col items-center justify-center w-full h-full p-8 text-center ${isProcessing ? 'cursor-wait' : 'cursor-pointer'}`}>
            {isProcessing ? (
                <>
                    <svg className="w-12 h-12 mb-4 text-sky-500 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-lg font-semibold text-slate-700">Preparing file...</p>
                    <p className="text-sm text-slate-500">Please hang tight.</p>
                </>
            ) : (
                <>
                    <svg className={`w-12 h-12 mb-4 text-slate-400 transition-transform duration-300 ${isDragging ? 'scale-125 -translate-y-2 text-sky-500' : ''}`} aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                    </svg>
                    <p className="mb-2 text-md text-slate-600"><span className="font-bold text-sky-600">Click to upload</span> or drag and drop</p>
                    <p className="text-xs text-slate-400">PDF, DOCX, PPTX, TXT, JPG, or PNG</p>
                </>
            )}
        </label>
    </div>
  );
};