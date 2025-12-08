import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import PageHeader from '../components/PageHeader';
import type { Topic } from '../types';
import { Plus, Trash2, Edit2 } from 'lucide-react';

const Topics: React.FC = () => {
    const { topics, addTopic, updateTopic, deleteTopic, currentPI, teams } = useData();
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form state
    const [formData, setFormData] = useState<Partial<Topic>>({});

    const filteredTopics = topics.filter(t => t.pi === currentPI);

    const startAdd = () => {
        setFormData({
            name: '',
            key: '',
            priority: filteredTopics.length + 1,
            pibBudget: 0,
            teamBudgets: {},
            pi: currentPI
        });
        setIsAdding(true);
        setEditingId(null);
    };

    const startEdit = (topic: Topic) => {
        setFormData({ ...topic });
        setEditingId(topic.id);
        setIsAdding(false);
    };

    const save = () => {
        if (!formData.name || !formData.key) return;

        // Auto-generate ID if new
        const topicToSave = {
            ...formData,
            id: editingId || Math.random().toString(36).substr(2, 9),
            teamBudgets: formData.teamBudgets || {}
        } as Topic;

        if (editingId) {
            updateTopic(topicToSave);
        } else {
            addTopic(topicToSave);
        }

        closeForm();
    };

    const closeForm = () => {
        setIsAdding(false);
        setEditingId(null);
        setFormData({});
    };

    const updateTeamBudget = (teamId: string, amount: number) => {
        setFormData(prev => ({
            ...prev,
            teamBudgets: {
                ...prev.teamBudgets,
                [teamId]: amount
            }
        }));
    };

    return (
        <div>
            <PageHeader
                title={`${currentPI} Topics`}
                description="Manage strategic topics and allocate budgets."
                actions={
                    <button onClick={startAdd} className="btn btn-primary flex items-center gap-2">
                        <Plus size={18} /> Add Topic
                    </button>
                }
            />

            {(isAdding || editingId) && (
                <div className="card mb-8">
                    <h3 className="text-lg font-bold text-brand-primary mb-4">{isAdding ? 'New Topic' : 'Edit Topic'}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm text-text-muted mb-1">Name</label>
                            <input
                                className="input"
                                value={formData.name || ''}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Topic Name"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-text-muted mb-1">Key (3-4 chars)</label>
                            <input
                                className="input"
                                value={formData.key || ''}
                                onChange={e => setFormData({ ...formData, key: e.target.value.toUpperCase().slice(0, 4) })}
                                placeholder="KEY"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-text-muted mb-1">Priority</label>
                            <input
                                type="number"
                                className="input"
                                value={formData.priority || 0}
                                onChange={e => setFormData({ ...formData, priority: Number(e.target.value) })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-text-muted mb-1">Total PIB Budget</label>
                            <input
                                type="number"
                                className="input"
                                value={formData.pibBudget || 0}
                                onChange={e => setFormData({ ...formData, pibBudget: Number(e.target.value) })}
                            />
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm text-text-muted mb-2">Team Budget Split</label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {teams.map(team => (
                                <div key={team.id}>
                                    <label className="text-xs text-text-muted">{team.name}</label>
                                    <input
                                        type="number"
                                        className="input"
                                        value={formData.teamBudgets?.[team.id] || 0}
                                        onChange={e => updateTeamBudget(team.id, Number(e.target.value))}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3">
                        <button onClick={closeForm} className="btn btn-secondary">Cancel</button>
                        <button onClick={save} className="btn btn-primary">Save Topic</button>
                    </div>
                </div>
            )}

            <div className="card overflow-hidden">
                <div className="overflow-x-auto -mx-6 -my-6">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Priority</th>
                                <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Key</th>
                                <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Name</th>
                                <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Budget</th>
                                <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Team Split</th>
                                <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredTopics.sort((a, b) => a.priority - b.priority).map(topic => (
                                <tr key={topic.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 text-text-main">{topic.priority}</td>
                                    <td className="px-6 py-4"><span className="badge badge-accent">{topic.key}</span></td>
                                    <td className="px-6 py-4 font-medium text-text-main">{topic.name}</td>
                                    <td className="px-6 py-4 text-text-main">{topic.pibBudget.toLocaleString()} CHF</td>
                                    <td className="px-6 py-4 text-sm text-text-muted">
                                        {Object.entries(topic.teamBudgets || {}).map(([tid, amount]) => {
                                            const team = teams.find(t => t.id === tid);
                                            return amount > 0 ? <div key={tid}>{team?.name}: {amount}</div> : null;
                                        })}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => startEdit(topic)} className="p-1.5 text-text-muted hover:text-brand-accent hover:bg-gray-100 rounded transition-colors">
                                                <Edit2 size={18} />
                                            </button>
                                            <button onClick={() => deleteTopic(topic.id)} className="p-1.5 text-text-muted hover:text-red-600 hover:bg-gray-100 rounded transition-colors">
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredTopics.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="text-center py-8 text-text-muted">
                                        No topics found for {currentPI}. Create one to get started.
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

export default Topics;
