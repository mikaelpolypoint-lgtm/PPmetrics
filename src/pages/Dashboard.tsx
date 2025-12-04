import React from 'react';
import { useData } from '../context/DataContext';
import PageHeader from '../components/PageHeader';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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
        <div>
            <PageHeader
                title={`${currentPI} Dashboard`}
                description="Budget vs Plan Overview"
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <div className="card" style={{ height: '400px' }}>
                    <h3 className="text-lg font-bold mb-4">Topic Budget vs Feature Plan</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                            <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)' }} />
                            <YAxis tick={{ fill: 'var(--text-secondary)' }} />
                            <Tooltip
                                contentStyle={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                                itemStyle={{ color: 'var(--text-primary)' }}
                            />
                            <Legend />
                            <Bar dataKey="Budget" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="Planned" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="card">
                    <h3 className="text-lg font-bold mb-4">Budget Details</h3>
                    <div className="table-container" style={{ maxHeight: '320px', overflowY: 'auto' }}>
                        <table>
                            <thead>
                                <tr>
                                    <th>Topic</th>
                                    <th className="text-right">Budget</th>
                                    <th className="text-right">Planned</th>
                                    <th className="text-right">Variance</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map(item => (
                                    <tr key={item.name}>
                                        <td>
                                            <div className="font-medium">{item.fullName}</div>
                                            <div className="text-xs text-secondary">{item.name}</div>
                                        </td>
                                        <td className="text-right">{item.Budget.toLocaleString()}</td>
                                        <td className="text-right">{item.Planned.toLocaleString()}</td>
                                        <td className="text-right font-medium" style={{ color: item.Variance < 0 ? 'var(--danger)' : 'var(--success)' }}>
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
