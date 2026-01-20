import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { PIS } from '../types';
import {
    LayoutDashboard, Users, Database, Clock, Layers, FileText,
    Activity, PieChart, ChevronDown, ChevronRight, Settings, Calendar as CalendarIcon,
    Target
} from 'lucide-react';
import clsx from 'clsx';

// Define the structure for Navigation Items
interface NavItemProps {
    path: string;
    label: string;
    icon: React.ElementType;
    children?: NavItemProps[];
    level?: number;
}

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { currentPI } = useData();
    const navigate = useNavigate();
    const location = useLocation();

    // Map of expanded groups. Key is the path of the parent.
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});

    const handlePIChange = (newPI: string) => {
        // Replace current PI in URL with new PI
        const currentPath = location.pathname;
        const newPath = currentPath.replace(`/${currentPI}`, `/${newPI}`);
        navigate(newPath);
    };

    const toggleExpand = (path: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setExpanded(prev => ({ ...prev, [path]: !prev[path] }));
    };

    // Auto-expand if current route is a child
    useEffect(() => {

        // Define mapping of parents to their children keywords
        const mappings = [
            { parent: `/${currentPI}/master-data`, keywords: ['/master-data', '/calendar', '/teams', '/capacity-developers', '/capacity-availabilities', '/capacity-changes'] },
            { parent: `/${currentPI}/capacity-planning`, keywords: ['/capacity-planning', '/capacity-dashboard', '/capacity-details', '/capacity-team-details'] },
            { parent: `/${currentPI}/sprint-metrics-overview`, keywords: ['/sprint-metrics-overview', '/sprint-metrics', '/monatscontrolling', '/everhour-capacities', '/dashboard', '/burndown', '/metrics'] },
            { parent: `/${currentPI}/pi-scope`, keywords: ['/pi-scope', '/topics', '/features', '/jira', '/everhour'] },
        ];

        /* 
           Issue: '/everhour' is in PI Scope, but '/everhour-capacities' is in Metric Group.
           Simple .includes() for /everhour will match both.
        */

        mappings.forEach(m => {
            const key = m.parent;
            const isMatch = m.keywords.some(k => {
                if (location.pathname === k) return true;
                if (location.pathname.includes(k)) {
                    // Disambiguate /everhour and /everhour-capacities
                    if (k === '/everhour' && location.pathname.includes('/everhour-capacities')) return false;
                    return true;
                }
                return false;
            });

            if (isMatch) {
                setExpanded(prev => ({ ...prev, [key]: true }));
            }
        });

        if (location.pathname.includes('/capacity-changes')) {
            setExpanded(prev => ({ ...prev, [`/${currentPI}/capacity-availabilities`]: true }));
        }

    }, [location.pathname, currentPI]);


    const navGroups: NavItemProps[] = [
        {
            path: `/${currentPI}/capacity-planning`,
            label: 'Capacity',
            icon: Users,
            children: [
                { path: `/${currentPI}/capacity-dashboard`, label: 'Capacity Dashboard', icon: LayoutDashboard },
                { path: `/${currentPI}/capacity-details`, label: 'PIB Capacity', icon: FileText },
                { path: `/${currentPI}/capacity-team-details`, label: 'PIB Team Capacity', icon: Users },
            ]
        },
        {
            path: `/${currentPI}/sprint-metrics-overview`, // Staying with route for now to avoid break
            label: 'Metrics',
            icon: Activity,
            children: [
                { path: `/${currentPI}/dashboard`, label: 'Dashboard', icon: LayoutDashboard },
                { path: `/${currentPI}/burndown`, label: 'Burndown', icon: PieChart },
                { path: `/${currentPI}/sprint-metrics`, label: 'Sprint Metrics', icon: Activity },
                { path: `/${currentPI}/monatscontrolling`, label: 'Monatscontrolling', icon: PieChart },
                { path: `/${currentPI}/everhour-capacities`, label: 'Everhour Capacities', icon: Clock },
                { path: `/${currentPI}/metrics`, label: 'Metric Config', icon: Settings },
            ]
        },
        {
            path: `/${currentPI}/pi-scope`,
            label: 'Scope',
            icon: Target,
            children: [
                { path: `/${currentPI}/topics`, label: 'Topics', icon: Layers },
                { path: `/${currentPI}/features`, label: 'Features', icon: Database },
                { path: `/${currentPI}/jira`, label: 'Jira', icon: FileText },
                { path: `/${currentPI}/everhour`, label: 'Everhour', icon: Clock },
            ]
        },
        {
            path: `/${currentPI}/master-data`,
            label: 'Configuration',
            icon: Settings,
            children: [
                { path: `/${currentPI}/calendar`, label: 'Calendar', icon: CalendarIcon },
                { path: `/${currentPI}/teams`, label: 'Teams', icon: Users },
                { path: `/${currentPI}/capacity-developers`, label: 'Developers', icon: Users },
                {
                    path: `/${currentPI}/capacity-availabilities`,
                    label: 'Availabilities',
                    icon: Clock,
                    children: [
                        { path: `/${currentPI}/capacity-changes`, label: 'Changes', icon: Activity }
                    ]
                },
            ]
        }
    ];

    const tutorialItem: NavItemProps = { path: `/${currentPI}/tutorial`, label: 'Tutorial', icon: FileText };
    const storageItem: NavItemProps = { path: `/${currentPI}/data-storage`, label: 'Data Storage', icon: Database };


    const NavItemRenderer: React.FC<{ item: NavItemProps, level?: number }> = ({ item, level = 0 }) => {
        const hasChildren = item.children && item.children.length > 0;
        const isExpanded = expanded[item.path];

        return (
            <div className="flex flex-col gap-1">
                <div className={clsx("flex items-center justify-between pr-2 rounded-lg transition-all duration-200 hover:bg-gray-50",
                    level > 0 && "ml-4" // Indentation
                )}>
                    <NavLink
                        to={item.path}
                        className={({ isActive }) => clsx(
                            "flex flex-1 items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                            isActive
                                ? "bg-brand-primary/5 text-brand-primary font-bold shadow-sm"
                                : "text-text-muted hover:text-brand-primary"
                        )}
                    >
                        <item.icon size={18} />
                        <span className="truncate">{item.label}</span>
                    </NavLink>

                    {hasChildren && (
                        <button
                            onClick={(e) => toggleExpand(item.path, e)}
                            className="p-1 text-text-muted hover:text-brand-primary rounded-md hover:bg-gray-100"
                        >
                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                    )}
                </div>

                {hasChildren && isExpanded && (
                    <div className="flex flex-col gap-1 border-l border-gray-100 ml-5 pl-1 animate-in slide-in-from-top-2 duration-200">
                        {item.children!.map(child => (
                            <NavItemRenderer key={child.path} item={child} level={level + 1} />
                        ))}
                    </div>
                )}
            </div>
        );
    };

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
                            <ChevronDown size={14} />
                        </div>
                    </div>
                </div>

                <nav className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1 scrollbar-thin scrollbar-thumb-gray-200">

                    {navGroups.map((group, idx) => (
                        <React.Fragment key={group.path}>
                            <NavItemRenderer item={group} />
                            {idx < navGroups.length - 1 && <div className="my-2 border-t border-gray-100/50" />}
                        </React.Fragment>
                    ))}

                    <div className="my-2 border-t border-gray-200" />

                    {/* Help */}
                    <NavItemRenderer item={storageItem} />
                    <NavItemRenderer item={tutorialItem} />

                </nav>
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
