import React, { useState, useEffect } from 'react';
import { useDataStore, useUIStore } from '../store';
import { getClient, executeTool, TOOLS } from '../geminiService';
import { User } from '../types';

export const Profile: React.FC = () => {
    const { currentUser, posts, users, updateProfile, sendFriendRequest, followUser, unfollowUser, blockUser, unblockUser, addStory } = useDataStore();
    const { viewingProfileId, setViewingProfile } = useUIStore();
    
    // Modal States
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
    
    // Edit Form State
    const [editName, setEditName] = useState('');
    const [editBio, setEditBio] = useState('');

    const [reportReason, setReportReason] = useState('');
    const [reporting, setReporting] = useState(false);

    const userToDisplay = viewingProfileId ? users.find(u => u.id === viewingProfileId) : currentUser;
    const isOwnProfile = userToDisplay?.id === currentUser?.id;

    if (!userToDisplay) return <div>User not found</div>;

    const myPosts = posts.filter(p => p.userId === userToDisplay.id).sort((a,b) => b.timestamp - a.timestamp);
    const isFriend = currentUser?.friends.includes(userToDisplay.id);
    const isFollowing = currentUser?.following.includes(userToDisplay.id);
    const isRequestSent = currentUser?.friendRequests.includes(userToDisplay.id) || userToDisplay.friendRequests.includes(currentUser!.id);
    const isBlocked = currentUser?.blockedUsers?.includes(userToDisplay.id);

    const handleReport = async () => {
        if (!reportReason.trim()) return;
        setReporting(true);
        try {
             await executeTool('ban_user', { identifier: userToDisplay.id, reason: reportReason });
             alert(`Report submitted. Nexus AI is reviewing.`);
             setIsReportModalOpen(false);
             setReportReason('');
        } catch (e) {
            alert("Failed to submit report.");
        } finally {
            setReporting(false);
        }
    };

    const handleAvatarUpdate = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                 updateProfile(userToDisplay.id, { avatar: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleStoryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                 addStory(userToDisplay.id, reader.result as string, []);
                 alert("Story added!");
            };
            reader.readAsDataURL(file);
        }
    };

    const openEditProfile = () => {
        setEditName(currentUser?.name || '');
        setEditBio(currentUser?.bio || '');
        setIsEditProfileOpen(true);
    };

    const handleSaveProfile = () => {
        if (currentUser) {
            updateProfile(currentUser.id, { name: editName, bio: editBio });
            setIsEditProfileOpen(false);
        }
    };

    return (
        <div className="max-w-4xl w-full pb-20">
            {/* Navigation back if viewing other */}
            {!isOwnProfile && (
                <button 
                    onClick={() => setViewingProfile(null)}
                    className="mb-4 flex items-center gap-2 text-primary font-bold hover:underline"
                >
                    &larr; Back to my profile
                </button>
            )}

            <div className="bg-white shadow rounded-lg overflow-hidden">
                {/* Cover Photo */}
                <div className="h-48 bg-gradient-to-r from-blue-500 to-indigo-600 relative"></div>
                
                {/* Profile Info */}
                <div className="px-6 pb-6 relative">
                    <div className="flex flex-col md:flex-row items-center md:items-end -mt-12 mb-4">
                        <div className="relative z-10">
                            <img src={userToDisplay.avatar} className="w-40 h-40 rounded-full border-4 border-white shadow-md bg-white object-cover" />
                            {isOwnProfile && (
                                <label className="absolute bottom-2 right-2 bg-gray-100 p-1.5 rounded-full cursor-pointer hover:bg-gray-200 border shadow">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-gray-700">
                                        <path d="m2.695 14.762-1.262 3.155a.5.5 0 0 0 .65.65l3.155-1.262a4 4 0 0 0 1.343-.886L17.5 5.501a2.121 2.121 0 0 0-3-3L3.58 13.419a4 4 0 0 0-.885 1.343Z" />
                                    </svg>
                                    <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpdate} />
                                </label>
                            )}
                        </div>
                        
                        <div className="md:ml-6 text-center md:text-left mt-4 md:mt-0 flex-1">
                            <h1 className="text-3xl font-bold flex items-center justify-center md:justify-start gap-2">
                                {userToDisplay.name}
                                {userToDisplay.isAi && <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">Nexus AI</span>}
                            </h1>
                            {userToDisplay.bio && <p className="text-gray-600 mt-1">{userToDisplay.bio}</p>}
                            <div className="text-gray-500 font-semibold mt-2 flex gap-4 justify-center md:justify-start">
                                <span>{userToDisplay.friends.length} Friends</span>
                                <span>{userToDisplay.followers.length} Followers</span>
                                <span>{userToDisplay.following.length} Following</span>
                            </div>
                        </div>
                        
                        <div className="flex gap-2 mt-4 md:mt-0 flex-wrap justify-center">
                            {isOwnProfile ? (
                                <>
                                    <label className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded font-semibold transition-colors cursor-pointer">
                                        + Add to Story
                                        <input type="file" className="hidden" accept="image/*" onChange={handleStoryUpload} />
                                    </label>
                                    <button onClick={openEditProfile} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded font-semibold transition-colors">Edit Profile</button>
                                </>
                            ) : (
                                <>
                                    {isFriend ? (
                                        <button className="bg-green-100 text-green-700 px-4 py-2 rounded font-semibold flex items-center gap-1 cursor-default">
                                            ✓ Friends
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={() => sendFriendRequest(currentUser!.id, userToDisplay.id)}
                                            disabled={isRequestSent || isBlocked}
                                            className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded font-semibold disabled:opacity-50"
                                        >
                                            {isRequestSent ? 'Request Sent' : 'Add Friend'}
                                        </button>
                                    )}

                                    {isFollowing ? (
                                        <button onClick={() => unfollowUser(currentUser!.id, userToDisplay.id)} className="bg-gray-200 text-gray-800 px-4 py-2 rounded font-semibold">Unfollow</button>
                                    ) : (
                                        <button onClick={() => followUser(currentUser!.id, userToDisplay.id)} disabled={isBlocked} className="bg-blue-500 text-white px-4 py-2 rounded font-semibold disabled:opacity-50">Follow</button>
                                    )}
                                    
                                    <button 
                                        className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded font-semibold"
                                        onClick={() => alert("Chat functionality linked in Messenger tab.")}
                                        disabled={isBlocked}
                                    >
                                        Message
                                    </button>
                                    
                                    {isBlocked ? (
                                        <button onClick={() => unblockUser(currentUser!.id, userToDisplay.id)} className="bg-red-600 text-white px-4 py-2 rounded font-semibold">Unblock</button>
                                    ) : (
                                        <button onClick={() => blockUser(currentUser!.id, userToDisplay.id)} className="bg-gray-800 text-white px-4 py-2 rounded font-semibold">Block</button>
                                    )}
                                    
                                    <button 
                                        className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded font-semibold transition-colors" 
                                        onClick={() => setIsReportModalOpen(true)}
                                    >
                                        Report
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                    
                    <div className="border-t pt-6 mt-6">
                        <h2 className="text-xl font-bold mb-4">Timeline</h2>
                        {isBlocked ? (
                             <div className="text-center text-gray-500 py-10">You have blocked this user. Post content is hidden.</div>
                        ) : (
                            <div className="space-y-4">
                                {myPosts.length === 0 ? <p className="text-gray-500 italic text-center py-4">No posts yet.</p> : null}
                                {myPosts.map(post => (
                                    <div key={post.id} className="border p-4 rounded-lg bg-white shadow-sm">
                                        <div className="flex items-center gap-2 mb-3">
                                            <img src={userToDisplay.avatar} className="w-10 h-10 rounded-full object-cover" />
                                            <div>
                                                <span className="font-bold">{userToDisplay.name}</span>
                                                <div className="text-xs text-gray-400">{new Date(post.timestamp).toLocaleString()}</div>
                                            </div>
                                        </div>
                                        <p className="text-gray-800 mb-2">{post.content}</p>
                                        {post.image && <img src={post.image} className="w-full max-h-96 object-cover rounded" />}
                                        {post.video && <video src={post.video} controls className="w-full max-h-96" />}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Edit Profile Modal */}
            {isEditProfileOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                        <h3 className="text-xl font-bold mb-4">Edit Profile</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-600 mb-1">Name</label>
                                <input 
                                    className="w-full border rounded p-2"
                                    value={editName}
                                    onChange={e => setEditName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-600 mb-1">Bio</label>
                                <textarea 
                                    className="w-full border rounded p-2"
                                    value={editBio}
                                    onChange={e => setEditBio(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <button onClick={() => setIsEditProfileOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                            <button onClick={handleSaveProfile} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save Changes</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Report Modal */}
            {isReportModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                        <h3 className="text-xl font-bold mb-2">Report User</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Stalking or harassment is a violation of our standards. 
                            Nexus AI will review this report and apply immediate punishment if necessary.
                        </p>
                        <textarea 
                            className="w-full border rounded-lg p-3 h-32 mb-4 focus:ring-2 focus:ring-red-500 outline-none"
                            placeholder="Why are you reporting this user?"
                            value={reportReason}
                            onChange={(e) => setReportReason(e.target.value)}
                        />
                        <div className="flex justify-end gap-2">
                            <button 
                                onClick={() => setIsReportModalOpen(false)} 
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleReport}
                                disabled={reporting}
                                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                            >
                                {reporting ? 'Processing...' : 'Submit Report'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};