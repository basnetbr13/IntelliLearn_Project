import React from 'react';
import { MangaPanel } from '../types';
import { Spinner } from './Spinner';

interface MangaViewerProps {
  script: MangaPanel[];
}

const Panel: React.FC<{ panel: MangaPanel }> = ({ panel }) => {
  const renderImageContent = () => {
    if (panel.imageUrl === 'error') {
      return (
        <div className="flex flex-col items-center text-red-500">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="mt-2 text-xs font-semibold">Failed</span>
        </div>
      );
    }
    if (panel.imageUrl) {
      return (
        <img
          src={panel.imageUrl}
          alt={panel.panelPrompt || 'Manga panel'}
          className="w-full h-full object-cover"
        />
      );
    }
    return (
      <div className="flex flex-col items-center text-slate-400">
        <Spinner small />
        <span className="mt-2 text-xs">Generating...</span>
      </div>
    );
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-lg flex flex-col transition-all duration-300 hover:border-purple-400 hover:shadow-purple-500/20 hover:-translate-y-1">
      <div className="aspect-square w-full bg-slate-100 flex items-center justify-center overflow-hidden">
        {renderImageContent()}
      </div>
      <div className="p-4 flex-grow flex flex-col justify-center">
        <p className="text-sm text-slate-800 bg-slate-50 p-3 rounded-md border-l-4 border-slate-300">
            {panel.caption}
        </p>
      </div>
    </div>
  );
};

export const MangaViewer: React.FC<MangaViewerProps> = ({ script }) => {
  return (
    <div>
      <h3 className="text-2xl font-bold text-purple-600 my-4">Learning Manga</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {script.map((panel, index) => (
          <Panel key={index} panel={panel} />
        ))}
      </div>
    </div>
  );
};