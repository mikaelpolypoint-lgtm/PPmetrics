import React from 'react';
import { useData } from '../context/DataContext';
import PageHeader from '../components/PageHeader';

const Details: React.FC = () => {
    const { teams, stories, everhourEntries, currentPI } = useData();

    const filteredStories = stories.filter(s => s.pi === currentPI);
    const filteredEverhour = everhourEntries.filter(e => e.pi === currentPI);

    // Calculate totals per team
    const teamStats = teams.map(team => {
        const teamStories = filteredStories.filter(s => s.team === team.name || s.team === team.id);
        const totalSP = teamStories.reduce((sum, s) => sum + s.sp, 0);
        const totalCost = totalSP * team.spValue;

        return {
            ...team,
            totalSP,
            totalCost,
            storyCount: teamStories.length
        };
    });

    const totalHours = filteredEverhour.reduce((sum, e) => sum + e.totalHours, 0);

    return (
        <div>
            <PageHeader
                title={`${currentPI} Details`}
                description="Detailed metrics and calculations."
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="card">
                    <h3 className="text-sm text-text-muted uppercase font-bold mb-2">Total Stories</h3>
                    <p className="text-3xl font-bold text-brand-primary">{filteredStories.length}</p>
                </div>
                <div className="card">
                    <h3 className="text-sm text-text-muted uppercase font-bold mb-2">Total Hours Tracked</h3>
                    <p className="text-3xl font-bold text-brand-primary">{totalHours.toFixed(1)} h</p>
                </div>
                <div className="card">
                    <h3 className="text-sm text-text-muted uppercase font-bold mb-2">Total SP Delivered</h3>
                    <p className="text-3xl font-bold text-brand-primary">{teamStats.reduce((sum, t) => sum + t.totalSP, 0)}</p>
                </div>
            </div>

            <div className="card overflow-hidden">
                <div className="p-6 pb-0">
                    <h3 className="text-lg font-bold text-brand-primary">Team Performance</h3>
                </div>
                <div className="overflow-x-auto p-6">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Team</th>
                                <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Stories</th>
                                <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Total SP</th>
                                <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">SP Value</th>
                                <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Implied Cost</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {teamStats.map(stat => (
                                <tr key={stat.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-text-main">{stat.name}</td>
                                    <td className="px-6 py-4 text-text-main">{stat.storyCount}</td>
                                    <td className="px-6 py-4 text-text-main">{stat.totalSP}</td>
                                    <td className="px-6 py-4 text-text-main">{stat.spValue} CHF</td>
                                    <td className="px-6 py-4 text-text-main">{stat.totalCost.toLocaleString()} CHF</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Details;
