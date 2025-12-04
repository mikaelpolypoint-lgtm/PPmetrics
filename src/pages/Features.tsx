import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import PageHeader from '../components/PageHeader';
import type { Feature } from '../types';
import { Plus, Trash2, Edit2 } from 'lucide-react';

const Features: React.FC = () => {
    const { features, topics, addFeature, updateFeature, deleteFeature, currentPI, teams } = useData();
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<Feature>>({});

    const filteredFeatures = features.filter(f => f.pi === currentPI);
    const availableTopics = topics.filter(t => t.pi === currentPI);

    const startAdd = () => {
        setFormData({
            name: '',
            jiraId: '',
            pibBudget: 0,
            teamBudgets: {},
            epicOwner: '',
            topicKey: availableTopics[0]?.key || '',
            pi: currentPI
        });
        setIsAdding(true);
        setEditingId(null);
    };

    const startEdit = (feature: Feature) => {
        setFormData({ ...feature });
        setEditingId(feature.id);
        setIsAdding(false);
    };

    const save = () => {
        if (!formData.name || !formData.jiraId) return;

        const featureToSave = {
            ...formData,
            id: editingId || Math.random().toString(36).substr(2, 9),
            teamBudgets: formData.teamBudgets || {}
        } as Feature;

        if (editingId) {
            updateFeature(featureToSave);
        } else {
            addFeature(featureToSave);
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
                title={`${currentPI} Features`}
                description="Manage features and link them to topics."
                actions={
                    <button onClick={startAdd} className="btn btn-primary flex items-center gap-2">
                        <Plus size={18} /> Add Feature
                    </button>
                }
            />

            {(isAdding || editingId) && (
                <div className="card mb-8">
                    <h3 className="text-lg font-bold mb-4">{isAdding ? 'New Feature' : 'Edit Feature'}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm text-secondary mb-1">Name</label>
                            <input
                                value={formData.name || ''}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Feature Name"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-secondary mb-1">Jira ID</label>
                            <input
                                value={formData.jiraId || ''}
                                onChange={e => setFormData({ ...formData, jiraId: e.target.value })}
                                placeholder="FEAT-123"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-secondary mb-1">Topic</label>
                            <select
                                value={formData.topicKey || ''}
                                onChange={e => setFormData({ ...formData, topicKey: e.target.value })}
                            >
                                <option value="">Select Topic...</option>
                                {availableTopics.map(t => (
                                    <option key={t.key} value={t.key}>{t.key} - {t.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm text-secondary mb-1">Epic Owner</label>
                            <input
                                value={formData.epicOwner || ''}
                                onChange={e => setFormData({ ...formData, epicOwner: e.target.value })}
                                placeholder="Owner Name"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-secondary mb-1">Total PIB Budget</label>
                            <input
                                type="number"
                                value={formData.pibBudget || 0}
                                onChange={e => setFormData({ ...formData, pibBudget: Number(e.target.value) })}
                            />
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm text-secondary mb-2">Team Budget Split</label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {teams.map(team => (
                                <div key={team.id}>
                                    <label className="text-xs text-secondary">{team.name}</label>
                                    <input
                                        type="number"
                                        value={formData.teamBudgets?.[team.id] || 0}
                                        onChange={e => updateTeamBudget(team.id, Number(e.target.value))}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3">
                        <button onClick={closeForm} className="btn btn-secondary">Cancel</button>
                        <button onClick={save} className="btn btn-primary">Save Feature</button>
                    </div>
                </div>
            )}

            <div className="table-container card">
                <table>
                    <thead>
                        <tr>
                            <th>Jira ID</th>
                            <th>Name</th>
                            <th>Topic</th>
                            <th>Owner</th>
                            <th>Budget</th>
                            <th>Team Split</th>
                            <th className="text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredFeatures.map(feature => (
                            <tr key={feature.id}>
                                <td><span className="font-mono text-sm">{feature.jiraId}</span></td>
                                <td className="font-medium">{feature.name}</td>
                                <td>
                                    <span className="badge badge-accent">
                                        {feature.topicKey}
                                    </span>
                                </td>
                                <td>{feature.epicOwner}</td>
                                <td>{feature.pibBudget.toLocaleString()} CHF</td>
                                <td className="text-sm text-secondary">
                                    {Object.entries(feature.teamBudgets || {}).map(([tid, amount]) => {
                                        const team = teams.find(t => t.id === tid);
                                        return amount > 0 ? <div key={tid}>{team?.name}: {amount}</div> : null;
                                    })}
                                </td>
                                <td className="text-right">
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => startEdit(feature)} className="btn-icon">
                                            <Edit2 size={18} />
                                        </button>
                                        <button onClick={() => deleteFeature(feature.id)} className="btn-icon" style={{ color: 'var(--danger)' }}>
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredFeatures.length === 0 && (
                            <tr>
                                <td colSpan={7} className="text-center py-8 text-secondary">
                                    No features found for {currentPI}.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Features;
