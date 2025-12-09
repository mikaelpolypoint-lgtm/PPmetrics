import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { PIS } from '../types';
import {
    LayoutDashboard,
    Table,
    Users,
    PieChart,
    BarChart3,
    Layers,
    FileText,
    Clock,
    Settings,
    Database
} from 'lucide-react';
import clsx from 'clsx';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { currentPI } = useData();
    const navigate = useNavigate();
    const location = useLocation();

    const handlePIChange = (newPI: string) => {
        // Replace current PI in URL with new PI
        const currentPath = location.pathname;
        const newPath = currentPath.replace(`/${currentPI}`, `/${newPI}`);
        navigate(newPath);
    };

    const navItems = [
        { path: `/${currentPI}/dashboard`, label: 'Dashboard', icon: LayoutDashboard },
        { path: `/${currentPI}/details`, label: 'Details', icon: Table },
        { path: `/${currentPI}/jira`, label: 'Jira', icon: FileText },
        { path: `/${currentPI}/burndown`, label: 'Burndown', icon: PieChart },
        { path: `/${currentPI}/everhour`, label: 'Everhour', icon: Clock },
        { path: `/${currentPI}/topics`, label: 'Topics', icon: Layers },
        { path: `/${currentPI}/features`, label: 'Features', icon: Database },
        { path: `/${currentPI}/teams`, label: 'Teams', icon: Users },
        { path: `/${currentPI}/metrics`, label: 'Metrics', icon: BarChart3 },
    ];

    return (
        <div className="flex h-screen overflow-hidden bg-bg-main">
            {/* Sidebar */}
            <aside className="w-72 flex-shrink-0 flex flex-col bg-bg-surface border-r border-gray-200">
                <div className="p-6 border-b border-gray-100">
                    <h1 className="text-xl font-bold text-brand-primary">
                        Scrum Metrics
                    </h1>
                </div>

                <div className="p-4">
                    <label className="text-xs text-text-muted uppercase font-bold mb-2 block tracking-wider">
                        Program Increment
                    </label>
                    <div className="relative">
                        <select
                            value={currentPI}
                            onChange={(e) => handlePIChange(e.target.value)}
                            className="w-full bg-bg-main border border-gray-200 rounded-lg px-4 py-2.5 text-text-main focus:outline-none focus:border-brand-accent focus:ring-1 focus:ring-brand-accent appearance-none transition-all"
                        >
                            {PIS.map(pi => (
                                <option key={pi} value={pi}>{pi}</option>
                            ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">
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
                                        ? "bg-brand-primary/5 text-brand-primary font-bold shadow-sm"
                                        : "text-text-muted hover:text-brand-primary hover:bg-gray-50"
                                )}
                            >
                                <item.icon size={18} />
                                {item.label}
                            </NavLink>
                        ))}
                    </div>
                </nav>

                <div className="p-4 border-t border-gray-100">
                    <div className="flex flex-col gap-2">
                        <button className="flex items-center gap-3 px-3 py-2 text-sm text-text-muted hover:text-brand-primary hover:bg-gray-50 rounded-lg transition-colors w-full text-left">
                            <Settings size={18} />
                            <span>Settings</span>
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
