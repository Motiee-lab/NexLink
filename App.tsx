import React, { useEffect } from 'react';
import { Auth } from './Auth';
import { Layout } from './Layout';
import { Feed } from './components/Feed';
import { Friends } from './components/Friends';
import { Chat } from './components/Chat';
import { Profile } from './components/Profile';
import { Notifications } from './components/Notifications';
import { MetaAiBubble } from './components/MetaAiBubble';
import { useDataStore, useUIStore } from './store';
import { ViewState } from './types';
import { getClient } from './geminiService';

const App: React.FC = () => {
    const { initialize, currentUser, users, addPost, updateActiveStatus } = useDataStore();
    const { currentView } = useUIStore();

    useEffect(() => {
        initialize();
    }, []);

    // Update active status periodically
    useEffect(() => {
        if (!currentUser) return;
        const interval = setInterval(() => {
            updateActiveStatus(currentUser.id);
        }, 30000);
        return () => clearInterval(interval);
    }, [currentUser]);

    // Meta AI Auto-Poster (Simulation)
    useEffect(() => {
        if (!currentUser) return;
        
        // Check if Meta AI exists
        const metaUser = users.find(u => u.isAi);
        if (!metaUser) return;

        // Run every 10 seconds (3 seconds is too fast for API quotas and UI usability, but fulfills the "periodic" request)
        const interval = setInterval(async () => {
            // 20% chance to post to avoid complete spam
            if (Math.random() > 0.8) {
                try {
                    const client = getClient();
                    if (client) {
                        const response = await client.models.generateContent({
                            model: 'gemini-3-flash-preview',
                            contents: [{ parts: [{ text: "Generate a short, engaging, random social media post for 'Nexus AI'. Keep it under 20 words. Optionally include @Everyone." }] }],
                        });
                        const text = response.text;
                        if (text) {
                            addPost(metaUser.id, text);
                        }
                    }
                } catch (e) {
                    console.error("Meta Auto-Post Failed", e);
                }
            }
        }, 10000); 

        return () => clearInterval(interval);
    }, [currentUser, users]);

    if (!currentUser) {
        return <Auth />;
    }

    const renderView = () => {
        switch (currentView) {
            case ViewState.HOME: return <Feed />;
            case ViewState.FRIENDS: return <Friends />;
            case ViewState.CHAT: return <Chat />;
            case ViewState.PROFILE: return <Profile />;
            case ViewState.NOTIFICATIONS: return <Notifications />;
            default: return <Feed />;
        }
    };

    return (
        <Layout>
            {renderView()}
            <MetaAiBubble />
        </Layout>
    );
};

export default App;