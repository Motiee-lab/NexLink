import React, { useState, useRef, useEffect } from 'react';
import { useDataStore, useUIStore } from '../store';
import { getClient, TOOLS, executeTool } from '../geminiService';
import { GoogleGenAI } from '@google/genai';

interface MetaAiBubbleProps {
    context?: string;
}

export const MetaAiBubble: React.FC<MetaAiBubbleProps> = ({ context }) => {
    const { isAiChatOpen, setAiChatOpen, aiChatTrigger, clearAiChatTrigger } = useUIStore();
    const [input, setInput] = useState('');
    // Simplified welcome message
    const [messages, setMessages] = useState<{role: 'user' | 'model', text: string}[]>([
        { role: 'model', text: 'Hi there! I\'m Nexus AI. How can I help you on NexLink today?' }
    ]);
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const store = useDataStore();

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages, isAiChatOpen]);

    // Handle Auto-Trigger (e.g., from Forgot Password)
    useEffect(() => {
        if (aiChatTrigger && isAiChatOpen) {
            handleSend(aiChatTrigger);
            clearAiChatTrigger();
        }
    }, [aiChatTrigger, isAiChatOpen]);

    const handleSend = async (textOverride?: string) => {
        const textToSend = textOverride || input;
        if (!textToSend.trim()) return;
        
        if (!textOverride) setInput('');
        
        setMessages(prev => [...prev, { role: 'user', text: textToSend }]);
        setLoading(true);

        try {
            const client = getClient();
            if (!client) {
                setMessages(prev => [...prev, { role: 'model', text: 'Error: API Key not configured.' }]);
                setLoading(false);
                return;
            }

            // Construct system prompt with current state awareness
            const userContext = store.users.map(u => `${u.name} (${u.email}) [ID:${u.id}]`).join(', ');
            const systemInstruction = `You are Nexus AI, a helpful virtual assistant for the social network NexLink. 
            The owner of this project is Mot Mot Oyamat.
            Current Users in Database: ${userContext}.
            
            You have administrative capabilities (creating users, resetting passwords, managing content), but you should only use them or mention them if the user specifically asks for help with those tasks.
            Otherwise, engage in natural, friendly conversation.
            
            If a user asks for a password, you MUST ask for their email first to confirm identity (simulated).
            
            ${context || ''}`;

            const response = await client.models.generateContent({
                model: 'gemini-3-flash-preview', 
                contents: [
                    ...messages.map(m => ({ role: m.role, parts: [{ text: m.text }] })),
                    { role: 'user', parts: [{ text: textToSend }] }
                ],
                config: {
                    systemInstruction,
                    tools: [{ functionDeclarations: TOOLS }]
                }
            });

            // Handle Tool Calls
            const toolCalls = response.candidates?.[0]?.content?.parts?.filter(p => p.functionCall);
            let finalText = response.text || '';

            if (toolCalls && toolCalls.length > 0) {
                for (const call of toolCalls) {
                    const fc = call.functionCall;
                    if (fc) {
                         const result = await executeTool(fc.name, fc.args);
                         finalText += `\n\n[Action Performed: ${fc.name} - Result: ${JSON.stringify(result)}]`;
                    }
                }
            }

            if (!finalText && toolCalls?.length) {
                finalText = "I've processed your request.";
            }

            setMessages(prev => [...prev, { role: 'model', text: finalText }]);

        } catch (e: any) {
            console.error(e);
            setMessages(prev => [...prev, { role: 'model', text: `Error: ${e.message || 'Connection failed'}` }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            {isAiChatOpen && (
                <div className="bg-white rounded-lg shadow-2xl w-80 h-96 mb-4 flex flex-col border border-gray-200 overflow-hidden animate-fade-in-up">
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 flex justify-between items-center text-white">
                        <div className="font-bold flex items-center gap-2">
                             <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                             Nexus AI
                        </div>
                        <button onClick={() => setAiChatOpen(false)} className="text-white hover:text-gray-200 text-xl">&times;</button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50">
                        {messages.map((m, i) => (
                            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] p-2 rounded-lg text-sm ${
                                    m.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-200 text-gray-800 rounded-bl-none'
                                }`}>
                                    {m.text}
                                </div>
                            </div>
                        ))}
                        {loading && <div className="text-xs text-gray-500 italic ml-2">Nexus AI is thinking...</div>}
                        <div ref={messagesEndRef} />
                    </div>
                    <div className="p-3 bg-white border-t border-gray-200 flex gap-2">
                        <input 
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSend()}
                            placeholder="Ask Nexus AI..."
                            className="flex-1 bg-gray-100 border-none rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <button onClick={() => handleSend()} disabled={loading} className="bg-blue-600 text-white rounded-full p-2 hover:bg-blue-700 disabled:opacity-50">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}
            <button 
                onClick={() => setAiChatOpen(!isAiChatOpen)}
                className="w-14 h-14 rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 p-[2px] shadow-lg hover:scale-110 transition-transform cursor-pointer"
            >
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/ChatGPT_logo.svg/1024px-ChatGPT_logo.svg.png" alt="AI" className="w-8 h-8 object-contain" />
                </div>
            </button>
        </div>
    );
};