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
        <div className="app-layout">
            {/* Sidebar */}
            <aside className="sidebar">
                <div className="p-6 border-b">
                    <h1 className="text-xl font-bold text-gradient">
                        Scrum Metrics
                    </h1>
                </div>

                <div className="p-4">
                    <label className="text-xs text-secondary uppercase font-bold mb-2 block">
                        Program Increment
                    </label>
                    <select
                        value={currentPI}
                        onChange={(e) => setCurrentPI(e.target.value)}
                    >
                        {PIS.map(pi => (
                            <option key={pi} value={pi}>{pi}</option>
                        ))}
                    </select>
                </div>

                <nav className="flex-1 overflow-y-auto py-4">
                    <div className="flex flex-col">
                        {navItems.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={({ isActive }) => clsx("nav-item", isActive && "active")}
                            >
                                <item.icon size={18} />
                                {item.label}
                            </NavLink>
                        ))}
                    </div>
                </nav>

                <div className="p-4 border-t">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-3 px-4 py-2 text-sm text-secondary">
                            <Settings size={18} />
                            <span>Settings</span>
                        </div>
                        <button
                            onClick={() => window.confirm('Generate test data?') && seedTestData()}
                            className="text-xs text-primary hover:underline px-4 text-left bg-transparent border-none cursor-pointer"
                        >
                            Generate Test Data
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="main-content">
                <div className="container">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default Layout;
