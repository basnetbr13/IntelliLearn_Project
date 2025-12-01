import React, { useState, useEffect } from 'react';
// FIX: Import 'Navigate' component from 'react-router-dom'
import { Routes, Route, useNavigate, useParams, Navigate } from 'react-router-dom';
import { Course, Chapter } from '../types';
import { getCourses, saveCourse, deleteCourseFromDb, deleteSourceFiles } from '../services/db';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../services/firebase';
import { Spinner } from './Spinner';
import { ChapterView } from './ChapterView';

// ----- Dashboard Home View -----
const DashboardHome: React.FC<{ courses: Course[], onSelectCourse: (id: string) => void, onCreateCourse: (name: string) => void, onDeleteCourse: (id: string) => void }> = ({ courses, onSelectCourse, onCreateCourse, onDeleteCourse }) => {
  const [newCourseName, setNewCourseName] = useState('');
  const cardColors = ['from-sky-500 to-indigo-500', 'from-green-500 to-teal-500', 'from-purple-500 to-pink-500', 'from-yellow-500 to-orange-500'];

  return (
    <div>
      <h2 className="text-3xl font-bold text-slate-800 mb-8">My Courses</h2>
      <form onSubmit={(e) => { e.preventDefault(); if (newCourseName.trim()) { onCreateCourse(newCourseName.trim()); setNewCourseName(''); } }} className="mb-8 flex gap-4">
        <input type="text" value={newCourseName} onChange={(e) => setNewCourseName(e.target.value)} placeholder="Enter new course name..." className="flex-grow p-3 border border-slate-300 rounded-lg"/>
        <button type="submit" className="px-6 py-3 bg-sky-600 text-white font-semibold rounded-lg">Create Course</button>
      </form>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map((course, index) => (
          <div key={course.id} className={`relative p-6 rounded-xl text-white bg-gradient-to-br ${cardColors[index % cardColors.length]}`}>
            <h3 className="text-xl font-bold">{course.name}</h3>
            <p className="text-sm opacity-80 mb-4">{course.chapters.length} Chapters</p>
            <button onClick={() => onSelectCourse(course.id)} className="bg-white/20 px-4 py-2 rounded-md text-sm font-semibold">View</button>
            <button onClick={() => onDeleteCourse(course.id)} className="absolute top-4 right-4 text-white/50 hover:text-white">✕</button>
          </div>
        ))}
      </div>
    </div>
  );
};

// ----- Course Detail View -----
const CourseView: React.FC<{ courses: Course[], onCreateChapter: (name: string) => void, onDeleteChapter: (id: string) => void }> = ({ courses, onCreateChapter, onDeleteChapter }) => {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const course = courses.find(c => c.id === courseId);
    const [newChapterName, setNewChapterName] = useState('');

    if (!course) return <div>Course not found. <button onClick={() => navigate('/dashboard')}>Back</button></div>;

    return (
        <div>
            <button onClick={() => navigate('/dashboard')} className="mb-6 text-sky-600 hover:underline">&larr; Back to Dashboard</button>
            <h2 className="text-4xl font-bold mb-6">{course.name}</h2>
            <form onSubmit={(e: any) => { e.preventDefault(); const name = e.currentTarget.chapterName.value; if(name.trim()) { onCreateChapter(name.trim()); e.currentTarget.chapterName.value = ''; } }} className="mb-8 flex gap-4">
                <input name="chapterName" type="text" placeholder="New chapter name..." className="flex-grow p-3 border rounded-lg"/>
                <button type="submit" className="px-6 py-3 bg-emerald-600 text-white font-semibold rounded-lg">Add Chapter</button>
            </form>
            <div className="space-y-4">
                {course.chapters.map(chapter => (
                    <div key={chapter.id} className="bg-white p-4 rounded-lg shadow-md flex justify-between items-center">
                        <span className="font-semibold">{chapter.name}</span>
                        <div>
                            <button onClick={() => navigate(`/dashboard/course/${course.id}/chapter/${chapter.id}`)} className="text-sky-600 font-semibold mr-4">Open</button>
                            <button onClick={() => onDeleteChapter(chapter.id)} className="text-red-500">Delete</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ----- Main Dashboard Logic -----
export const Dashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (currentUser) {
        setIsLoading(true);
        getCourses(currentUser.uid).then(data => {
            setCourses(data);
            setIsLoading(false);
        });
    }
  }, [currentUser]);

  const handleSaveCourse = (updatedCourse: Course) => {
    if (currentUser) saveCourse(currentUser.uid, updatedCourse);
  };

  const handleCreateCourse = (name: string) => {
    const newCourse: Course = { id: Date.now().toString(), name, chapters: [] };
    setCourses(prev => [...prev, newCourse]);
    handleSaveCourse(newCourse);
  };

  const handleDeleteCourse = async (id: string) => {
      if (!currentUser || !window.confirm("Delete course and all its data?")) return;
      const courseToDelete = courses.find(c => c.id === id);
      if (courseToDelete) {
          const keysToDelete = courseToDelete.chapters.flatMap(ch => ch.resources.map(r => r.dbKey));
          if (keysToDelete.length > 0) await deleteSourceFiles(currentUser.uid, keysToDelete);
      }
      await deleteCourseFromDb(currentUser.uid, id);
      setCourses(prev => prev.filter(c => c.id !== id));
  };
  
  const handleCreateChapter = (courseId: string, name: string) => {
      const newChapter: Chapter = { id: Date.now().toString(), name, resources: [], chatHistory: [] };
      setCourses(prev => {
          const updated = prev.map(c => c.id === courseId ? { ...c, chapters: [...c.chapters, newChapter] } : c);
          const courseToSave = updated.find(c => c.id === courseId);
          if (courseToSave) handleSaveCourse(courseToSave);
          return updated;
      });
  };

  const handleDeleteChapter = async (courseId: string, chapterId: string) => {
    if (!currentUser) return;
    const course = courses.find(c => c.id === courseId);
    const chapter = course?.chapters.find(ch => ch.id === chapterId);
    if (chapter?.resources) await deleteSourceFiles(currentUser.uid, chapter.resources.map(r => r.dbKey));
    setCourses(prev => {
        const updated = prev.map(c => c.id === courseId ? { ...c, chapters: c.chapters.filter(ch => ch.id !== chapterId) } : c);
        const courseToSave = updated.find(c => c.id === courseId);
        if (courseToSave) handleSaveCourse(courseToSave);
        return updated;
    });
  };

  const handleUpdateChapter = (courseId: string, chapterId: string, updatedData: any) => {
    setCourses(prev => {
        const updated = prev.map(c => {
            if (c.id === courseId) {
                return { ...c, chapters: c.chapters.map(ch => ch.id === chapterId ? (typeof updatedData === 'function' ? updatedData(ch) : { ...ch, ...updatedData }) : ch) };
            }
            return c;
        });
        const courseToSave = updated.find(c => c.id === courseId);
        if (courseToSave) handleSaveCourse(courseToSave);
        return updated;
    });
  };

  const ChapterRouteWrapper = () => {
    const { courseId, chapterId } = useParams();
    const course = courses.find(c => c.id === courseId);
    const chapter = course?.chapters.find(ch => ch.id === chapterId);
    if (!chapter) return <Navigate to="/dashboard" />;
    return <ChapterView chapter={chapter} onUpdateChapter={(data: any) => handleUpdateChapter(courseId!, chapterId!, data)} onBack={() => navigate(`/dashboard/course/${courseId}`)} />;
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Spinner /></div>;

  return (
    <div className="min-h-screen p-4 sm:p-8">
      <header className="max-w-5xl mx-auto mb-10 flex justify-between items-center">
        <h1 className="text-5xl font-extrabold text-slate-800"><span className="text-sky-500">Intelli</span>Learn</h1>
        <button onClick={() => auth.signOut().then(() => navigate('/'))} className="font-semibold text-slate-600 hover:text-red-500">Log Out</button>
      </header>
      <main className="max-w-5xl mx-auto view-container">
        <Routes>
          <Route path="/" element={<DashboardHome courses={courses} onSelectCourse={(id) => navigate(`/dashboard/course/${id}`)} onCreateCourse={handleCreateCourse} onDeleteCourse={handleDeleteCourse} />} />
          <Route path="/course/:courseId" element={<CourseView courses={courses} onCreateChapter={(name) => handleCreateChapter(useParams().courseId!, name)} onDeleteChapter={(chapterId) => handleDeleteChapter(useParams().courseId!, chapterId)} />} />
          <Route path="/course/:courseId/chapter/:chapterId" element={<ChapterRouteWrapper />} />
        </Routes>
      </main>
    </div>
  );
};

