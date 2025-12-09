import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import PageHeader from '../components/PageHeader';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Filter } from 'lucide-react';

const Burndown: React.FC = () => {
    const { stories, currentPI } = useData();

    // Filter State
    const [featureFilter, setFeatureFilter] = useState<string>('all');
    const [teamFilter, setTeamFilter] = useState<string>('all');

    // Derived Data
    const currentStories = stories.filter(s => s.pi === currentPI);
    const uniqueFeatures = Array.from(new Set(currentStories.map(s => s.epic).filter(Boolean)));
    const uniqueTeams = Array.from(new Set(currentStories.map(s => s.team).filter(Boolean)));

    // Helper: Status Normalization (Same as Jira page)
    const normalizeStatus = (status: string) => {
        const s = status.toLowerCase();
        if (s === 'done') return 'Done';
        if (['in testing', 'ready for testing', 'ready design review', 'testing'].includes(s)) return 'Testing';
        if (['ready for code review', 'code review'].includes(s)) return 'Code Review';
        if (['in development', 'started'].includes(s)) return 'Started';
        if (s === 'blocked') return 'Blocked';
        return 'Open';
    };

    // Color Mapping
    const STATUS_COLORS: Record<string, string> = {
        'Done': '#15803d',        // green-700
        'Testing': '#86efac',     // green-300
        'Code Review': '#fde047', // yellow-300
        'Started': '#fdba74',     // orange-300
        'Blocked': '#7f1d1d',     // red-900
        'Open': '#fca5a5',        // red-300
    };

    const filteredStories = useMemo(() => {
        let result = currentStories;

        if (featureFilter !== 'all') {
            result = result.filter(s => s.epic === featureFilter);
        }
        if (teamFilter !== 'all') {
            result = result.filter(s => s.team === teamFilter);
        }

        return result;
    }, [currentStories, featureFilter, teamFilter]);

    const chartData = useMemo(() => {
        const data: Record<string, number> = {
            'Done': 0,
            'Testing': 0,
            'Code Review': 0,
            'Started': 0,
            'Blocked': 0,
            'Open': 0
        };

        filteredStories.forEach(story => {
            const status = normalizeStatus(story.status);
            data[status] = (data[status] || 0) + (story.sp || 0);
        });

        return Object.entries(data)
            .map(([name, value]) => ({ name, value }))
            .filter(item => item.value > 0); // Only show statuses with data
    }, [filteredStories]);

    const totalSP = chartData.reduce((sum, item) => sum + item.value, 0);

    return (
        <div className="space-y-6">
            <PageHeader
                title={`${currentPI} Burndown`}
                description="Visualizing PI Scope by Status (Story Points)."
            />

            {/* Filters Toolbar */}
            <div className="card p-4 flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2 text-text-muted">
                    <Filter size={18} />
                    <span className="font-medium">Filters:</span>
                </div>

                <select
                    value={featureFilter}
                    onChange={e => setFeatureFilter(e.target.value)}
                    className="input py-1.5 text-sm w-40"
                >
                    <option value="all">All Features</option>
                    {uniqueFeatures.map(f => (
                        <option key={f} value={f}>{f}</option>
                    ))}
                </select>

                <select
                    value={teamFilter}
                    onChange={e => setTeamFilter(e.target.value)}
                    className="input py-1.5 text-sm w-40"
                >
                    <option value="all">All Teams</option>
                    {uniqueTeams.map(t => (
                        <option key={t} value={t}>{t}</option>
                    ))}
                </select>

                <div className="ml-auto text-sm text-text-muted">
                    Total Scope: <span className="font-bold text-text-main">{totalSP} SP</span>
                </div>
            </div>

            <div className="card p-8 h-[500px] flex flex-col items-center justify-center">
                {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                                outerRadius={150}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || '#cccccc'} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => [`${value} SP`, 'Story Points']} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="text-text-muted flex flex-col items-center gap-2">
                        <p>No data available for the selected filters.</p>
                    </div>
                )}
            </div>

            {/* Filtered Stories Table */}
            <div className="card overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-brand-primary">Filtered Stories</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Key</th>
                                <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Summary</th>
                                <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Since</th>
                                <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">SP</th>
                                <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Team</th>
                                <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Sprint</th>
                                <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Feature</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredStories.sort((a, b) => {
                                // Sort by Sprint first (Ascending)
                                if (a.sprint < b.sprint) return -1;
                                if (a.sprint > b.sprint) return 1;

                                // Then by Status Rank
                                const getRank = (status: string) => {
                                    const s = normalizeStatus(status);
                                    if (s === 'Done') return 1;
                                    if (s === 'Testing') return 2;
                                    if (s === 'Code Review') return 3;
                                    if (s === 'Started') return 4;
                                    if (s === 'Open') return 5;
                                    if (s === 'Blocked') return 6;
                                    return 7;
                                };
                                return getRank(a.status) - getRank(b.status);
                            }).map(story => {
                                const normalizedStatus = normalizeStatus(story.status);
                                return (
                                    <tr key={story.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-mono text-sm">
                                            <a
                                                href={`https://polypoint.atlassian.net/browse/${story.key}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-brand-secondary hover:text-brand-primary hover:underline"
                                            >
                                                {story.key}
                                            </a>
                                        </td>
                                        <td className="px-6 py-4 text-text-main max-w-md truncate" title={story.name}>{story.name}</td>
                                        <td className="px-6 py-4">
                                            <span
                                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border"
                                                style={{
                                                    backgroundColor: STATUS_COLORS[normalizedStatus] + '20', // 20% opacity for background
                                                    color: STATUS_COLORS[normalizedStatus], // Darker text
                                                    borderColor: STATUS_COLORS[normalizedStatus] + '40' // 40% opacity for border
                                                }}
                                            >
                                                {normalizedStatus}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-text-muted text-xs">{story.since}</td>
                                        <td className="px-6 py-4 text-text-main">{story.sp}</td>
                                        <td className="px-6 py-4 text-text-main">{story.team}</td>
                                        <td className="px-6 py-4 text-text-main">{story.sprint}</td>
                                        <td className="px-6 py-4"><span className="badge badge-accent">{story.epic}</span></td>
                                    </tr>
                                );
                            })}
                            {filteredStories.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="text-center py-8 text-text-muted">
                                        No stories match the current filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Burndown;
