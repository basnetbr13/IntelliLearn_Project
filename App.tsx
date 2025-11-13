import React, { useState, useEffect } from 'react';
import { Course, Chapter } from './types';
import { ChapterView } from './components/ChapterView';

// --- LocalStorage Service ---
const storage = {
  getCourses: (): Course[] => {
    try {
      const coursesJson = localStorage.getItem('intelliLearnCourses');
      return coursesJson ? JSON.parse(coursesJson) : [];
    } catch (error) {
      console.error("Failed to parse courses from localStorage", error);
      return [];
    }
  },
  saveCourses: (courses: Course[]) => {
    localStorage.setItem('intelliLearnCourses', JSON.stringify(courses));
  }
};

// --- View Components ---

const DashboardView: React.FC<{ courses: Course[], onSelectCourse: (id: string) => void, onCreateCourse: (name: string) => void, onDeleteCourse: (id: string) => void }> = ({ courses, onSelectCourse, onCreateCourse, onDeleteCourse }) => {
    const [newCourseName, setNewCourseName] = useState('');
    const cardColors = [
        'from-sky-500 to-indigo-500',
        'from-green-500 to-teal-500',
        'from-purple-500 to-pink-500',
        'from-yellow-500 to-orange-500',
    ];

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        if (newCourseName.trim()) {
            onCreateCourse(newCourseName.trim());
            setNewCourseName('');
        }
    };

    return (
        <div>
            <h2 className="text-3xl font-bold mb-6 text-slate-800">My Courses</h2>
            <form onSubmit={handleCreate} className="mb-8 flex gap-4">
                <input
                    type="text"
                    value={newCourseName}
                    onChange={(e) => setNewCourseName(e.target.value)}
                    placeholder="Enter new course name..."
                    className="flex-grow p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none transition"
                />
                <button type="submit" className="px-6 py-3 bg-sky-600 text-white font-semibold rounded-lg hover:bg-sky-700 transition-colors">
                    Create Course
                </button>
            </form>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map((course, index) => (
                    <div key={course.id} className={`relative p-6 rounded-xl text-white bg-gradient-to-br ${cardColors[index % cardColors.length]} shadow-lg overflow-hidden`}>
                        <h3 className="text-xl font-bold mb-2">{course.name}</h3>
                        <p className="text-sm opacity-80 mb-4">{course.chapters.length} {course.chapters.length === 1 ? 'Chapter' : 'Chapters'}</p>
                        <button onClick={() => onSelectCourse(course.id)} className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-md text-sm font-semibold transition">View Course</button>
                         <button onClick={() => onDeleteCourse(course.id)} className="absolute top-4 right-4 text-white/50 hover:text-white transition">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

const CourseView: React.FC<{ course: Course, onSelectChapter: (id: string) => void, onCreateChapter: (name: string) => void, onDeleteChapter: (id: string) => void, onBack: () => void }> = ({ course, onSelectChapter, onCreateChapter, onDeleteChapter, onBack }) => {
    const [newChapterName, setNewChapterName] = useState('');

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        if (newChapterName.trim()) {
            onCreateChapter(newChapterName.trim());
            setNewChapterName('');
        }
    };
    
    return (
        <div>
            <button onClick={onBack} className="mb-6 inline-flex items-center gap-2 text-sm text-sky-600 hover:text-sky-700 transition-colors font-semibold">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                Back to Courses
            </button>
            <h2 className="text-4xl font-bold mb-2 text-slate-800">{course.name}</h2>
            <p className="text-slate-600 mb-8">Manage chapters for this course.</p>
            <form onSubmit={handleCreate} className="mb-8 flex gap-4">
                 <input
                    type="text"
                    value={newChapterName}
                    onChange={(e) => setNewChapterName(e.target.value)}
                    placeholder="Enter new chapter name..."
                    className="flex-grow p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:outline-none transition"
                />
                <button type="submit" className="px-6 py-3 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition-colors">Add Chapter</button>
            </form>
             <div className="space-y-4">
                {course.chapters.map(chapter => (
                    <div key={chapter.id} className="bg-white p-4 rounded-lg shadow-md flex justify-between items-center border border-slate-200">
                        <span className="font-semibold text-slate-700">{chapter.name}</span>
                        <div>
                             <button onClick={() => onSelectChapter(chapter.id)} className="text-sky-600 hover:text-sky-800 font-semibold transition-colors mr-4">Open</button>
                            <button onClick={() => onDeleteChapter(chapter.id)} className="text-red-500 hover:text-red-700 transition-colors">Delete</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}


const App: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [view, setView] = useState<'DASHBOARD' | 'COURSE' | 'CHAPTER'>('DASHBOARD');
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);

  useEffect(() => {
    setCourses(storage.getCourses());
  }, []);

  useEffect(() => {
    // Only save when courses have been loaded initially.
    // This prevents wiping storage on the first render.
    if (courses.length > 0) {
      storage.saveCourses(courses);
    }
  }, [courses]);

  const handleCreateCourse = (name: string) => {
    const newCourse: Course = {
      id: Date.now().toString(),
      name,
      chapters: [],
    };
    setCourses(prev => [...prev, newCourse]);
  };
  
  const handleDeleteCourse = (id: string) => {
    if (window.confirm("Are you sure you want to delete this course and all its chapters?")) {
        const newCourses = courses.filter(c => c.id !== id);
        setCourses(newCourses);
        // If the deleted course was the last one, localStorage would be empty.
        // We need to explicitly save the empty array.
        storage.saveCourses(newCourses);
    }
  }

  const handleCreateChapter = (courseId: string, name: string) => {
    const newChapter: Chapter = {
      id: Date.now().toString(),
      name,
      sourceFile: null,
      summary: null,
      quiz: null,
      flashcards: null,
      mangaScript: null,
    };
    setCourses(prev => prev.map(c => c.id === courseId ? { ...c, chapters: [...c.chapters, newChapter] } : c));
  };
  
  const handleDeleteChapter = (courseId: string, chapterId: string) => {
      setCourses(prev => prev.map(c => c.id === courseId ? {...c, chapters: c.chapters.filter(ch => ch.id !== chapterId)} : c));
  }

  const handleUpdateChapter = (courseId: string, chapterId: string, updatedData: Partial<Chapter> | { [K in keyof Chapter]?: (prevState: Chapter[K]) => Chapter[K] }) => {
    setCourses(prevCourses => prevCourses.map(course => {
        if (course.id !== courseId) {
            return course;
        }

        return {
            ...course,
            chapters: course.chapters.map(chapter => {
                if (chapter.id !== chapterId) {
                    return chapter;
                }

                // Create a new chapter object to avoid direct mutation
                const newChapter = { ...chapter };

                // Iterate over the keys in the update data
                for (const key in updatedData) {
                    const typedKey = key as keyof Chapter;
                    const value = updatedData[typedKey];
                    
                    // Check if the value is a function (a state updater)
                    if (typeof value === 'function') {
                        // @ts-ignore: TypeScript struggles with this dynamic type, but the logic is sound.
                        newChapter[typedKey] = value(chapter[typedKey]);
                    } else {
                        // @ts-ignore: Same as above.
                        newChapter[typedKey] = value;
                    }
                }
                return newChapter;
            }),
        };
    }));
  };
  
  const selectedCourse = courses.find(c => c.id === selectedCourseId);
  const selectedChapter = selectedCourse?.chapters.find(ch => ch.id === selectedChapterId);

  const renderContent = () => {
    if (view === 'CHAPTER' && selectedCourse && selectedChapter) {
        return <ChapterView 
            chapter={selectedChapter} 
            onUpdateChapter={(data) => handleUpdateChapter(selectedCourse.id, selectedChapter.id, data)}
            onBack={() => setView('COURSE')}
        />;
    }
    if (view === 'COURSE' && selectedCourse) {
        return <CourseView 
            course={selectedCourse} 
            onSelectChapter={(id) => { setSelectedChapterId(id); setView('CHAPTER'); }}
            onCreateChapter={(name) => handleCreateChapter(selectedCourse.id, name)}
            onDeleteChapter={(id) => handleDeleteChapter(selectedCourse.id, id)}
            onBack={() => setView('DASHBOARD')}
        />;
    }
    return <DashboardView 
        courses={courses} 
        onSelectCourse={(id) => { setSelectedCourseId(id); setView('COURSE'); }}
        onCreateCourse={handleCreateCourse}
        onDeleteCourse={handleDeleteCourse}
    />;
  }
  
  return (
    <div className="min-h-screen p-4 sm:p-8">
      <header className="max-w-5xl mx-auto mb-10">
        <h1 className="text-5xl font-extrabold text-slate-800">
          <span className="text-sky-500">Intelli</span>Learn
        </h1>
        <p className="mt-2 text-slate-600">Your personal AI-powered learning assistant.</p>
      </header>
      <main className="max-w-5xl mx-auto view-container">
          {renderContent()}
      </main>
    </div>
  );
};

export default App;