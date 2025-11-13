export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
}

export interface Flashcard {
  term: string;
  definition: string;
}

export interface MangaPanel {
  caption: string;
  imageUrl: string | null;
  panelPrompt?: string;
}

export interface Chapter {
  id: string;
  name:string;
  sourceFile: {
    name: string;
    content: string;
    type: 'text' | 'image' | 'file';
    mimeType?: string;
  } | null;
  summary: string | null;
  quiz: QuizQuestion[] | null;
  flashcards: Flashcard[] | null;
  mangaScript: MangaPanel[] | null;
}

export interface Course {
    id: string;
    name: string;
    chapters: Chapter[];
}

export type ActiveTab = 'summary' | 'quiz' | 'flashcards' | 'manga';