import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import PageHeader from '../components/PageHeader';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import clsx from 'clsx';

const Dashboard: React.FC = () => {
    const { topics, features, stories, teams, currentPI } = useData();
    const [teamFilter, setTeamFilter] = useState<string>('all');
    const [topicFilter, setTopicFilter] = useState<string>('all');

    // Filter relevant data for Current PI
    const piTopics = topics.filter(t => t.pi === currentPI);
    const piFeatures = features.filter(f => f.pi === currentPI);
    const piStories = stories.filter(s => s.pi === currentPI);

    // Calculate Data based on filters
    // We map over topics first, but we might need to filter topics if topicFilter is set.
    // If teamFilter is set, we only count costs related to that team.

    let displayedTopics = piTopics;
    if (topicFilter !== 'all') {
        displayedTopics = displayedTopics.filter(t => t.key === topicFilter);
    }

    const data = displayedTopics.map(topic => {
        // Find features belonging to this topic
        const topicFeatures = piFeatures.filter(f => f.topicKey === topic.key);

        let plannedCost = 0;
        let topicBudget = topic.pibBudget;

        // If team filter is active, we can't easily filter the "Budget" part because budget is usually per topic, not per team (unless we use teamBudgets map).
        // Let's check if topic has teamBudgets.
        if (teamFilter !== 'all') {
            const team = teams.find(t => t.name === teamFilter);
            if (team && topic.teamBudgets && topic.teamBudgets[team.id]) {
                topicBudget = topic.teamBudgets[team.id] || 0;
            } else if (team) {
                // Fallback or 0 if no specific team budget? 
                // If filtering by team, and no specific budget allocation is known, maybe show 0 or full?
                // Typically simpler to specific budget. Let's assume 0 if not specified for that team.
                topicBudget = 0;
            }
        }

        // Loop through features to sum up story costs
        topicFeatures.forEach(feature => {
            // Find stories for this feature (epic)
            let featureStories = piStories.filter(s => s.epic === feature.jiraId);

            // Filter stories by team if needed
            if (teamFilter !== 'all') {
                featureStories = featureStories.filter(s => s.team === teamFilter || (teamFilter === 'H1' && s.team === 'H1'));
            }

            // Sum up value of these stories
            const featureCost = featureStories.reduce((sum, story) => {
                const teamObj = teams.find(t => t.name === story.team || (story.team === 'H1' && t.name === 'H1'));
                const spValue = teamObj ? teamObj.spValue : 0;
                return sum + ((story.sp || 0) * spValue);
            }, 0);

            plannedCost += featureCost;
        });

        return {
            name: topic.key, // Use Key for x-axis to save space
            fullName: topic.name,
            Budget: topicBudget,
            Planned: plannedCost,
            Variance: topicBudget - plannedCost
        };
    });

    // Filter out entries with 0 budget AND 0 planned if filtering (optional, but cleaner)
    const activeData = data.filter(d => d.Budget !== 0 || d.Planned !== 0);

    const totalBudget = activeData.reduce((sum, item) => sum + item.Budget, 0);
    const totalPlanned = activeData.reduce((sum, item) => sum + item.Planned, 0);
    const totalVariance = totalBudget - totalPlanned;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <PageHeader
                title={`${currentPI} Dashboard`}
                description="Budget vs Plan Overview"
                actions={
                    <div className="flex gap-4">
                        <select
                            value={topicFilter}
                            onChange={(e) => setTopicFilter(e.target.value)}
                            className="input text-sm py-1.5 min-w-[150px]"
                        >
                            <option value="all">All Topics</option>
                            {piTopics.map(t => (
                                <option key={t.id} value={t.key}>{t.name}</option>
                            ))}
                        </select>
                        <select
                            value={teamFilter}
                            onChange={(e) => setTeamFilter(e.target.value)}
                            className="input text-sm py-1.5 min-w-[150px]"
                        >
                            <option value="all">All Teams</option>
                            {teams.map(t => (
                                <option key={t.id} value={t.name}>{t.name}</option>
                            ))}
                        </select>
                    </div>
                }
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card h-[500px] flex flex-col">
                    <h3 className="text-lg font-bold text-brand-primary mb-6">Topic Budget vs Feature Plan</h3>
                    <div className="flex-1 min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={activeData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                                <Tooltip
                                    formatter={(value: number) => value.toLocaleString('de-CH')}
                                    contentStyle={{
                                        backgroundColor: '#ffffff',
                                        borderColor: '#e2e8f0',
                                        color: '#1e293b',
                                        borderRadius: '8px',
                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                                    }}
                                    itemStyle={{ color: '#1e293b' }}
                                    cursor={{ fill: '#f1f5f9', opacity: 0.5 }}
                                />
                                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                <Bar dataKey="Budget" fill="#003A59" radius={[4, 4, 0, 0]} maxBarSize={50} />
                                <Bar dataKey="Planned" fill="#078091" radius={[4, 4, 0, 0]} maxBarSize={50} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="card flex flex-col h-[500px]">
                    <h3 className="text-lg font-bold text-brand-primary mb-6">Budget Details</h3>
                    <div className="overflow-x-auto -mx-6 px-6 flex-1">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-100 text-text-muted text-xs uppercase tracking-wider sticky top-0 bg-white">
                                    <th className="pb-3 font-semibold">Topic</th>
                                    <th className="pb-3 font-semibold text-right">Budget</th>
                                    <th className="pb-3 font-semibold text-right">Planned</th>
                                    <th className="pb-3 font-semibold text-right">Variance</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {activeData.map(item => (
                                    <tr key={item.name} className="group hover:bg-gray-50 transition-colors">
                                        <td className="py-3">
                                            <div className="font-medium text-text-main">{item.fullName}</div>
                                            <div className="text-xs text-text-muted">{item.name}</div>
                                        </td>
                                        <td className="py-3 text-right text-text-main font-mono">{item.Budget.toLocaleString()}</td>
                                        <td className="py-3 text-right text-text-main font-mono">{item.Planned.toLocaleString()}</td>
                                        <td className={clsx("py-3 text-right font-mono font-medium", item.Variance < 0 ? 'text-red-600' : 'text-green-600')}>
                                            {item.Variance.toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="border-t-2 border-gray-200 bg-gray-50 footer-sticky bottom-0">
                                <tr className="font-bold">
                                    <td className="py-4 pl-2 text-brand-primary">Total</td>
                                    <td className="py-4 text-right text-brand-primary font-mono">{totalBudget.toLocaleString()}</td>
                                    <td className="py-4 text-right text-brand-primary font-mono">{totalPlanned.toLocaleString()}</td>
                                    <td className={clsx("py-4 text-right font-mono", totalVariance < 0 ? 'text-red-600' : 'text-green-600')}>
                                        {totalVariance.toLocaleString()}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
