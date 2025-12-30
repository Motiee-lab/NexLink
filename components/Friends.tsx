import React, { useState } from 'react';
import { useDataStore } from '../store';
import { User } from '../types';

export const Friends: React.FC = () => {
    const { users, currentUser, sendFriendRequest, acceptFriendRequest, rejectFriendRequest } = useDataStore();
    const [searchTerm, setSearchTerm] = useState('');

    const friends = users.filter(u => currentUser?.friends.includes(u.id));
    const requests = users.filter(u => currentUser?.friendRequests.includes(u.id));
    const availableUsers = users.filter(u => 
        u.id !== currentUser?.id && 
        !currentUser?.friends.includes(u.id) &&
        !currentUser?.friendRequests.includes(u.id) &&
        u.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="max-w-2xl w-full space-y-6">
            <h2 className="text-2xl font-bold">Friends</h2>

            {/* Friend Requests */}
            {requests.length > 0 && (
                <div className="bg-white p-4 rounded-lg shadow">
                    <h3 className="font-bold text-lg mb-3">Friend Requests</h3>
                    <div className="space-y-3">
                        {requests.map(req => (
                            <div key={req.id} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <img src={req.avatar} className="w-12 h-12 rounded-full" />
                                    <span className="font-semibold">{req.name}</span>
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => acceptFriendRequest(currentUser!.id, req.id)} 
                                        className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-hover"
                                    >
                                        Confirm
                                    </button>
                                    <button 
                                        onClick={() => rejectFriendRequest(currentUser!.id, req.id)}
                                        className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Find Friends */}
            <div className="bg-white p-4 rounded-lg shadow">
                <div className="flex justify-between items-center mb-4">
                     <h3 className="font-bold text-lg">Find Friends</h3>
                     <input 
                        className="bg-gray-100 rounded-full px-4 py-2 outline-none border focus:ring-1 ring-blue-500"
                        placeholder="Search people..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                     />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {availableUsers.map(user => (
                        <div key={user.id} className="border rounded-lg p-3 flex flex-col items-center text-center space-y-2">
                            <img src={user.avatar} className="w-20 h-20 rounded-full" />
                            <span className="font-bold block">{user.name}</span>
                            {user.isAi && <span className="text-xs bg-purple-100 text-purple-700 px-2 rounded-full">Meta AI</span>}
                            <button 
                                onClick={() => sendFriendRequest(currentUser!.id, user.id)}
                                className="w-full bg-blue-100 text-blue-700 font-semibold py-1 rounded hover:bg-blue-200"
                            >
                                Add Friend
                            </button>
                        </div>
                    ))}
                    {availableUsers.length === 0 && <p className="col-span-2 text-center text-gray-500">No users found.</p>}
                </div>
            </div>

            {/* My Friends */}
            <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="font-bold text-lg mb-3">My Contacts</h3>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {friends.map(user => (
                        <div key={user.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded">
                            <img src={user.avatar} className="w-12 h-12 rounded-full" />
                            <div>
                                <span className="font-semibold block">{user.name}</span>
                                <span className="text-xs text-gray-500">Friend</span>
                            </div>
                        </div>
                    ))}
                    {friends.length === 0 && <p className="text-gray-500">You haven't added any friends yet.</p>}
                 </div>
            </div>
        </div>
    );
};