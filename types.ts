export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  avatar: string;
  isAi: boolean;
  isAiControlled?: boolean; 
  friends: string[];
  friendRequests: string[];
  followers: string[];
  following: string[];
  blockedUsers: string[]; // List of IDs blocked by this user
  blockedBy: string[]; // List of IDs who blocked this user
  bio?: string;
  isOnline?: boolean;
  lastActive?: number;
  blocked?: boolean;
}

export interface StoryText {
  id: string;
  content: string;
  x: number; // Percentage 0-100
  y: number; // Percentage 0-100
  color: string;
  scale: number;
}

export interface Story {
  id: string;
  userId: string;
  image: string;
  texts: StoryText[];
  timestamp: number;
  viewers: string[];
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  content: string;
  timestamp: number;
}

export interface Post {
  id: string;
  userId: string;
  content: string;
  image?: string;
  video?: string;
  likes: string[];
  timestamp: number;
  sharedFromId?: string; 
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  image?: string;
  storySnapshot?: string; // Base64 image of the story being replied to
  timestamp: number;
}

export interface Chat {
  id: string;
  type: 'private' | 'group';
  name?: string;
  image?: string; // Group photo
  members: string[];
  admins?: string[];
  archivedBy: string[]; // IDs of users who archived this chat
  createdAt: number;
  lastMessageAt?: number;
  unreadCounts: Record<string, number>; 
}

export interface Notification {
  id: string;
  userId: string; 
  actorId: string; 
  type: 'friend_request' | 'mention' | 'like' | 'comment' | 'follow' | 'share' | 'everyone';
  entityId?: string; 
  message: string;
  read: boolean;
  timestamp: number;
}

export enum ViewState {
  AUTH = 'AUTH',
  HOME = 'HOME',
  PROFILE = 'PROFILE', 
  FRIENDS = 'FRIENDS',
  CHAT = 'CHAT',
  NOTIFICATIONS = 'NOTIFICATIONS'
}