import React from 'react';
import { useDataStore, useUIStore } from './store';
import { ViewState } from './types';
import { Notifications } from './components/Notifications';

interface LayoutProps {
    children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
    const { currentUser, logout, notifications } = useDataStore();
    const { setView, currentView, toggleSidebar, isSidebarOpen } = useUIStore();

    // Filter unread for current user
    const unreadCount = notifications.filter(n => n.userId === currentUser?.id && !n.read).length;

    const handleLogout = () => {
        logout();
        setView(ViewState.AUTH);
    }

    const NavItem = ({ view, label, icon, badge }: { view: ViewState, label: string, icon: React.ReactNode, badge?: number }) => (
        <button 
            onClick={() => { setView(view); if(window.innerWidth < 768) toggleSidebar(); }}
            className={`flex items-center gap-4 w-full p-4 rounded-2xl transition-all duration-300 group relative ${
                currentView === view 
                ? 'bg-gradient-to-r from-primary to-blue-600 text-white shadow-lg shadow-blue-500/30' 
                : 'hover:bg-white/50 text-slate-600 hover:text-primary'
            }`}
        >
            <div className={`transition-transform duration-300 ${currentView === view ? 'scale-110' : 'group-hover:scale-110'}`}>
                {icon}
            </div>
            <span className="font-bold tracking-wide">{label}</span>
            {badge && badge > 0 ? (
                <span className="absolute right-4 bg-red-500 text-white text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center shadow-md animate-bounce">
                    {badge > 9 ? '9+' : badge}
                </span>
            ) : null}
        </button>
    );

    return (
        <div className="min-h-screen flex flex-col h-screen overflow-hidden text-slate-800">
            {/* Top Navbar (Mobile Only/Minimal) */}
            <header className="md:hidden glass-panel sticky top-0 z-40 h-16 px-6 flex items-center justify-between shrink-0 shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={toggleSidebar} className="text-slate-600 active:scale-95 transition-transform">
                         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-7 h-7">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                        </svg>
                    </button>
                    <h1 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary cursor-pointer" onClick={() => setView(ViewState.HOME)}>NexLink</h1>
                </div>
                
                <img 
                    src={currentUser?.avatar} 
                    alt="Profile" 
                    className="w-10 h-10 rounded-full cursor-pointer border-2 border-white shadow-md object-cover"
                    onClick={() => setView(ViewState.PROFILE)}
                />
            </header>

            <div className="flex flex-1 overflow-hidden relative p-4 md:p-6 gap-6">
                {/* Sidebar - Floating Glass Panel */}
                <aside className={`absolute md:static inset-y-4 left-4 z-30 w-72 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-[110%]'} md:translate-x-0 transition-transform duration-300 ease-out flex flex-col`}>
                     <div className="glass-panel rounded-3xl h-full flex flex-col p-6 shadow-xl">
                        {/* Logo Area */}
                        <div className="mb-8 px-2 flex items-center gap-3">
                             <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-white font-bold text-xl shadow-lg">N</div>
                             <h1 className="text-2xl font-extrabold tracking-tight text-slate-800">NexLink</h1>
                        </div>

                        {/* User Mini Profile */}
                         <div className="flex items-center gap-4 p-3 mb-6 bg-white/40 rounded-2xl border border-white/50 cursor-pointer hover:bg-white/60 transition-colors" onClick={() => setView(ViewState.PROFILE)}>
                            <img src={currentUser?.avatar} className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm" />
                            <div className="flex flex-col min-w-0">
                                <span className="font-bold text-slate-800 truncate">{currentUser?.name}</span>
                                <span className="text-xs text-slate-500 font-medium truncate">Online</span>
                            </div>
                         </div>
                         
                         <nav className="space-y-2 flex-1">
                            <NavItem view={ViewState.HOME} label="Home" icon={
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M11.47 3.84a.75.75 0 0 1 1.06 0l8.69 8.69a.75.75 0 1 0 1.06-1.06l-8.689-8.69a2.25 2.25 0 0 0-3.182 0l-8.69 8.69a.75.75 0 0 0 1.061 1.06l8.69-8.69Z" /><path d="M12 5.432 5.15 12.283c-.8.8-1.252 1.884-1.265 3.016v4.617c0 .888.665 1.636 1.543 1.742l5.574.673a2.25 2.25 0 0 0 2.002-2.231v-2.315a.75.75 0 0 1 .75-.75h.487a.75.75 0 0 1 .75.75v2.315c0 .762.366 1.487.975 1.956.326.25.728.384 1.139.363l4.576-.228a1.65 1.65 0 0 0 1.564-1.645v-4.832a4.47 4.47 0 0 0-1.277-3.13L12 5.432Z" /></svg>
                            } />
                            <NavItem view={ViewState.FRIENDS} label="Friends" icon={
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M4.5 6.375a4.125 4.125 0 1 1 8.25 0 4.125 4.125 0 0 1-8.25 0ZM14.25 8.625a3.375 3.375 0 1 1 6.75 0 3.375 3.375 0 0 1-6.75 0ZM1.5 19.125a7.125 7.125 0 0 1 14.25 0v.003l-.001.119a.75.75 0 0 1-.363.63 13.067 13.067 0 0 1-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 0 1-.364-.63l-.001-.122ZM17.25 19.128l-.001.144a2.25 2.25 0 0 1-.233.96 10.088 10.088 0 0 0 5.06-4.42 6.753 6.753 0 0 0 .19-1.953 6.75 6.75 0 0 0-4.966-6.223 6 6 0 0 1-.05 11.5Z" /></svg>
                            } />
                            <NavItem view={ViewState.CHAT} label="Messenger" icon={
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path fillRule="evenodd" d="M4.848 2.771A49.144 49.144 0 0 1 12 2.25c2.43 0 4.817.178 7.152.52 1.978.292 3.348 2.024 3.348 3.97v6.02c0 1.946-1.37 3.678-3.348 3.97a48.901 48.901 0 0 1-3.476.383.39.39 0 0 0-.297.17l-2.755 4.133a.75.75 0 0 1-1.248 0l-2.755-4.133a.39.39 0 0 0-.297-.17 48.9 48.9 0 0 1-3.476-.384c-1.978-.29-3.348-2.024-3.348-3.97V6.741c0-1.946 1.37-3.678 3.348-3.97Z" clipRule="evenodd" /></svg>
                            } />
                            <NavItem view={ViewState.NOTIFICATIONS} label="Activity" badge={unreadCount} icon={
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                                    <path fillRule="evenodd" d="M5.25 9a6.75 6.75 0 0 1 13.5 0v.75c0 2.123.8 4.057 2.118 5.52a.75.75 0 0 1-.297 1.206c-1.544.57-3.16.99-4.831 1.243a3.75 3.75 0 1 1-7.48 0 2.485 2.485 0 0 0-2.153 1.51c-.556-1.545-2.171-1.99-4.831-1.244a.75.75 0 0 1-.298-1.205A8.217 8.217 0 0 0 5.25 9.75V9Zm4.502 8.9a2.25 2.25 0 1 0 4.496 0 25.057 25.057 0 0 1-4.496 0Z" clipRule="evenodd" />
                                </svg>
                            } />
                         </nav>

                         <div className="mt-8 pt-4 border-t border-slate-200/50">
                            <button onClick={handleLogout} className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-red-50 text-slate-600 hover:text-red-500 transition-colors">
                                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
                                </svg>
                                <span className="font-semibold">Logout</span>
                            </button>
                         </div>
                         <div className="text-center mt-4 text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                            Owner: Mot Mot Oyamat
                         </div>
                     </div>
                </aside>
                
                {/* Main Content Area */}
                <main className="flex-1 overflow-y-auto no-scrollbar rounded-3xl md:glass-panel relative flex justify-center">
                    <div className="w-full h-full p-4 md:p-8 max-w-5xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};