import React from 'react';
import { Link } from 'react-router-dom';

export const Home: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="max-w-7xl mx-auto w-full px-6 py-6 flex justify-between items-center">
        <h1 className="text-3xl font-extrabold text-slate-800">
            <span className="text-sky-500">Intelli</span>Learn
        </h1>
        <div className="space-x-4">
            <Link to="/login" className="text-slate-600 hover:text-sky-600 font-semibold transition">Log In</Link>
            <Link to="/signup" className="bg-sky-500 hover:bg-sky-600 text-white px-5 py-2.5 rounded-lg font-bold transition shadow-lg shadow-sky-500/30">Get Started</Link>
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center px-4">
        <div className="max-w-4xl mx-auto text-center">
            <span className="bg-sky-100 text-sky-600 px-4 py-1.5 rounded-full text-sm font-bold tracking-wide uppercase mb-6 inline-block">
                AI-Powered Learning
            </span>
            <h2 className="text-5xl md:text-7xl font-extrabold text-slate-900 mb-8 leading-tight">
                Turn any content into <br className="hidden md:block"/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-indigo-600">mastery.</span>
            </h2>
            <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
                Upload PDFs, documents, or images. IntelliLearn automatically generates summaries, interactive quizzes, flashcards, and AI tutoring sessions to help you learn faster.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/signup" className="w-full sm:w-auto px-8 py-4 bg-slate-900 text-white text-lg font-bold rounded-xl hover:bg-slate-800 transition transform hover:-translate-y-1 shadow-xl">
                    Create Free Account
                </Link>
                <a href="#features" className="w-full sm:w-auto px-8 py-4 bg-white text-slate-700 border border-slate-200 text-lg font-bold rounded-xl hover:bg-slate-50 transition">
                    Learn More
                </a>
            </div>
        </div>
      </main>
      
      <div id="features" className="bg-white py-24 border-t border-slate-200">
          <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-3 gap-12 text-center">
              <div className="p-6">
                  <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6 text-2xl">⚡</div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">Instant Summaries</h3>
                  <p className="text-slate-600">Cut through the noise. Get precise, structured summaries of lengthy lecture notes or textbooks in seconds.</p>
              </div>
              <div className="p-6">
                  <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 text-2xl">🧠</div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">Active Recall</h3>
                  <p className="text-slate-600">Reinforce your knowledge with automatically generated quizzes and 3D flashcards tailored to your material.</p>
              </div>
              <div className="p-6">
                  <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-6 text-2xl">🤖</div>
                  <h3 className="text-xl font-bold text-slate-900 mb-3">AI Tutor</h3>
                  <p className="text-slate-600">Have questions? Chat with an AI that has studied your specific documents and can explain complex topics.</p>
              </div>
          </div>
      </div>
    </div>
  );
};