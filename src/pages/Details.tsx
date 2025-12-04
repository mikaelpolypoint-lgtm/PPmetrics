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
                    <h3 className="text-sm text-secondary uppercase font-bold mb-2">Total Stories</h3>
                    <p className="text-3xl font-bold">{filteredStories.length}</p>
                </div>
                <div className="card">
                    <h3 className="text-sm text-secondary uppercase font-bold mb-2">Total Hours Tracked</h3>
                    <p className="text-3xl font-bold">{totalHours.toFixed(1)} h</p>
                </div>
                <div className="card">
                    <h3 className="text-sm text-secondary uppercase font-bold mb-2">Total SP Delivered</h3>
                    <p className="text-3xl font-bold">{teamStats.reduce((sum, t) => sum + t.totalSP, 0)}</p>
                </div>
            </div>

            <div className="table-container card">
                <h3 className="text-lg font-bold p-6 pb-0">Team Performance</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Team</th>
                            <th>Stories</th>
                            <th>Total SP</th>
                            <th>SP Value</th>
                            <th>Implied Cost</th>
                        </tr>
                    </thead>
                    <tbody>
                        {teamStats.map(stat => (
                            <tr key={stat.id}>
                                <td className="font-medium">{stat.name}</td>
                                <td>{stat.storyCount}</td>
                                <td>{stat.totalSP}</td>
                                <td>{stat.spValue} CHF</td>
                                <td>{stat.totalCost.toLocaleString()} CHF</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Details;
