import React from 'react';
import { NavLink } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { PIS } from '../types';
import {
    LayoutDashboard,
    Table,
    Users,
    BarChart3,
    Layers,
    FileText,
    Clock,
    Settings,
    Database
} from 'lucide-react';
import clsx from 'clsx';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { currentPI, setCurrentPI, seedTestData } = useData();

    const navItems = [
        { path: `/${currentPI}/dashboard`, label: 'Dashboard', icon: LayoutDashboard },
        { path: `/${currentPI}/details`, label: 'Details', icon: Table },
        { path: `/${currentPI}/jira`, label: 'Jira', icon: FileText },
        { path: `/${currentPI}/everhour`, label: 'Everhour', icon: Clock },
        { path: `/${currentPI}/topics`, label: 'Topics', icon: Layers },
        { path: `/${currentPI}/features`, label: 'Features', icon: Database },
        { path: `/${currentPI}/teams`, label: 'Teams', icon: Users },
        { path: `/${currentPI}/metrics`, label: 'Metrics', icon: BarChart3 },
    ];

    return (
        <div className="flex h-screen overflow-hidden bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-slate-950">
            {/* Sidebar */}
            <aside className="w-72 flex-shrink-0 flex flex-col bg-slate-900/80 backdrop-blur-xl border-r border-white/5">
                <div className="p-6 border-b border-white/5">
                    <h1 className="text-xl font-bold bg-gradient-to-r from-white to-pp-mint-500 bg-clip-text text-transparent">
                        Scrum Metrics
                    </h1>
                </div>

                <div className="p-4">
                    <label className="text-xs text-slate-400 uppercase font-bold mb-2 block tracking-wider">
                        Program Increment
                    </label>
                    <div className="relative">
                        <select
                            value={currentPI}
                            onChange={(e) => setCurrentPI(e.target.value)}
                            className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-4 py-2.5 text-slate-200 focus:outline-none focus:border-pp-mint-500 focus:ring-1 focus:ring-pp-mint-500 appearance-none transition-all"
                        >
                            {PIS.map(pi => (
                                <option key={pi} value={pi}>{pi}</option>
                            ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 overflow-y-auto py-4 px-3">
                    <div className="flex flex-col gap-1">
                        {navItems.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={({ isActive }) => clsx(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                                    isActive
                                        ? "bg-pp-mint-500/10 text-pp-mint-500 shadow-sm shadow-pp-mint-500/5"
                                        : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                                )}
                            >
                                <item.icon size={18} />
                                {item.label}
                            </NavLink>
                        ))}
                    </div>
                </nav>

                <div className="p-4 border-t border-white/5">
                    <div className="flex flex-col gap-2">
                        <button className="flex items-center gap-3 px-3 py-2 text-sm text-slate-400 hover:text-slate-200 hover:bg-white/5 rounded-lg transition-colors w-full text-left">
                            <Settings size={18} />
                            <span>Settings</span>
                        </button>
                        <button
                            onClick={() => window.confirm('Generate test data?') && seedTestData()}
                            className="text-xs text-pp-mint-500/70 hover:text-pp-mint-500 px-3 py-1 text-left transition-colors"
                        >
                            Generate Test Data
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto">
                <div className="max-w-[1600px] mx-auto p-8">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default Layout;
