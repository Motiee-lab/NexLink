import React, { useState, useEffect, useRef } from 'react';
import { useDataStore, useUIStore } from '../store';
import { getClient, executeTool, TOOLS } from '../geminiService';
import { Chat as ChatType } from '../types';

export const Chat: React.FC = () => {
    const { chats, users, currentUser, createChat } = useDataStore();
    const { activeChatId, setActiveChat } = useUIStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [showArchived, setShowArchived] = useState(false);

    // Filter chats based on membership and archive status
    const myChats = chats.filter(c => {
        const isMember = c.members.includes(currentUser!.id);
        const isArchived = c.archivedBy?.includes(currentUser!.id);
        return isMember && (showArchived ? isArchived : !isArchived);
    }).sort((a,b) => (b.lastMessageAt || 0) - (a.lastMessageAt || 0));

    // Determine chat name
    const getChatName = (chat: ChatType) => {
        if (chat.type === 'group') return chat.name || 'Group Chat';
        const otherId = chat.members.find(id => id !== currentUser!.id);
        const other = users.find(u => u.id === otherId);
        return other?.name || 'Unknown';
    };

    const getChatImage = (chat: ChatType) => {
        if (chat.type === 'group') return chat.image || 'https://picsum.photos/seed/group/50/50';
        const otherId = chat.members.find(id => id !== currentUser!.id);
        const other = users.find(u => u.id === otherId);
        return other?.avatar;
    };

    const isUserOnline = (chat: ChatType) => {
        if (chat.type === 'group') return false; // Groups don't show single status
        const otherId = chat.members.find(id => id !== currentUser!.id);
        const other = users.find(u => u.id === otherId);
        // Simple logic: online if recent activity or manual flag
        return other?.isOnline || (other?.lastActive && Date.now() - other.lastActive < 60000); // 1 min timeout
    };

    const handleCreateChat = (userId: string) => {
        const chat = createChat([currentUser!.id, userId], 'private');
        setActiveChat(chat.id);
    };

    if (activeChatId) {
        return <ChatWindow />;
    }

    return (
        <div className="max-w-4xl w-full flex bg-white rounded-lg shadow overflow-hidden h-[80vh]">
            <div className="w-full md:w-1/3 border-r flex flex-col">
                <div className="p-4 border-b space-y-3">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold">Chats</h2>
                        <button onClick={() => setShowArchived(!showArchived)} className="text-xs text-blue-500 font-semibold hover:underline">
                            {showArchived ? 'View Active' : 'View Archived'}
                        </button>
                    </div>
                    <input 
                        className="w-full bg-gray-100 rounded-full px-4 py-2 outline-none"
                        placeholder="Search Messenger"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex-1 overflow-y-auto">
                    {/* Active Chats List */}
                    {myChats.map(chat => {
                        const unread = chat.unreadCounts?.[currentUser!.id] || 0;
                        const online = isUserOnline(chat);
                        return (
                            <div key={chat.id} onClick={() => setActiveChat(chat.id)} className={`flex items-center gap-3 p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-50 ${unread > 0 ? 'bg-blue-50' : ''}`}>
                                <div className="relative">
                                    <img src={getChatImage(chat)} className="w-12 h-12 rounded-full object-cover" />
                                    {online && (
                                        <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full w-3 h-3 border-2 border-white"></div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-baseline">
                                        <h4 className={`truncate ${unread > 0 ? 'font-bold text-black' : 'font-semibold text-gray-800'}`}>{getChatName(chat)}</h4>
                                        <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                                            {chat.lastMessageAt ? new Date(chat.lastMessageAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <p className={`text-xs truncate ${unread > 0 ? 'font-bold text-gray-900' : 'text-gray-400'}`}>
                                            {unread > 0 ? `${unread} new messages` : 'Click to view'}
                                        </p>
                                        {unread > 0 && (
                                            <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unread}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                    
                    {/* Start new chat section */}
                    <div className="p-2 bg-gray-50 text-xs font-bold text-gray-500 uppercase mt-2">Start a new conversation</div>
                    {users
                        .filter(u => u.id !== currentUser?.id && u.name.toLowerCase().includes(searchTerm.toLowerCase()) && !currentUser?.blockedUsers?.includes(u.id))
                        .slice(0, 10)
                        .map(user => (
                        <div key={user.id} onClick={() => handleCreateChat(user.id)} className="flex items-center gap-3 p-3 hover:bg-gray-100 cursor-pointer">
                            <img src={user.avatar} className="w-10 h-10 rounded-full object-cover" />
                            <div>
                                <span className="block font-semibold">{user.name}</span>
                                {user.isAi && <span className="text-[10px] bg-purple-100 text-purple-700 px-1 rounded uppercase font-bold">Nexus AI</span>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="hidden md:flex items-center justify-center flex-1 bg-gray-50 text-gray-400 font-medium">
                Select a chat to start messaging
            </div>
        </div>
    );
};

const ChatWindow: React.FC = () => {
    const { activeChatId, setActiveChat } = useUIStore();
    const { chats, messages, sendMessage, users, currentUser, markChatRead, archiveChat, unarchiveChat, 
            updateGroupInfo, addGroupMember, removeGroupMember, makeGroupAdmin, leaveGroup } = useDataStore();
    const [inputText, setInputText] = useState('');
    const [pendingImage, setPendingImage] = useState<string | null>(null);
    const [isTyping, setIsTyping] = useState(false);
    const [showGroupSettings, setShowGroupSettings] = useState(false);
    
    // Group settings state
    const [groupName, setGroupName] = useState('');
    const [memberSearch, setMemberSearch] = useState('');

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const chat = chats.find(c => c.id === activeChatId);
    const chatMessages = messages.filter(m => m.chatId === activeChatId).sort((a, b) => a.timestamp - b.timestamp);
    const isArchived = chat?.archivedBy?.includes(currentUser!.id);

    useEffect(() => {
        if (activeChatId && currentUser) {
            markChatRead(activeChatId, currentUser.id);
        }
    }, [activeChatId, chatMessages.length]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages, isTyping]);

    // Simple Markdown Renderer
    const renderMarkdown = (text: string) => {
        let html = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
        return <div dangerouslySetInnerHTML={{ __html: html.replace(/\n/g, '<br/>') }} />;
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setPendingImage(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleSend = async () => {
        if (!inputText.trim() && !pendingImage) return;
        
        const currentText = inputText;
        sendMessage(activeChatId!, currentUser!.id, currentText, pendingImage || undefined);
        setInputText('');
        setPendingImage(null);

        if (!chat) return;

        // AI Reply Logic
        const others = chat.members.filter(m => m !== currentUser!.id);
        for (const otherId of others) {
            const user = users.find(u => u.id === otherId);
            if (user && (user.isAi || user.isAiControlled)) {
                setIsTyping(true);
                triggerAiResponse(user, currentText);
            }
        }
    };

    const triggerAiResponse = async (aiUser: any, userMessage: string) => {
        try {
            const client = getClient();
            if (!client) {
                setIsTyping(false);
                return;
            }

            const history = chatMessages.slice(-10).map(m => {
                const sender = users.find(u => u.id === m.senderId);
                return `${sender?.name}: ${m.content}`;
            }).join('\n');

            const systemPrompt = aiUser.isAi 
                ? `You are Nexus AI, the intelligent assistant for NexLink. You have system capabilities to manage the platform if requested, but otherwise, engage in a friendly, helpful manner without listing your powers. Current Chat History:\n${history}`
                : `You are playing the role of ${aiUser.name}. You are a user on this platform. Reply naturally to the last message. Current Chat History:\n${history}`;

            const response = await client.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: [{ parts: [{ text: `User said: ${userMessage}. \n${systemPrompt}` }] }],
                config: {
                    tools: aiUser.isAi ? [{ functionDeclarations: TOOLS }] : undefined,
                }
            });

            const toolCalls = response.candidates?.[0]?.content?.parts?.filter(p => p.functionCall);
            let replyText = response.text || '';

            if (toolCalls && toolCalls.length > 0) {
                for (const call of toolCalls) {
                    const result = await executeTool(call.functionCall!.name, call.functionCall!.args);
                    replyText += `\n[System Action: ${result.message || 'Done'}]`;
                }
            }

            if (replyText) {
                setTimeout(() => {
                    sendMessage(activeChatId!, aiUser.id, replyText);
                    setIsTyping(false);
                }, 1000 + Math.min(replyText.length * 20, 3000));
            } else {
                setIsTyping(false);
            }

        } catch (e) {
            console.error("AI Response Error", e);
            setIsTyping(false);
        }
    };

    if (!chat) return null;

    const isAdmin = chat.admins?.includes(currentUser!.id);
    const chatTitle = chat.type === 'group' ? chat.name : users.find(u => u.id === chat.members.find(m => m !== currentUser!.id))?.name;

    return (
        <div className="flex flex-col h-[85vh] bg-white rounded-lg shadow w-full max-w-4xl mx-auto relative">
            {/* Header */}
            <div className="p-3 border-b flex items-center justify-between bg-white rounded-t-lg">
                <div className="flex items-center gap-3">
                    <button onClick={() => setActiveChat(null)} className="md:hidden text-blue-500">Back</button>
                    <div className="font-bold text-lg">{chatTitle}</div>
                    {isArchived && <span className="text-xs bg-gray-200 px-2 py-1 rounded">Archived</span>}
                </div>
                <div className="flex gap-2">
                     {chat.type === 'group' && (
                        <button onClick={() => { setShowGroupSettings(true); setGroupName(chat.name || ''); }} className="text-blue-500 p-2 hover:bg-gray-100 rounded-full">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                            </svg>
                        </button>
                     )}
                     <button onClick={() => isArchived ? unarchiveChat(chat.id, currentUser!.id) : archiveChat(chat.id, currentUser!.id)} className="text-gray-500 p-2 hover:bg-gray-100 rounded-full" title={isArchived ? "Unarchive" : "Archive"}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                        </svg>
                     </button>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {chatMessages.map(msg => {
                    const isMe = msg.senderId === currentUser!.id;
                    const sender = users.find(u => u.id === msg.senderId);
                    return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-2`}>
                            {!isMe && <img src={sender?.avatar} className="w-8 h-8 rounded-full mr-2 self-end object-cover" />}
                            <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${isMe ? 'bg-primary text-white' : 'bg-gray-200 text-gray-900'} ${isMe ? 'rounded-br-none' : 'rounded-bl-none'}`}>
                                {msg.storySnapshot && (
                                    <div className="mb-2 bg-black/10 rounded overflow-hidden">
                                        <div className="text-xs text-gray-500 p-1 font-bold">Replied to story</div>
                                        <img src={msg.storySnapshot} className="w-full max-h-32 object-cover" />
                                    </div>
                                )}
                                {msg.image && <img src={msg.image} className="rounded-lg mb-2 max-w-full" />}
                                <div>{renderMarkdown(msg.content)}</div>
                            </div>
                        </div>
                    );
                })}
                {isTyping && (
                    <div className="flex justify-start mb-2">
                         <div className="bg-gray-200 rounded-2xl rounded-bl-none px-4 py-3 flex items-center gap-1">
                             <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                             <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                             <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                         </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 border-t bg-white">
                {pendingImage && (
                    <div className="mb-2 relative w-24 h-24">
                        <img src={pendingImage} className="w-full h-full object-cover rounded-lg border border-gray-300" />
                        <button onClick={() => setPendingImage(null)} className="absolute -top-2 -right-2 bg-gray-800 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">X</button>
                    </div>
                )}
                <div className="flex items-center gap-2">
                     <label className="cursor-pointer text-primary p-2 hover:bg-blue-50 rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                            <path fillRule="evenodd" d="M1.5 6a2.25 2.25 0 0 1 2.25-2.25h16.5A2.25 2.25 0 0 1 22.5 6v12a2.25 2.25 0 0 1-2.25 2.25H3.75A2.25 2.25 0 0 1 1.5 18V6ZM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0 0 21 18v-1.94l-2.69-2.689a1.5 1.5 0 0 0-2.12 0l-.88.879.97.97a.75.75 0 1 1-1.06 1.06l-5.16-5.159a1.5 1.5 0 0 0-2.12 0L3 16.061Zm10.125-7.81a1.125 1.125 0 1 1 2.25 0 1.125 1.125 0 0 1-2.25 0Z" clipRule="evenodd" />
                        </svg>
                        <input type="file" className="hidden" accept="image/*" onChange={handleImageSelect} />
                     </label>
                     <div className="flex-1 bg-gray-100 rounded-full px-4 py-2 flex items-center">
                        <input 
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Type a message..."
                            className="bg-transparent w-full outline-none"
                        />
                     </div>
                     <button onClick={handleSend} className="text-primary p-2">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                            <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
                        </svg>
                     </button>
                </div>
            </div>

            {/* Group Settings Modal */}
            {showGroupSettings && (
                <div className="absolute inset-0 bg-white z-20 flex flex-col p-4 animate-fade-in">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold">Group Info</h2>
                        <button onClick={() => setShowGroupSettings(false)} className="text-gray-500">Close</button>
                    </div>
                    
                    <div className="space-y-4 flex-1 overflow-y-auto">
                        <div>
                            <label className="block text-sm text-gray-600 mb-1">Group Name</label>
                            <div className="flex gap-2">
                                <input 
                                    value={groupName} 
                                    onChange={e => setGroupName(e.target.value)}
                                    className="border rounded px-3 py-2 flex-1"
                                />
                                <button onClick={() => updateGroupInfo(chat.id, groupName)} className="bg-blue-500 text-white px-4 rounded">Save</button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm text-gray-600 mb-1">Members ({chat.members.length})</label>
                            {chat.members.map(mid => {
                                const m = users.find(u => u.id === mid);
                                if (!m) return null;
                                return (
                                    <div key={m.id} className="flex justify-between items-center py-2 border-b">
                                        <div className="flex items-center gap-2">
                                            <img src={m.avatar} className="w-8 h-8 rounded-full" />
                                            <span>{m.name} {chat.admins?.includes(m.id) && <span className="text-xs text-blue-500">(Admin)</span>}</span>
                                        </div>
                                        {isAdmin && m.id !== currentUser!.id && (
                                            <div className="flex gap-2 text-xs">
                                                {!chat.admins?.includes(m.id) && (
                                                    <button onClick={() => makeGroupAdmin(chat.id, m.id)} className="text-blue-600">Make Admin</button>
                                                )}
                                                <button onClick={() => removeGroupMember(chat.id, m.id)} className="text-red-600">Kick</button>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>

                        <div>
                            <label className="block text-sm text-gray-600 mb-1">Add Member</label>
                            <input 
                                placeholder="Search users..." 
                                value={memberSearch}
                                onChange={e => setMemberSearch(e.target.value)}
                                className="border rounded px-3 py-2 w-full mb-2"
                            />
                            {memberSearch && users
                                .filter(u => !chat.members.includes(u.id) && u.name.toLowerCase().includes(memberSearch.toLowerCase()))
                                .slice(0, 5)
                                .map(u => (
                                    <div key={u.id} onClick={() => { addGroupMember(chat.id, u.id); setMemberSearch(''); }} className="p-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2">
                                        <img src={u.avatar} className="w-6 h-6 rounded-full" />
                                        {u.name}
                                    </div>
                                ))
                            }
                        </div>

                        <button onClick={() => { leaveGroup(chat.id, currentUser!.id); setActiveChat(null); }} className="w-full py-3 text-red-600 font-bold border rounded mt-4">
                            Leave Group
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};