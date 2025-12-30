import React, { useState, useRef, useEffect } from 'react';
import { useDataStore, useUIStore } from '../store';
import { Post, Comment, User, Story, StoryText } from '../types';
import { getClient } from '../geminiService';

const renderContentWithMentions = (text: string) => {
    return text.split(/(\s+)/).map((part, index) => {
        if (part.startsWith('@')) {
            const clean = part.replace(/[^\w@]/g, ''); 
            if (clean.toLowerCase() === '@everyone') {
                 return <span key={index} className="bg-yellow-200 text-yellow-800 px-1 rounded font-bold">{part}</span>;
            }
            return <span key={index} className="text-blue-600 font-semibold hover:underline cursor-pointer">{clean}</span>;
        }
        return part;
    });
};

const TEXT_COLORS = ['#FFFFFF', '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'];

export const Feed: React.FC = () => {
    const { posts, users, currentUser, addPost, stories, addStory, cleanupStories, createChat, sendMessage } = useDataStore();
    const { setViewingProfile, highlightedPostId, setHighlightedPost } = useUIStore();
    const [newPostContent, setNewPostContent] = useState('');
    const [media, setMedia] = useState<string | null>(null);
    const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
    
    // Story State
    const [viewingStory, setViewingStory] = useState<Story | null>(null);
    const [editingStoryImage, setEditingStoryImage] = useState<string | null>(null);
    const [storyTexts, setStoryTexts] = useState<StoryText[]>([]);
    const [isAddingText, setIsAddingText] = useState(false);
    const [newStoryText, setNewStoryText] = useState('');
    const [storyTextColor, setStoryTextColor] = useState('#FFFFFF');
    const [storyReply, setStoryReply] = useState('');

    // Story Mention State
    const [storyMentionQuery, setStoryMentionQuery] = useState<string | null>(null);
    const [storyMentionIndex, setStoryMentionIndex] = useState(-1);
    const storyInputRef = useRef<HTMLInputElement>(null);

    // Dragging State
    const [draggedTextId, setDraggedTextId] = useState<string | null>(null);
    const editorRef = useRef<HTMLDivElement>(null);

    // Post Mention State
    const [mentionQuery, setMentionQuery] = useState<string | null>(null);
    const [mentionIndex, setMentionIndex] = useState<number>(-1);
    const inputRef = useRef<HTMLInputElement>(null);

    const sortedPosts = [...posts].sort((a, b) => b.timestamp - a.timestamp);

    // Cleanup expired stories on mount
    useEffect(() => {
        cleanupStories();
    }, []);

    useEffect(() => {
        if (highlightedPostId) {
            const el = document.getElementById(`post-${highlightedPostId}`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setTimeout(() => setHighlightedPost(null), 2000);
            }
        }
    }, [highlightedPostId]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setMedia(reader.result as string);
                setMediaType(file.type.startsWith('video') ? 'video' : 'image');
            };
            reader.readAsDataURL(file);
        }
    };

    const handleStoryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setEditingStoryImage(reader.result as string);
                setStoryTexts([]);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleStoryInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setNewStoryText(val);

        const cursor = e.target.selectionStart || 0;
        const textBeforeCursor = val.slice(0, cursor);
        const lastAt = textBeforeCursor.lastIndexOf('@');

        if (lastAt !== -1) {
             const textAfterAt = textBeforeCursor.slice(lastAt + 1);
             if (!textAfterAt.includes('@') && textAfterAt.length < 20) {
                 setStoryMentionQuery(textAfterAt);
                 setStoryMentionIndex(lastAt);
                 return;
             }
        }
        setStoryMentionQuery(null);
    };

    const selectStoryMention = (name: string) => {
        if (storyMentionIndex > -1) {
            const before = newStoryText.substring(0, storyMentionIndex);
            const after = newStoryText.substring(storyInputRef.current?.selectionStart || newStoryText.length);
            const newValue = `${before}@${name.replace(/\s/g, '')} ${after}`;
            setNewStoryText(newValue);
            setStoryMentionQuery(null);
            storyInputRef.current?.focus();
        }
    }

    const handleAddStoryText = () => {
        if (!newStoryText.trim()) {
            setIsAddingText(false);
            return;
        }
        setStoryTexts([...storyTexts, {
            id: Math.random().toString(),
            content: newStoryText,
            x: 50,
            y: 50,
            color: storyTextColor,
            scale: 1
        }]);
        setNewStoryText('');
        setIsAddingText(false);
    };

    const handleDragStart = (e: React.MouseEvent | React.TouchEvent, id: string) => {
        setDraggedTextId(id);
    };

    const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!draggedTextId || !editorRef.current) return;
        
        let clientX, clientY;
        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = (e as React.MouseEvent).clientX;
            clientY = (e as React.MouseEvent).clientY;
        }

        const rect = editorRef.current.getBoundingClientRect();
        const x = ((clientX - rect.left) / rect.width) * 100;
        const y = ((clientY - rect.top) / rect.height) * 100;

        setStoryTexts(prev => prev.map(t => 
            t.id === draggedTextId ? { ...t, x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) } : t
        ));
    };

    const handleDragEnd = () => {
        setDraggedTextId(null);
    };

    const handlePostStory = () => {
        if (editingStoryImage) {
            addStory(currentUser!.id, editingStoryImage, storyTexts);
            setEditingStoryImage(null);
            setStoryTexts([]);
        }
    };

    const handleSendReaction = (emoji: string) => {
        if (!viewingStory) return;
        const chat = createChat([currentUser!.id, viewingStory.userId], 'private');
        sendMessage(chat.id, currentUser!.id, emoji, undefined, viewingStory.image);
        // Visual feedback could be added here
    };

    const handleSendStoryReply = () => {
        if (!viewingStory || !storyReply.trim()) return;
        const chat = createChat([currentUser!.id, viewingStory.userId], 'private');
        sendMessage(chat.id, currentUser!.id, storyReply, undefined, viewingStory.image);
        setStoryReply('');
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setNewPostContent(val);

        const cursor = e.target.selectionStart || 0;
        const textBeforeCursor = val.slice(0, cursor);
        const lastAt = textBeforeCursor.lastIndexOf('@');

        if (lastAt !== -1) {
             const textAfterAt = textBeforeCursor.slice(lastAt + 1);
             if (!textAfterAt.includes('@') && textAfterAt.length < 20) {
                 setMentionQuery(textAfterAt);
                 setMentionIndex(lastAt);
                 return;
             }
        }
        setMentionQuery(null);
    };

    const selectMention = (name: string, isEveryone: boolean = false) => {
        if (mentionIndex > -1) {
            const before = newPostContent.substring(0, mentionIndex);
            const handle = isEveryone ? 'Everyone' : name.replace(/\s/g, ''); 
            const after = newPostContent.substring(inputRef.current?.selectionStart || newPostContent.length);
            
            const newValue = `${before}@${handle} ${after}`;
            setNewPostContent(newValue);
            setMentionQuery(null);
            inputRef.current?.focus();
        }
    };

    const handlePost = () => {
        if (!newPostContent.trim() && !media) return;
        addPost(currentUser!.id, newPostContent, mediaType === 'image' ? media! : undefined, mediaType === 'video' ? media! : undefined);
        setNewPostContent('');
        setMedia(null);
        setMediaType(null);
    };

    const suggestedUsers = mentionQuery !== null 
        ? users.filter(u => u.name.toLowerCase().includes(mentionQuery.toLowerCase()) && u.id !== currentUser?.id)
        : [];

    const storySuggestedUsers = storyMentionQuery !== null
        ? users.filter(u => u.name.toLowerCase().includes(storyMentionQuery.toLowerCase()) && u.id !== currentUser?.id)
        : [];

    const validStories = stories.filter(s => s.userId === currentUser!.id || currentUser?.friends.includes(s.userId));
    const groupedStories = validStories.reduce((acc, story) => {
        if (!acc[story.userId]) acc[story.userId] = [];
        acc[story.userId].push(story);
        return acc;
    }, {} as Record<string, Story[]>);

    return (
        <div className="max-w-xl w-full space-y-4 pb-24">
            {/* Stories Section */}
            <div className="bg-white rounded-lg shadow p-4 overflow-x-auto no-scrollbar">
                <div className="flex gap-4">
                    {/* Add Story */}
                    <div className="relative flex-shrink-0 cursor-pointer group">
                        <div className="w-16 h-16 rounded-full border-2 border-gray-300 overflow-hidden relative">
                            <img src={currentUser?.avatar} className="w-full h-full object-cover opacity-75 group-hover:opacity-100 transition" />
                            <label className="absolute inset-0 flex items-center justify-center bg-black/20 cursor-pointer">
                                <span className="text-white font-bold text-2xl">+</span>
                                <input type="file" className="hidden" accept="image/*" onChange={handleStoryUpload} />
                            </label>
                        </div>
                        <span className="text-xs text-center block mt-1 font-semibold truncate w-16">Add Story</span>
                    </div>

                    {/* Friends Stories */}
                    {Object.keys(groupedStories).map(uid => {
                        const u = users.find(user => user.id === uid);
                        if (!u) return null;
                        const userStories = groupedStories[uid];
                        // Show the most recent story thumbnail
                        const latestStory = userStories[userStories.length - 1];
                        return (
                            <div key={uid} onClick={() => setViewingStory(latestStory)} className="relative flex-shrink-0 cursor-pointer">
                                <div className="w-16 h-16 rounded-full border-2 border-blue-500 p-0.5">
                                    <img src={latestStory.image} className="w-full h-full rounded-full object-cover" />
                                </div>
                                <span className="text-xs text-center block mt-1 truncate w-16">{u.id === currentUser?.id ? 'Your Story' : u.name.split(' ')[0]}</span>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Create Post */}
            <div className="bg-white rounded-lg shadow p-4 relative z-10">
                <div className="flex gap-2">
                    <img src={currentUser?.avatar} className="w-10 h-10 rounded-full border border-gray-200 object-cover" />
                    <div className="flex-1 bg-gray-100 rounded-full px-4 py-2 hover:bg-gray-200 cursor-text transition-colors">
                        <input 
                            ref={inputRef}
                            className="w-full bg-transparent outline-none text-gray-900 placeholder-gray-500" 
                            placeholder={`What's on your mind, ${currentUser?.name}?`}
                            value={newPostContent}
                            onChange={handleInputChange}
                        />
                    </div>
                </div>
                
                {/* Mention Dropdown */}
                {mentionQuery !== null && (
                    <div className="absolute top-16 left-14 bg-white border shadow-lg rounded-lg w-64 max-h-48 overflow-y-auto z-50">
                        {mentionQuery.toLowerCase().includes('e') && (
                            <div onClick={() => selectMention('Everyone', true)} className="flex items-center gap-2 p-2 hover:bg-blue-50 cursor-pointer border-b bg-yellow-50">
                                <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center text-white font-bold">@</div>
                                <div className="flex flex-col">
                                    <span className="font-bold text-sm">Everyone</span>
                                    <span className="text-xs text-gray-400">Mention all users</span>
                                </div>
                            </div>
                        )}
                        {suggestedUsers.map(u => (
                            <div key={u.id} onClick={() => selectMention(u.name)} className="flex items-center gap-2 p-2 hover:bg-blue-50 cursor-pointer border-b">
                                <img src={u.avatar} className="w-8 h-8 rounded-full object-cover" />
                                <div className="flex flex-col">
                                    <span className="font-bold text-sm">{u.name}</span>
                                    <span className="text-xs text-gray-400">@{u.name.replace(/\s/g, '')}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                 {media && (
                    <div className="mt-2 relative">
                         {mediaType === 'image' ? (
                             <img src={media} className="w-full h-64 object-cover rounded-lg" />
                         ) : (
                             <video src={media} controls className="w-full rounded-lg max-h-64 bg-black" />
                         )}
                         <button onClick={() => { setMedia(null); setMediaType(null); }} className="absolute top-2 right-2 bg-gray-800/80 hover:bg-gray-900 text-white rounded-full p-1.5 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                            </svg>
                         </button>
                    </div>
                )}
                <div className="border-t mt-3 pt-2 flex justify-between items-center">
                    <label className="flex items-center gap-2 cursor-pointer text-gray-600 hover:bg-gray-100 px-4 py-2 rounded-lg transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-green-500">
                            <path fillRule="evenodd" d="M1.5 6a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 6v12a2.25 2.25 0 01-2.25 2.25H3.75A2.25 2.25 0 011.5 18V6zM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0021 18v-1.94l-2.69-2.689a1.5 1.5 0 00-2.12 0l-.88.879.97.97a.75.75 0 11-1.06 1.06l-5.16-5.159a1.5 1.5 0 00-2.12 0L3 16.061zm10.125-7.81a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0z" clipRule="evenodd" />
                        </svg>
                         <input type="file" className="hidden" accept="image/*,video/*" onChange={handleFileChange} />
                         <span className="font-semibold text-sm">Photo/Video</span>
                    </label>
                    <button 
                        onClick={handlePost} 
                        className={`bg-primary hover:bg-primary-hover text-white px-8 py-1.5 rounded-md font-bold transition-all ${(!newPostContent && !media) ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={!newPostContent && !media}
                    >
                        Post
                    </button>
                </div>
            </div>

            {/* Posts Feed */}
            {sortedPosts.map(post => {
                const author = users.find(u => u.id === post.userId);
                if (!author || currentUser?.blockedUsers?.includes(author.id) || currentUser?.blockedBy?.includes(author.id)) return null;
                return (
                    <PostCard key={post.id} post={post} author={author} isHighlighted={highlightedPostId === post.id} />
                );
            })}

            {/* Story Editor Modal */}
            {editingStoryImage && (
                <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-4">
                    <div 
                        ref={editorRef}
                        className="relative w-full max-w-md bg-gray-900 rounded-lg overflow-hidden touch-none"
                        style={{ height: '70vh' }}
                        onMouseMove={handleDragMove}
                        onTouchMove={handleDragMove}
                        onMouseUp={handleDragEnd}
                        onTouchEnd={handleDragEnd}
                    >
                        <img src={editingStoryImage} className="w-full h-full object-contain pointer-events-none" />
                        {storyTexts.map(text => (
                            <div
                                key={text.id}
                                className="absolute cursor-move font-bold drop-shadow-md p-2 bg-black/20 rounded"
                                style={{ top: `${text.y}%`, left: `${text.x}%`, transform: 'translate(-50%, -50%)', fontSize: '1.2rem', color: text.color }}
                                onMouseDown={(e) => handleDragStart(e, text.id)}
                                onTouchStart={(e) => handleDragStart(e, text.id)}
                            >
                                {text.content}
                            </div>
                        ))}
                    </div>
                    
                    {isAddingText ? (
                        <div className="absolute inset-x-0 bottom-10 p-4 flex flex-col gap-4 bg-black/80 z-20 items-center">
                            {/* Color Picker */}
                            <div className="flex gap-2 mb-2">
                                {TEXT_COLORS.map(color => (
                                    <button 
                                        key={color}
                                        onClick={() => setStoryTextColor(color)}
                                        className={`w-8 h-8 rounded-full border-2 ${storyTextColor === color ? 'border-white scale-110' : 'border-transparent'}`}
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                            </div>

                            <input 
                                ref={storyInputRef}
                                autoFocus
                                className="bg-transparent text-white border-b border-white outline-none text-center text-xl w-full"
                                placeholder="Type something... (@ to mention)"
                                value={newStoryText}
                                onChange={handleStoryInputChange}
                                style={{ color: storyTextColor }}
                            />
                            
                            {/* Story Mention Dropdown */}
                            {storyMentionQuery !== null && (
                                <div className="bg-white border shadow-lg rounded-lg w-64 max-h-48 overflow-y-auto text-black absolute bottom-full mb-2">
                                    {storySuggestedUsers.map(u => (
                                        <div key={u.id} onClick={() => selectStoryMention(u.name)} className="flex items-center gap-2 p-2 hover:bg-blue-50 cursor-pointer border-b">
                                            <img src={u.avatar} className="w-8 h-8 rounded-full object-cover" />
                                            <div className="flex flex-col text-left">
                                                <span className="font-bold text-sm">{u.name}</span>
                                                <span className="text-xs text-gray-400">@{u.name.replace(/\s/g, '')}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <button onClick={handleAddStoryText} className="text-white font-bold bg-blue-600 px-6 py-2 rounded-full">Done</button>
                        </div>
                    ) : (
                        <div className="flex gap-4 mt-4">
                            <button onClick={() => setIsAddingText(true)} className="bg-gray-800 text-white p-3 rounded-full font-bold">
                                Aa
                            </button>
                             <button onClick={handlePostStory} className="bg-blue-600 text-white px-8 py-3 rounded-full font-bold">
                                Share to Story
                            </button>
                            <button onClick={() => { setEditingStoryImage(null); setStoryTexts([]); }} className="text-gray-400 font-bold p-3">Cancel</button>
                        </div>
                    )}
                </div>
            )}

            {/* Story Viewer Modal */}
            {viewingStory && (
                <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
                    <div className="relative w-full max-w-lg h-[80vh] bg-black">
                        <img src={viewingStory.image} className="w-full h-full object-contain" />
                        {/* Text Overlays */}
                        {viewingStory.texts?.map(text => (
                            <div
                                key={text.id}
                                className="absolute font-bold drop-shadow-md p-1"
                                style={{ top: `${text.y}%`, left: `${text.x}%`, transform: 'translate(-50%, -50%)', fontSize: '1.2rem', color: text.color }}
                            >
                                {text.content}
                            </div>
                        ))}

                        {/* Header */}
                        <div className="absolute top-4 left-4 flex items-center gap-2 z-10">
                             <img src={users.find(u => u.id === viewingStory.userId)?.avatar} className="w-10 h-10 rounded-full border-2 border-blue-500" />
                             <div>
                                <span className="text-white font-bold drop-shadow-md block">{users.find(u => u.id === viewingStory.userId)?.name}</span>
                                <span className="text-gray-300 text-xs drop-shadow-md">{new Date(viewingStory.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                             </div>
                        </div>
                        <button onClick={() => setViewingStory(null)} className="absolute top-4 right-4 text-white font-bold text-2xl drop-shadow-md z-10">&times;</button>
                    </div>
                    
                    {/* Footer - Reactions and Reply */}
                    <div className="w-full max-w-lg p-3 flex flex-col gap-2 bg-black">
                         <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
                            {['❤️', '😂', '😮', '😢', '😡', '🔥'].map(emoji => (
                                <button key={emoji} onClick={() => handleSendReaction(emoji)} className="text-2xl hover:scale-125 transition-transform">
                                    {emoji}
                                </button>
                            ))}
                         </div>
                         <div className="flex gap-2">
                             <input 
                                className="flex-1 bg-gray-800 text-white rounded-full px-4 py-2 outline-none border border-gray-700 focus:border-blue-500"
                                placeholder="Reply to story..."
                                value={storyReply}
                                onChange={e => setStoryReply(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSendStoryReply()}
                             />
                             <button onClick={handleSendStoryReply} className="text-blue-500 font-bold px-2">
                                 Send
                             </button>
                         </div>
                    </div>
                </div>
            )}
        </div>
    );
};

interface PostCardProps {
    post: Post;
    author: User;
    isHighlighted: boolean;
}

const PostCard: React.FC<PostCardProps> = ({ post, author, isHighlighted }) => {
    const { currentUser, toggleLike, addComment, addPost, comments, users, posts } = useDataStore();
    const { setViewingProfile } = useUIStore();
    const [commentText, setCommentText] = useState('');
    const [showComments, setShowComments] = useState(false);
    const [showOptions, setShowOptions] = useState(false);
    const postComments = comments.filter(c => c.postId === post.id);

    const handleShare = () => {
        addPost(currentUser!.id, `Shared a post by @${author.name.replace(/\s/g,'')}`, undefined, undefined, post.id);
        alert("Post shared to your timeline!");
    };

    const handleCopyId = () => {
        navigator.clipboard.writeText(post.id);
        setShowOptions(false);
        alert("Post ID copied to clipboard!");
    };

    const handleCommentSubmit = async () => {
        if (!commentText.trim()) return;
        const text = commentText;
        addComment(post.id, currentUser!.id, text);
        setCommentText('');
        if (!showComments) setShowComments(true);

        // Check for Nexus AI Mention in comments
        if (text.toLowerCase().includes('@nexusai') || text.toLowerCase().includes('@nexus')) {
            try {
                const client = getClient();
                const aiUser = users.find(u => u.isAi);
                if (client && aiUser) {
                    const response = await client.models.generateContent({
                        model: 'gemini-3-flash-preview',
                        contents: [{ parts: [{ text: `A user commented on a post: "${text}". The post content was: "${post.content}". Reply to the comment as Nexus AI.` }] }],
                    });
                    const reply = response.text;
                    if (reply) {
                        setTimeout(() => {
                             addComment(post.id, aiUser.id, reply);
                        }, 2000);
                    }
                }
            } catch (e) {
                console.error("AI Comment Reply Failed", e);
            }
        }
    };

    const sharedPost = post.sharedFromId ? posts.find(p => p.id === post.sharedFromId) : null;
    const sharedAuthor = sharedPost ? users.find(u => u.id === sharedPost.userId) : null;

    return (
        <div id={`post-${post.id}`} className={`bg-white rounded-lg shadow relative transition-colors duration-1000 ${isHighlighted ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}>
             {/* Options Menu */}
             <div className="absolute top-3 right-3">
                <button onClick={() => setShowOptions(!showOptions)} className="text-gray-500 hover:bg-gray-100 p-1 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM18.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
                    </svg>
                </button>
                {showOptions && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-20 border">
                        <button onClick={handleCopyId} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                            Copy ID
                        </button>
                        {currentUser?.id === post.userId && (
                             <button className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100">Delete Post</button>
                        )}
                    </div>
                )}
            </div>

            <div className="p-3 flex items-center gap-2">
                <img 
                    src={author.avatar} 
                    className="w-10 h-10 rounded-full object-cover border border-gray-200 cursor-pointer" 
                    onClick={() => setViewingProfile(author.id)}
                />
                <div>
                    <h3 className="font-semibold text-gray-900 flex items-center gap-1 cursor-pointer hover:underline" onClick={() => setViewingProfile(author.id)}>
                        {author.name}
                        {author.isAi && <span className="bg-blue-100 text-blue-600 text-[10px] px-1.5 py-0.5 rounded-full uppercase tracking-wider font-bold">AI</span>}
                    </h3>
                    <p className="text-xs text-gray-500">{new Date(post.timestamp).toLocaleString()}</p>
                </div>
            </div>
            
            <div className="px-3 pb-2 text-gray-800 whitespace-pre-wrap text-[15px] leading-normal">
                {renderContentWithMentions(post.content)}
            </div>

            {/* Shared Content Block */}
            {sharedPost && sharedAuthor && (
                <div className="mx-3 mb-3 border rounded-lg p-3 bg-gray-50">
                    <div className="flex items-center gap-2 mb-2">
                        <img src={sharedAuthor.avatar} className="w-8 h-8 rounded-full" />
                         <span className="font-bold text-sm">{sharedAuthor.name}</span>
                         <span className="text-xs text-gray-500">{new Date(sharedPost.timestamp).toLocaleDateString()}</span>
                    </div>
                    <div className="text-sm mb-2">{renderContentWithMentions(sharedPost.content)}</div>
                    {sharedPost.image && <img src={sharedPost.image} className="w-full h-auto object-cover max-h-60 rounded" />}
                </div>
            )}
            
            {post.image && <img src={post.image} className="w-full h-auto object-cover max-h-[500px]" />}
            {post.video && <video src={post.video} controls className="w-full max-h-[500px] bg-black" />}
            
            <div className="px-3 py-2 flex justify-between text-gray-500 text-sm border-b border-gray-100">
                 <div className="flex items-center gap-1">
                    {post.likes.length > 0 && (
                        <span className="bg-primary text-white rounded-full p-1 w-4 h-4 flex items-center justify-center text-[10px]">👍</span>
                    )}
                    <span>{post.likes.length > 0 ? post.likes.length : ''}</span>
                 </div>
                 <div className="flex gap-3">
                    <button 
                        onClick={() => setShowComments(!showComments)} 
                        className="hover:underline cursor-pointer"
                    >
                        {postComments.length} Comments
                    </button>
                 </div>
            </div>

            <div className="px-2 py-1 flex justify-around border-b border-gray-100">
                <button 
                    onClick={() => toggleLike(post.id, currentUser!.id)}
                    className={`flex-1 py-1.5 rounded hover:bg-gray-100 font-medium text-sm flex items-center justify-center gap-2 transition-colors ${post.likes.includes(currentUser!.id) ? 'text-primary' : 'text-gray-600'}`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill={post.likes.includes(currentUser!.id) ? "currentColor" : "none"} viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.633 10.25c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V2.75a.75.75 0 01.75-.75 2.25 2.25 0 012.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23H5.904M14.25 9h2.25M5.904 18.75c.083.205.173.405.27.602.197.4-.077.898-.521.898h-.908c-.889 0-1.713-.518-1.972-1.368a12 12 0 01-.521-3.507c0-1.553.295-3.036.831-4.398C3.287 9.463 4.28 9.25 5.294 9.25h1.34m-1.34 0h1.34" />
                    </svg>
                    Like
                </button>
                <button 
                    onClick={() => { setShowComments(true); setTimeout(() => document.getElementById(`comment-input-${post.id}`)?.focus(), 100); }}
                    className="flex-1 py-1.5 rounded hover:bg-gray-100 font-medium text-gray-600 text-sm flex items-center justify-center gap-2 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                    </svg>
                    Comment
                </button>
                <button 
                    onClick={handleShare}
                    className="flex-1 py-1.5 rounded hover:bg-gray-100 font-medium text-gray-600 text-sm flex items-center justify-center gap-2 transition-colors"
                >
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
                    </svg>
                    Share
                </button>
            </div>

            {/* Comments */}
            {showComments && (
                <div className="p-3 space-y-3">
                    {postComments.map(c => {
                        const cAuthor = users.find(u => u.id === c.userId);
                        return (
                            <div key={c.id} className="flex gap-2">
                                <img src={cAuthor?.avatar} className="w-8 h-8 rounded-full border border-gray-200" />
                                <div className="bg-gray-100 rounded-2xl px-3 py-2">
                                    <span 
                                        className="font-bold text-sm block text-gray-900 cursor-pointer hover:underline"
                                        onClick={() => setViewingProfile(cAuthor?.id || null)}
                                    >
                                        {cAuthor?.name}
                                    </span>
                                    <span className="text-[14px] text-gray-800">{renderContentWithMentions(c.content)}</span>
                                </div>
                            </div>
                        )
                    })}
                    <div className="flex gap-2">
                        <img src={currentUser?.avatar} className="w-8 h-8 rounded-full border border-gray-200" />
                        <div className="flex-1 bg-gray-100 rounded-full px-3 py-1 flex items-center">
                             <input 
                                id={`comment-input-${post.id}`}
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handleCommentSubmit();
                                    }
                                }}
                                className="bg-transparent w-full outline-none text-[14px] placeholder-gray-500"
                                placeholder="Write a comment..."
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};