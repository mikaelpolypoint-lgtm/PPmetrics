import React from 'react';
import { useData } from '../context/DataContext';
import PageHeader from '../components/PageHeader';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import clsx from 'clsx';

const Dashboard: React.FC = () => {
    const { topics, features, currentPI } = useData();

    const filteredTopics = topics.filter(t => t.pi === currentPI);
    const filteredFeatures = features.filter(f => f.pi === currentPI);

    const data = filteredTopics.map(topic => {
        const topicFeatures = filteredFeatures.filter(f => f.topicKey === topic.key);
        const plannedCost = topicFeatures.reduce((sum, f) => sum + f.pibBudget, 0);

        return {
            name: topic.key, // Use Key for x-axis to save space
            fullName: topic.name,
            Budget: topic.pibBudget,
            Planned: plannedCost,
            Variance: topic.pibBudget - plannedCost
        };
    });

    return (
        <div className="space-y-6">
            <PageHeader
                title={`${currentPI} Dashboard`}
                description="Budget vs Plan Overview"
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card h-[400px] flex flex-col">
                    <h3 className="text-lg font-bold text-brand-primary mb-6">Topic Budget vs Feature Plan</h3>
                    <div className="flex-1 min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                                <Tooltip
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

                <div className="card flex flex-col">
                    <h3 className="text-lg font-bold text-brand-primary mb-6">Budget Details</h3>
                    <div className="overflow-x-auto -mx-6 px-6">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-100 text-text-muted text-xs uppercase tracking-wider">
                                    <th className="pb-3 font-semibold">Topic</th>
                                    <th className="pb-3 font-semibold text-right">Budget</th>
                                    <th className="pb-3 font-semibold text-right">Planned</th>
                                    <th className="pb-3 font-semibold text-right">Variance</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {data.map(item => (
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
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
