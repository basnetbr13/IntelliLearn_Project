import React, { useState } from 'react';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';
import { Link, useNavigate } from 'react-router-dom';
import { Spinner } from './Spinner';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
        await signInWithEmailAndPassword(auth, email, password);
        navigate('/dashboard');
    } catch (err: any) {
        let message = "Failed to log in. Please check your credentials.";
        if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
            message = "Invalid email or password.";
        }
        setError(message);
        console.error(err);
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
        await signInWithPopup(auth, googleProvider);
        navigate('/dashboard');
    } catch (err: any) {
        setError('Failed to sign in with Google. ' + err.message);
        console.error(err);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
        <h2 className="text-3xl font-bold text-slate-800 mb-2 text-center">Welcome Back</h2>
        <p className="text-slate-500 text-center mb-8">Sign in to continue learning</p>
        
        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm text-center font-medium">{error}</div>}
        
        <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
                <label className="text-sm font-bold text-slate-600">Email Address</label>
                <input 
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full mt-1 p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-300 focus:outline-none"
                />
            </div>
             <div>
                <label className="text-sm font-bold text-slate-600">Password</label>
                <input 
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full mt-1 p-3 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-300 focus:outline-none"
                />
            </div>
            <button 
                type="submit"
                disabled={loading}
                className="w-full bg-sky-600 text-white font-bold py-3.5 rounded-xl hover:bg-sky-700 transition flex justify-center items-center gap-3 disabled:bg-slate-400"
            >
                {loading ? <Spinner small /> : 'Log In'}
            </button>
        </form>

        <div className="my-6 flex items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-4 text-slate-400 text-sm font-semibold">OR</span>
            <div className="flex-grow border-t border-slate-200"></div>
        </div>

        <button 
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-white text-slate-700 border border-slate-300 font-bold py-3.5 rounded-xl hover:bg-slate-50 transition flex justify-center items-center gap-3"
        >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
            Sign in with Google
        </button>
        
        <div className="mt-6 text-center text-slate-600">
            Don't have an account? <Link to="/signup" className="text-sky-600 font-bold hover:underline">Sign Up</Link>
        </div>
      </div>
    </div>
  );
};
