import React, { useEffect } from 'react';
import { useDataStore, useUIStore } from '../store';
import { ViewState } from '../types';

export const Notifications: React.FC = () => {
    const { notifications, users, currentUser, markNotificationsRead } = useDataStore();
    const { setView, setHighlightedPost } = useUIStore();

    const myNotifications = notifications
        .filter(n => n.userId === currentUser?.id)
        .sort((a, b) => b.timestamp - a.timestamp);

    useEffect(() => {
        markNotificationsRead(currentUser!.id);
    }, []);

    const handleNotificationClick = (entityId?: string) => {
        if (entityId) {
            setHighlightedPost(entityId);
            setView(ViewState.HOME);
        }
    };

    if (myNotifications.length === 0) {
        return (
            <div className="text-center mt-10 text-gray-500">
                <h2 className="text-2xl font-bold mb-2">Notifications</h2>
                <p>No notifications yet.</p>
            </div>
        )
    }

    return (
        <div className="max-w-2xl w-full bg-white rounded-lg shadow p-4">
             <h2 className="text-2xl font-bold mb-4 px-2">Notifications</h2>
             <div className="space-y-1">
                 {myNotifications.map(n => {
                     const actor = users.find(u => u.id === n.actorId);
                     return (
                         <div key={n.id} onClick={() => handleNotificationClick(n.entityId)} className={`flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 cursor-pointer ${!n.read ? 'bg-blue-50' : ''}`}>
                             <div className="relative">
                                 <img src={actor?.avatar} className="w-14 h-14 rounded-full object-cover" />
                                 <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs border-2 border-white"
                                    style={{
                                        backgroundColor: 
                                            n.type === 'like' ? '#1877F2' : 
                                            n.type === 'comment' ? '#42b72a' :
                                            n.type === 'mention' ? '#F3425F' :
                                            n.type === 'everyone' ? '#EAB308' :
                                            '#999'
                                    }}
                                 >
                                    {n.type === 'like' && '👍'}
                                    {n.type === 'comment' && '💬'}
                                    {n.type === 'mention' && '@'}
                                    {n.type === 'friend_request' && '👥'}
                                    {n.type === 'follow' && '➕'}
                                    {n.type === 'share' && '↗️'}
                                    {n.type === 'everyone' && '📢'}
                                 </div>
                             </div>
                             <div className="flex-1">
                                 <p className="text-sm">
                                     <span className="font-bold">{actor?.name}</span> {n.message}
                                 </p>
                                 <p className="text-xs text-primary font-semibold mt-1">{new Date(n.timestamp).toLocaleString()}</p>
                             </div>
                         </div>
                     );
                 })}
             </div>
        </div>
    );
};