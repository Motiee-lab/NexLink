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
            <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center p-4">
                 <div className="max-w-4xl w-full flex flex-col md:flex-row items-center gap-12">
                    <div className="flex-1 text-center md:text-left space-y-4">
                        <h1 className="text-5xl font-bold text-primary">NexLink</h1>
                        <p className="text-2xl text-gray-700">Connect with friends and the world around you on NexLink.</p>
                        <p className="text-sm text-gray-500 pt-4">Project Owner: Mot Mot Oyamat</p>
                    </div>
                    <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md flex flex-col gap-4">
                        <button onClick={() => setMode('login')} className="w-full bg-primary text-white font-bold py-3 px-4 rounded-lg hover:bg-primary-hover transition">
                            Log In
                        </button>
                        <button onClick={() => setMode('signup')} className="w-full bg-secondary text-white font-bold py-3 px-4 rounded-lg hover:bg-secondary-hover transition">
                            Create New Account
                        </button>
                         <button className="text-blue-500 text-sm hover:underline mt-2" onClick={handleForgotPassword}>
                            Forgot Password?
                        </button>
                    </div>
                 </div>
                 <MetaAiBubble context="User is on the landing page. If they ask to reset password, help them." />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center">
            <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
                <h2 className="text-2xl font-bold mb-6 text-center">{mode === 'login' ? 'Log In' : 'Sign Up'}</h2>
                {error && <div className="bg-red-100 text-red-700 p-2 rounded mb-4 text-sm">{error}</div>}
                
                <form onSubmit={mode === 'login' ? handleLogin : handleSignup} className="space-y-4">
                    {mode === 'signup' && (
                        <>
                            <input 
                                type="text" 
                                placeholder="Full Name" 
                                className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:border-primary"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                required
                            />
                            <div className="flex items-center gap-2">
                                <label className="block text-sm text-gray-600">Profile Picture:</label>
                                <input type="file" accept="image/*" onChange={handleAvatarChange} className="text-xs text-gray-500" />
                            </div>
                            {avatar && <img src={avatar} className="w-16 h-16 rounded-full mx-auto object-cover" />}
                        </>
                    )}
                    <input 
                        type="email" 
                        placeholder="Email address" 
                        className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:border-primary"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                    />
                    <input 
                        type="password" 
                        placeholder="Password" 
                        className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:border-primary"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                    />
                    <button type="submit" className="w-full bg-primary text-white font-bold py-3 rounded-lg hover:bg-primary-hover">
                        {mode === 'login' ? 'Log In' : 'Sign Up'}
                    </button>
                </form>
                
                <div className="mt-4 text-center border-t pt-4">
                    <button onClick={() => setMode(mode === 'login' ? 'signup' : 'login')} className="text-blue-600 hover:underline">
                        {mode === 'login' ? 'Create new account' : 'Already have an account?'}
                    </button>
                </div>
                 <div className="mt-2 text-center">
                     <button className="text-sm text-gray-500 hover:underline" onClick={() => setMode('landing')}>Back to Home</button>
                 </div>
            </div>
            <MetaAiBubble context="User is on auth forms. They might need help logging in." />
        </div>
    );
};