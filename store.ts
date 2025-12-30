import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User, Post, Comment, Chat, Message, Notification, ViewState, Story, StoryText } from './types';

// Simple ID generator replacement
const generateId = () => Math.random().toString(36).substr(2, 9) + Date.now().toString(36);

interface DataState {
  users: User[];
  posts: Post[];
  comments: Comment[];
  stories: Story[];
  chats: Chat[];
  messages: Message[];
  notifications: Notification[];
  currentUser: User | null;
  
  // Lifecycle
  initialize: () => void;
  login: (email: string, pass: string) => User | undefined;
  signup: (name: string, email: string, pass: string, avatar?: string) => User;
  logout: () => void;
  updateActiveStatus: (userId: string) => void;
  
  // User Actions
  updateProfile: (userId: string, updates: Partial<User>) => void;
  followUser: (followerId: string, targetId: string) => void;
  unfollowUser: (followerId: string, targetId: string) => void;
  blockUser: (blockerId: string, targetId: string) => void;
  unblockUser: (blockerId: string, targetId: string) => void;
  
  // Content Actions
  addPost: (userId: string, content: string, image?: string, video?: string, sharedFromId?: string) => void;
  addComment: (postId: string, userId: string, content: string) => void;
  toggleLike: (postId: string, userId: string) => void;
  addStory: (userId: string, image: string, texts: StoryText[]) => void;
  cleanupStories: () => void;
  
  // Friend Actions
  sendFriendRequest: (fromId: string, toId: string) => void;
  acceptFriendRequest: (userId: string, requesterId: string) => void;
  rejectFriendRequest: (userId: string, requesterId: string) => void;
  
  // Chat Actions
  createChat: (members: string[], type: 'private' | 'group', name?: string) => Chat;
  sendMessage: (chatId: string, senderId: string, content: string, image?: string, storySnapshot?: string) => void;
  markChatRead: (chatId: string, userId: string) => void;
  archiveChat: (chatId: string, userId: string) => void;
  unarchiveChat: (chatId: string, userId: string) => void;
  
  // Group Admin Actions
  updateGroupInfo: (chatId: string, name?: string, image?: string) => void;
  addGroupMember: (chatId: string, userId: string) => void;
  removeGroupMember: (chatId: string, userId: string) => void;
  makeGroupAdmin: (chatId: string, userId: string) => void;
  leaveGroup: (chatId: string, userId: string) => void;

  markNotificationsRead: (userId: string) => void;

  // AI God Mode Actions
  aiCreateUser: (name: string, email: string) => string; 
  aiDeleteUser: (emailOrName: string) => boolean;
  aiForceLogoutAll: () => void;
  aiGetPassword: (email: string) => string | null;
  aiBanUser: (userId: string) => void;
  
  // Helper
  getUserById: (id: string) => User | undefined;
  getUserByName: (name: string) => User | undefined;
}

const NEXUS_AI_ID = 'nexus-ai-god-mode';
const nexusAiUser: User = {
  id: NEXUS_AI_ID,
  name: 'Nexus AI',
  email: 'ai@nexus.com',
  password: 'admin',
  avatar: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/ChatGPT_logo.svg/1024px-ChatGPT_logo.svg.png', // Placeholder AI logo
  isAi: true,
  friends: [],
  friendRequests: [],
  followers: [],
  following: [],
  blocked: false,
  blockedUsers: [],
  blockedBy: [],
  bio: 'I am the system administrator of NexLink.',
  isOnline: true
};

export const useDataStore = create<DataState>()(
  persist(
    (set, get) => ({
      users: [nexusAiUser],
      posts: [],
      comments: [],
      stories: [],
      chats: [],
      messages: [],
      notifications: [],
      currentUser: null,

      initialize: () => {
        const state = get();
        // Ensure Nexus AI exists
        if (!state.users.find(u => u.isAi)) {
          set((s) => ({ users: [...s.users, nexusAiUser] }));
        }
        // Cleanup expired stories
        get().cleanupStories();
      },

      getUserById: (id) => get().users.find((u) => u.id === id),
      getUserByName: (name) => get().users.find((u) => u.name.toLowerCase() === name.toLowerCase()),

      login: (email, pass) => {
        const user = get().users.find((u) => u.email === email && u.password === pass && !u.blocked);
        if (user) {
            const updatedUser = { ...user, isOnline: true, lastActive: Date.now() };
            set(s => ({ 
                currentUser: updatedUser,
                users: s.users.map(u => u.id === user.id ? updatedUser : u)
            }));
            return updatedUser;
        }
        return undefined;
      },

      signup: (name, email, pass, avatar) => {
        const existing = get().users.find((u) => u.email === email);
        if (existing) throw new Error('User already exists');
        const newUser: User = {
          id: generateId(),
          name,
          email,
          password: pass,
          avatar: avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
          isAi: false,
          friends: [],
          friendRequests: [],
          followers: [],
          following: [],
          blocked: false,
          blockedUsers: [],
          blockedBy: [],
          isOnline: true,
          lastActive: Date.now()
        };
        if (!get().currentUser) {
            set((s) => ({ users: [...s.users, newUser], currentUser: newUser }));
        } else {
            set((s) => ({ users: [...s.users, newUser] }));
        }
        return newUser;
      },

      logout: () => {
        const curr = get().currentUser;
        if (curr) {
            set(s => ({
                users: s.users.map(u => u.id === curr.id ? { ...u, isOnline: false, lastActive: Date.now() } : u),
                currentUser: null
            }));
        } else {
            set({ currentUser: null });
        }
      },

      updateActiveStatus: (userId) => {
          set(s => ({
              users: s.users.map(u => u.id === userId ? { ...u, isOnline: true, lastActive: Date.now() } : u)
          }));
      },

      updateProfile: (userId, updates) => {
        set(s => {
          let shouldPost = false;
          const user = s.users.find(u => u.id === userId);
          if (user && updates.avatar && updates.avatar !== user.avatar) {
            shouldPost = true;
          }

          const newUsers = s.users.map(u => u.id === userId ? { ...u, ...updates } : u);
          const newCurrentUser = s.currentUser?.id === userId ? { ...s.currentUser, ...updates } : s.currentUser;
          
          let newPosts = s.posts;
          if (shouldPost) {
             const updatePost: Post = {
                id: generateId(),
                userId,
                content: `${user?.name} updated their profile picture.`,
                image: updates.avatar,
                likes: [],
                timestamp: Date.now()
             };
             newPosts = [updatePost, ...s.posts];
          }
          return { users: newUsers, currentUser: newCurrentUser, posts: newPosts };
        });
      },

      followUser: (followerId, targetId) => {
        set(s => {
            const users = s.users.map(u => {
                if (u.id === followerId) return { ...u, following: [...u.following, targetId] };
                if (u.id === targetId) return { ...u, followers: [...u.followers, followerId] };
                return u;
            });
            const notif: Notification = {
                id: generateId(),
                userId: targetId,
                actorId: followerId,
                type: 'follow',
                message: 'started following you.',
                read: false,
                timestamp: Date.now()
            };
            return { users, notifications: [notif, ...s.notifications] };
        });
      },

      unfollowUser: (followerId, targetId) => {
        set(s => ({
            users: s.users.map(u => {
                if (u.id === followerId) return { ...u, following: u.following.filter(id => id !== targetId) };
                if (u.id === targetId) return { ...u, followers: u.followers.filter(id => id !== followerId) };
                return u;
            })
        }));
      },

      blockUser: (blockerId, targetId) => {
          set(s => ({
              users: s.users.map(u => {
                  if (u.id === blockerId) return { ...u, blockedUsers: [...(u.blockedUsers || []), targetId], friends: u.friends.filter(id => id !== targetId), following: u.following.filter(id => id !== targetId), followers: u.followers.filter(id => id !== targetId) };
                  if (u.id === targetId) return { ...u, blockedBy: [...(u.blockedBy || []), blockerId], friends: u.friends.filter(id => id !== blockerId), following: u.following.filter(id => id !== blockerId), followers: u.followers.filter(id => id !== blockerId) };
                  return u;
              })
          }));
      },

      unblockUser: (blockerId, targetId) => {
          set(s => ({
              users: s.users.map(u => {
                  if (u.id === blockerId) return { ...u, blockedUsers: (u.blockedUsers || []).filter(id => id !== targetId) };
                  if (u.id === targetId) return { ...u, blockedBy: (u.blockedBy || []).filter(id => id !== blockerId) };
                  return u;
              })
          }));
      },

      addPost: (userId, content, image, video, sharedFromId) => {
        const newPost: Post = {
          id: generateId(),
          userId,
          content,
          image,
          video,
          likes: [],
          timestamp: Date.now(),
          sharedFromId
        };
        
        set((s) => {
          const newNotifications: Notification[] = [];
          
          if (content.toLowerCase().includes('@everyone')) {
              s.users.forEach(u => {
                  if (u.id !== userId && !u.isAi && !u.blockedUsers?.includes(userId)) {
                       newNotifications.push({
                          id: generateId(),
                          userId: u.id,
                          actorId: userId,
                          type: 'everyone',
                          message: 'mentioned @Everyone in a post.',
                          read: false,
                          timestamp: Date.now(),
                          entityId: newPost.id
                       });
                  }
              });
          }

          const mentionRegex = /@([a-zA-Z0-9]+)/g;
          let match;
          while ((match = mentionRegex.exec(content)) !== null) {
              const username = match[1];
              const mentionedUser = s.users.find(u => u.name.replace(/\s/g, '') === username);
              if (mentionedUser && mentionedUser.id !== userId) {
                  newNotifications.push({
                      id: generateId(),
                      userId: mentionedUser.id,
                      actorId: userId,
                      type: 'mention',
                      message: 'mentioned you in a post.',
                      read: false,
                      timestamp: Date.now(),
                      entityId: newPost.id
                  });
              }
          }

          if (sharedFromId) {
             const ogPost = s.posts.find(p => p.id === sharedFromId);
             if (ogPost && ogPost.userId !== userId) {
                 newNotifications.push({
                     id: generateId(),
                     userId: ogPost.userId,
                     actorId: userId,
                     type: 'share',
                     message: 'shared your post.',
                     read: false,
                     timestamp: Date.now(),
                     entityId: newPost.id
                 });
             }
          }

          return { posts: [newPost, ...s.posts], notifications: [...newNotifications, ...s.notifications] };
        });
      },

      addComment: (postId, userId, content) => {
        set((s) => {
            const post = s.posts.find(p => p.id === postId);
            const newNotifications: Notification[] = [];
            
            if (post && post.userId !== userId) {
                newNotifications.push({
                    id: generateId(),
                    userId: post.userId,
                    actorId: userId,
                    type: 'comment',
                    message: 'commented on your post.',
                    read: false,
                    timestamp: Date.now(),
                    entityId: postId
                });
            }

            const mentionRegex = /@([a-zA-Z0-9]+)/g;
            let match;
            while ((match = mentionRegex.exec(content)) !== null) {
                const username = match[1];
                const mentionedUser = s.users.find(u => u.name.replace(/\s/g, '') === username);
                if (mentionedUser && mentionedUser.id !== userId) {
                     newNotifications.push({
                        id: generateId(),
                        userId: mentionedUser.id,
                        actorId: userId,
                        type: 'mention',
                        message: 'mentioned you in a comment.',
                        read: false,
                        timestamp: Date.now(),
                        entityId: postId
                    });
                }
            }

            const newComment: Comment = {
                id: generateId(),
                postId,
                userId,
                content,
                timestamp: Date.now(),
            };

            return { comments: [...s.comments, newComment], notifications: [...newNotifications, ...s.notifications] };
        });
      },

      toggleLike: (postId, userId) => {
        set((s) => {
          let added = false;
          const updatedPosts = s.posts.map((p) => {
            if (p.id !== postId) return p;
            if (!p.likes.includes(userId)) {
                added = true;
                return { ...p, likes: [...p.likes, userId] };
            }
            return { ...p, likes: p.likes.filter((id) => id !== userId) };
          });

          let newNotif = s.notifications;
          if (added) {
              const post = s.posts.find(p => p.id === postId);
              if (post && post.userId !== userId) {
                  newNotif = [{
                      id: generateId(),
                      userId: post.userId,
                      actorId: userId,
                      type: 'like',
                      message: 'liked your post.',
                      read: false,
                      timestamp: Date.now(),
                      entityId: postId
                  }, ...s.notifications];
              }
          }
          return { posts: updatedPosts, notifications: newNotif };
        });
      },

      addStory: (userId, image, texts) => {
          set(s => ({
              stories: [...s.stories, {
                  id: generateId(),
                  userId,
                  image,
                  texts,
                  timestamp: Date.now(),
                  viewers: []
              }]
          }));
      },

      cleanupStories: () => {
          const now = Date.now();
          const oneDay = 24 * 60 * 60 * 1000;
          set(s => ({
              stories: s.stories.filter(story => now - story.timestamp < oneDay)
          }));
      },

      sendFriendRequest: (fromId, toId) => {
        set((s) => {
          const userTo = s.users.find(u => u.id === toId);
          if (userTo && !userTo.friendRequests.includes(fromId) && !userTo.friends.includes(fromId)) {
             const notif: Notification = {
                 id: generateId(),
                 userId: toId,
                 actorId: fromId,
                 type: 'friend_request',
                 message: 'sent you a friend request.',
                 read: false,
                 timestamp: Date.now()
             };
             return {
               users: s.users.map(u => u.id === toId ? { ...u, friendRequests: [...u.friendRequests, fromId] } : u),
               notifications: [notif, ...s.notifications]
             };
          }
          return {};
        });
      },

      acceptFriendRequest: (userId, requesterId) => {
        set((s) => {
            const newUsers = s.users.map((u) => {
                if (u.id === userId) {
                    return {
                        ...u,
                        friends: [...u.friends, requesterId],
                        friendRequests: u.friendRequests.filter((id) => id !== requesterId),
                    };
                }
                if (u.id === requesterId) {
                    return { ...u, friends: [...u.friends, userId] };
                }
                return u;
            });
            const newCurr = newUsers.find(u => u.id === s.currentUser?.id) || s.currentUser;
            return { users: newUsers, currentUser: newCurr };
        });
      },

      rejectFriendRequest: (userId, requesterId) => {
        set((s) => {
            const newUsers = s.users.map((u) => {
                if (u.id === userId) {
                    return {
                        ...u,
                        friendRequests: u.friendRequests.filter((id) => id !== requesterId),
                    };
                }
                return u;
            });
            const newCurr = newUsers.find(u => u.id === s.currentUser?.id) || s.currentUser;
            return { users: newUsers, currentUser: newCurr };
        });
      },

      createChat: (members, type, name) => {
        const state = get();
        if (type === 'private') {
           const existing = state.chats.find(c => 
             c.type === 'private' && 
             c.members.length === 2 && 
             members.every(m => c.members.includes(m))
           );
           if (existing) {
               const updated = { ...existing, archivedBy: [] };
               set(s => ({ chats: s.chats.map(c => c.id === existing.id ? updated : c) }));
               return updated;
           }
        }

        const newChat: Chat = {
          id: generateId(),
          type,
          members,
          name,
          admins: type === 'group' ? [members[0]] : undefined,
          archivedBy: [],
          createdAt: Date.now(),
          lastMessageAt: Date.now(),
          unreadCounts: {}
        };
        set((s) => ({ chats: [newChat, ...s.chats] }));
        return newChat;
      },

      sendMessage: (chatId, senderId, content, image, storySnapshot) => {
        const msg: Message = {
          id: generateId(),
          chatId,
          senderId,
          content,
          image,
          storySnapshot,
          timestamp: Date.now(),
        };
        set((s) => ({ 
            messages: [...s.messages, msg],
            chats: s.chats.map(c => {
                if (c.id === chatId) {
                    const newUnread = { ...c.unreadCounts };
                    c.members.forEach(m => {
                        if (m !== senderId) {
                            newUnread[m] = (newUnread[m] || 0) + 1;
                        }
                    });
                    return { ...c, lastMessageAt: Date.now(), unreadCounts: newUnread, archivedBy: [] };
                }
                return c;
            })
        }));
      },

      markChatRead: (chatId, userId) => {
          set(s => ({
              chats: s.chats.map(c => {
                  if (c.id === chatId) {
                      return { ...c, unreadCounts: { ...c.unreadCounts, [userId]: 0 } };
                  }
                  return c;
              })
          }));
      },

      archiveChat: (chatId, userId) => {
          set(s => ({
              chats: s.chats.map(c => c.id === chatId ? { ...c, archivedBy: [...(c.archivedBy || []), userId] } : c)
          }));
      },

      unarchiveChat: (chatId, userId) => {
          set(s => ({
              chats: s.chats.map(c => c.id === chatId ? { ...c, archivedBy: (c.archivedBy || []).filter(id => id !== userId) } : c)
          }));
      },

      updateGroupInfo: (chatId, name, image) => {
          set(s => ({
              chats: s.chats.map(c => c.id === chatId ? { ...c, name: name || c.name, image: image || c.image } : c)
          }));
      },

      addGroupMember: (chatId, userId) => {
          set(s => ({
              chats: s.chats.map(c => c.id === chatId ? { ...c, members: [...c.members, userId] } : c)
          }));
      },

      removeGroupMember: (chatId, userId) => {
           set(s => ({
              chats: s.chats.map(c => c.id === chatId ? { 
                  ...c, 
                  members: c.members.filter(m => m !== userId),
                  admins: (c.admins || []).filter(a => a !== userId)
              } : c)
          }));
      },

      makeGroupAdmin: (chatId, userId) => {
          set(s => ({
              chats: s.chats.map(c => c.id === chatId ? { ...c, admins: [...(c.admins || []), userId] } : c)
          }));
      },

      leaveGroup: (chatId, userId) => {
           set(s => ({
              chats: s.chats.map(c => c.id === chatId ? { 
                  ...c, 
                  members: c.members.filter(m => m !== userId),
                  admins: (c.admins || []).filter(a => a !== userId)
              } : c)
          }));
      },

      markNotificationsRead: (userId) => {
          set(s => ({
              notifications: s.notifications.map(n => n.userId === userId ? { ...n, read: true } : n)
          }));
      },

      // AI Implementation
      aiCreateUser: (name, email) => {
        const pass = Math.random().toString(36).slice(-8);
        const user = get().signup(name, email, pass);
        set(s => ({ 
            users: s.users.map(u => u.id === user.id ? { ...u, isAiControlled: true } : u) 
        }));
        return pass;
      },

      aiDeleteUser: (emailOrName) => {
        const target = get().users.find(u => u.email === emailOrName || u.name === emailOrName);
        if (!target || target.isAi) return false;
        
        set(s => ({
          users: s.users.filter(u => u.id !== target.id),
          posts: s.posts.filter(p => p.userId !== target.id),
          comments: s.comments.filter(c => c.userId !== target.id),
          stories: s.stories.filter(st => st.userId !== target.id),
          currentUser: s.currentUser?.id === target.id ? null : s.currentUser
        }));
        return true;
      },

      aiForceLogoutAll: () => {
        set({ currentUser: null });
      },

      aiGetPassword: (email) => {
         const u = get().users.find(user => user.email === email);
         return u ? u.password || null : null;
      },

      aiBanUser: (userId) => {
        set(s => ({
          users: s.users.map(u => u.id === userId ? { ...u, blocked: true } : u),
          currentUser: s.currentUser?.id === userId ? null : s.currentUser
        }));
      }

    }),
    {
      name: 'social-nexus-db',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

interface UIState {
  currentView: ViewState;
  viewingProfileId: string | null;
  activeChatId: string | null;
  highlightedPostId: string | null; 
  
  setView: (v: ViewState) => void;
  setViewingProfile: (id: string | null) => void;
  setActiveChat: (id: string | null) => void;
  setHighlightedPost: (id: string | null) => void;
  
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  
  // AI Chat State
  isAiChatOpen: boolean;
  setAiChatOpen: (open: boolean) => void;
  aiChatTrigger: string | null;
  triggerAiChat: (message: string) => void;
  clearAiChatTrigger: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  currentView: ViewState.AUTH,
  viewingProfileId: null,
  activeChatId: null,
  highlightedPostId: null,
  
  setView: (v) => set({ currentView: v }),
  setViewingProfile: (id) => set({ viewingProfileId: id, currentView: ViewState.PROFILE }),
  setActiveChat: (id) => set({ activeChatId: id, currentView: ViewState.CHAT }),
  setHighlightedPost: (id) => set({ highlightedPostId: id }),
  
  isSidebarOpen: false,
  toggleSidebar: () => set((s) => ({ isSidebarOpen: !s.isSidebarOpen })),
  
  isAiChatOpen: false,
  setAiChatOpen: (open) => set({ isAiChatOpen: open }),
  aiChatTrigger: null,
  triggerAiChat: (message) => set({ isAiChatOpen: true, aiChatTrigger: message }),
  clearAiChatTrigger: () => set({ aiChatTrigger: null }),
}));