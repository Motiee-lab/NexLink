import { GoogleGenAI, FunctionDeclaration, Type } from "@google/genai";
import { useDataStore } from "./store";

// Support for multiple API keys separated by commas for load balancing
const rawApiKey = process.env.API_KEY || '';
const apiKeys = rawApiKey.split(',').map(k => k.trim()).filter(k => k.length > 0);

const clients: GoogleGenAI[] = [];

// Initialize a client pool
if (apiKeys.length > 0) {
    apiKeys.forEach(key => {
        try {
            clients.push(new GoogleGenAI({ apiKey: key }));
        } catch (e) {
            console.error("Failed to initialize a Gemini client:", e);
        }
    });
    console.log(`[NexLink] Load Balancer: ${clients.length} API keys loaded.`);
}

let currentClientIndex = 0;

export const getClient = () => {
    if (clients.length === 0) return null;
    
    // Round-robin selection to distribute API usage
    const client = clients[currentClientIndex];
    currentClientIndex = (currentClientIndex + 1) % clients.length;
    
    return client;
}

// --- Tools ---

const createUserTool: FunctionDeclaration = {
    name: 'create_account',
    description: 'Create a new user account. Returns password.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            name: { type: Type.STRING },
            email: { type: Type.STRING },
        },
        required: ['name', 'email']
    }
};

const deleteUserTool: FunctionDeclaration = {
    name: 'delete_account',
    description: 'Permanently delete a user account.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            identifier: { type: Type.STRING, description: "Email or name" },
        },
        required: ['identifier']
    }
};

const updateUserProfileTool: FunctionDeclaration = {
    name: 'update_user_profile',
    description: 'Update user name or avatar.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            identifier: { type: Type.STRING, description: "Current name or email" },
            newName: { type: Type.STRING },
            newAvatarUrl: { type: Type.STRING }
        },
        required: ['identifier']
    }
};

const forceLogoutTool: FunctionDeclaration = {
    name: 'force_logout_all',
    description: 'Log out all users.',
    parameters: { type: Type.OBJECT, properties: {} }
};

const getPasswordTool: FunctionDeclaration = {
    name: 'recover_password',
    description: 'Get password by email.',
    parameters: {
        type: Type.OBJECT,
        properties: { email: { type: Type.STRING } },
        required: ['email']
    }
};

const banUserTool: FunctionDeclaration = {
    name: 'ban_user',
    description: 'Ban a user.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            identifier: { type: Type.STRING },
            reason: { type: Type.STRING },
        },
        required: ['identifier']
    }
};

const createPostTool: FunctionDeclaration = {
    name: 'create_post',
    description: 'Create a post for a user.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            userName: { type: Type.STRING },
            content: { type: Type.STRING },
        },
        required: ['userName', 'content']
    }
};

const bulkPostTool: FunctionDeclaration = {
    name: 'bulk_post',
    description: 'Create posts for multiple users at once.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            posts: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        userName: { type: Type.STRING },
                        content: { type: Type.STRING }
                    }
                }
            }
        },
        required: ['posts']
    }
};

const createCommentTool: FunctionDeclaration = {
    name: 'create_comment',
    description: 'Comment on a post.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            postId: { type: Type.STRING },
            userName: { type: Type.STRING },
            content: { type: Type.STRING },
        },
        required: ['postId', 'userName', 'content']
    }
};

const addFriendTool: FunctionDeclaration = {
    name: 'add_friend',
    description: 'Force connect two users as friends.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            userA: { type: Type.STRING },
            userB: { type: Type.STRING },
        },
        required: ['userA', 'userB']
    }
};

const followUserTool: FunctionDeclaration = {
    name: 'follow_user',
    description: 'Make User A follow User B.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            followerName: { type: Type.STRING },
            targetName: { type: Type.STRING },
        },
        required: ['followerName', 'targetName']
    }
};

export const TOOLS = [
    createUserTool, 
    deleteUserTool, 
    updateUserProfileTool,
    forceLogoutTool, 
    getPasswordTool, 
    banUserTool,
    createPostTool,
    bulkPostTool,
    createCommentTool,
    addFriendTool,
    followUserTool
];

export const executeTool = async (name: string, args: any): Promise<any> => {
    const store = useDataStore.getState();
    console.log(`Executing tool: ${name}`, args);

    switch (name) {
        case 'create_account':
            try {
                const pass = store.aiCreateUser(args.name, args.email);
                return { success: true, message: `Account created. Pass: ${pass}` };
            } catch (e: any) {
                return { success: false, message: e.message };
            }
        case 'delete_account':
            const deleted = store.aiDeleteUser(args.identifier);
            return { success: deleted, message: deleted ? 'Deleted' : 'Not found' };
        case 'update_user_profile':
            const uToUpdate = store.getUserByName(args.identifier) || store.users.find(u => u.email === args.identifier);
            if (uToUpdate) {
                store.updateProfile(uToUpdate.id, {
                    name: args.newName || uToUpdate.name,
                    avatar: args.newAvatarUrl || uToUpdate.avatar
                });
                return { success: true, message: `Updated profile for ${uToUpdate.name}` };
            }
            return { success: false, message: 'User not found' };
        case 'force_logout_all':
            store.aiForceLogoutAll();
            return { success: true };
        case 'recover_password':
            const pw = store.aiGetPassword(args.email);
            return { success: !!pw, password: pw || 'User not found' };
        case 'ban_user':
            let userToBan = store.getUserById(args.identifier) || store.getUserByName(args.identifier);
            if (userToBan) {
                store.aiBanUser(userToBan.id);
                return { success: true, message: `Banned ${userToBan.name}` };
            }
            return { success: false, message: 'User not found' };
        case 'create_post':
            const poster = store.getUserByName(args.userName);
            if (poster) {
                store.addPost(poster.id, args.content);
                return { success: true, message: `Posted for ${poster.name}` };
            }
            return { success: false, message: 'User not found' };
        case 'bulk_post':
            let count = 0;
            for (const p of args.posts) {
                const u = store.getUserByName(p.userName);
                if (u) {
                    store.addPost(u.id, p.content);
                    count++;
                }
            }
            return { success: true, message: `Created ${count} posts.` };
        case 'create_comment':
            const commenter = store.getUserByName(args.userName);
            if (commenter) {
                store.addComment(args.postId, commenter.id, args.content);
                return { success: true, message: `Commented.` };
            }
            return { success: false };
        case 'add_friend':
             const u1 = store.getUserByName(args.userA);
             const u2 = store.getUserByName(args.userB);
             if (u1 && u2) {
                 store.acceptFriendRequest(u1.id, u2.id);
                 return { success: true, message: `Connected.` };
             }
             return { success: false };
        case 'follow_user':
            const f = store.getUserByName(args.followerName);
            const t = store.getUserByName(args.targetName);
            if (f && t) {
                store.followUser(f.id, t.id);
                return { success: true, message: `${f.name} followed ${t.name}` };
            }
            return { success: false };
        default:
            return { success: false, message: 'Unknown tool' };
    }
};