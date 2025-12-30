import React, { useState } from 'react';
import { useDataStore, useUIStore } from './store';
import { ViewState } from './types';
import { MetaAiBubble } from './components/MetaAiBubble';

export const Auth: React.FC = () => {
    const { login, signup } = useDataStore();
    const { setView, triggerAiChat } = useUIStore();
    const [mode, setMode] = useState<'landing' | 'login' | 'signup'>('landing');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [avatar, setAvatar] = useState<string | undefined>(undefined);
    const [error, setError] = useState('');

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        const user = login(email, password);
        if (user) {
            setView(ViewState.HOME);
        } else {
            setError('Invalid credentials or you have been banned.');
        }
    };

    const handleSignup = (e: React.FormEvent) => {
        e.preventDefault();
        try {
            signup(name, email, password, avatar);
            setView(ViewState.HOME);
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setAvatar(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleForgotPassword = () => {
        triggerAiChat("I forgot my password. Can you help me recover it? My email is " + (email || "[insert email here]"));
    };

    if (mode === 'landing') {
        return (
            <div className="min-h-screen flex flex-col justify-center items-center p-6 relative overflow-hidden">
                 <div className="relative z-10 max-w-6xl w-full flex flex-col md:flex-row items-center gap-16">
                    <div className="flex-1 text-center md:text-left space-y-8 animate-fade-in-up">
                        <h1 className="text-7xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-200 drop-shadow-sm">NexLink</h1>
                        <p className="text-2xl text-blue-100 font-light leading-relaxed">Experience the next generation of social connection powered by Nexus AI.</p>
                        <div className="inline-block px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white/80 text-sm font-semibold">
                            Project Owner: Mot Mot Oyamat
                        </div>
                    </div>
                    
                    <div className="glass-card p-8 md:p-10 rounded-3xl w-full max-w-md flex flex-col gap-5 animate-fade-in-up shadow-2xl">
                        <div className="text-center mb-4">
                            <h2 className="text-2xl font-bold text-slate-800">Welcome</h2>
                            <p className="text-slate-500">Join the community today</p>
                        </div>
                        <button onClick={() => setMode('login')} className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-4 px-6 rounded-xl transition-all hover:scale-[1.02] shadow-lg shadow-blue-500/30">
                            Log In
                        </button>
                        <button onClick={() => setMode('signup')} className="w-full bg-white text-slate-800 font-bold py-4 px-6 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all hover:scale-[1.02]">
                            Create New Account
                        </button>
                         <button className="text-slate-500 text-sm hover:text-primary transition-colors mt-2 font-medium" onClick={handleForgotPassword}>
                            Forgot Password?
                        </button>
                    </div>
                 </div>
                 <MetaAiBubble context="User is on the landing page. If they ask to reset password, help them." />
            </div>
        )
    }

    return (
        <div className="min-h-screen flex flex-col justify-center items-center p-4">
            <div className="glass-card p-8 md:p-10 rounded-3xl w-full max-w-md shadow-2xl animate-fade-in-up">
                <h2 className="text-3xl font-bold mb-2 text-center text-slate-800">{mode === 'login' ? 'Welcome Back' : 'Get Started'}</h2>
                <p className="text-center text-slate-500 mb-8">Please enter your details to continue</p>
                
                {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-6 text-sm font-semibold border border-red-100 flex items-center gap-2">⚠️ {error}</div>}
                
                <form onSubmit={mode === 'login' ? handleLogin : handleSignup} className="space-y-4">
                    {mode === 'signup' && (
                        <>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 ml-1 uppercase">Full Name</label>
                                <input 
                                    type="text" 
                                    className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                                {avatar ? <img src={avatar} className="w-12 h-12 rounded-full object-cover ring-2 ring-primary" /> : <div className="w-12 h-12 rounded-full bg-slate-200"></div>}
                                <label className="block text-sm text-primary font-bold cursor-pointer hover:underline">
                                    Upload Profile Picture
                                    <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                                </label>
                            </div>
                        </>
                    )}
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 ml-1 uppercase">Email</label>
                        <input 
                            type="email" 
                            className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-1">
                         <label className="text-xs font-bold text-slate-500 ml-1 uppercase">Password</label>
                        <input 
                            type="password" 
                            className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit" className="w-full bg-gradient-to-r from-primary to-blue-600 hover:to-primary text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/30 transition-all hover:scale-[1.02] mt-4">
                        {mode === 'login' ? 'Log In' : 'Sign Up'}
                    </button>
                </form>
                
                <div className="mt-8 text-center pt-6 border-t border-slate-100">
                    <button onClick={() => setMode(mode === 'login' ? 'signup' : 'login')} className="text-slate-600 hover:text-primary font-semibold transition-colors">
                        {mode === 'login' ? "Don't have an account? Sign Up" : 'Already have an account? Log In'}
                    </button>
                </div>
                 <div className="mt-4 text-center">
                     <button className="text-xs text-slate-400 hover:text-slate-600 transition-colors" onClick={() => setMode('landing')}>Back to Home</button>
                 </div>
            </div>
            <MetaAiBubble context="User is on auth forms. They might need help logging in." />
        </div>
    );
};