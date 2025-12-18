import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import PageHeader from '../components/PageHeader';
import type { Feature } from '../types';
import { Plus, Trash2, Edit2, X, Save } from 'lucide-react';

const Features: React.FC = () => {
    const { features, topics, addFeature, updateFeature, deleteFeature, currentPI, teams, stories } = useData();
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

            {isAdding && (
                <div className="card mb-8">
                    <h3 className="text-lg font-bold text-brand-primary mb-4">New Feature</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm text-text-muted mb-1">Name</label>
                            <input
                                className="input"
                                value={formData.name || ''}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Feature Name"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-text-muted mb-1">Jira ID</label>
                            <input
                                className="input"
                                value={formData.jiraId || ''}
                                onChange={e => setFormData({ ...formData, jiraId: e.target.value })}
                                placeholder="FEAT-123"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-text-muted mb-1">Topic</label>
                            <select
                                className="input"
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
                        <button onClick={save} className="btn btn-primary">Save Feature</button>
                    </div>
                </div>
            )}

            <div className="card overflow-hidden">
                <div className="overflow-x-auto -mx-6 -my-6">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Jira ID</th>
                                <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Name</th>
                                <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Topic</th>
                                <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Budget PIB (CHF)</th>
                                <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Planned PIP (CHF)</th>
                                <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Total SP</th>
                                <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Progress</th>
                                <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider w-64">Team Split</th>
                                <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredFeatures.map(feature => {
                                const relatedStories = stories.filter(s => s.epic === feature.jiraId && s.pi === currentPI);
                                const plannedPIP = relatedStories.reduce((sum, s) => {
                                    const team = teams.find(t => t.name === s.team || (s.team === 'H1' && t.name === 'Hydrogen 1'));
                                    const spValue = team ? team.spValue : 0;
                                    return sum + ((s.sp || 0) * spValue);
                                }, 0);
                                const totalSP = relatedStories.reduce((sum, s) => sum + (s.sp || 0), 0);
                                const doneSP = relatedStories.filter(s => ['Done', 'Closed'].includes(s.status)).reduce((sum, s) => sum + (s.sp || 0), 0);
                                const progress = totalSP > 0 ? Math.round((doneSP / totalSP) * 100) : 0;

                                const isEditing = editingId === feature.id;

                                return (
                                    <tr key={feature.id} className="hover:bg-gray-50 transition-colors">
                                        {isEditing ? (
                                            <>
                                                <td className="px-4 py-3 align-top">
                                                    <input
                                                        className="input py-1.5 px-3 text-sm"
                                                        value={formData.jiraId || ''}
                                                        onChange={e => setFormData({ ...formData, jiraId: e.target.value })}
                                                        placeholder="FEAT-123"
                                                    />
                                                </td>
                                                <td className="px-4 py-3 align-top">
                                                    <textarea
                                                        className="input py-1.5 px-3 text-sm resize-none"
                                                        rows={2}
                                                        value={formData.name || ''}
                                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                        placeholder="Feature Name"
                                                    />
                                                </td>
                                                <td className="px-4 py-3 align-top">
                                                    <select
                                                        className="input py-1.5 px-3 text-sm"
                                                        value={formData.topicKey || ''}
                                                        onChange={e => setFormData({ ...formData, topicKey: e.target.value })}
                                                    >
                                                        <option value="">Select...</option>
                                                        {availableTopics.map(t => (
                                                            <option key={t.key} value={t.key}>{t.key}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="px-4 py-3 align-top">
                                                    <input
                                                        type="number"
                                                        className="input py-1.5 px-3 text-sm"
                                                        value={formData.pibBudget || 0}
                                                        onChange={e => setFormData({ ...formData, pibBudget: Number(e.target.value) })}
                                                    />
                                                </td>
                                                <td className="px-6 py-4 text-text-main align-top text-sm">{plannedPIP.toLocaleString()} CHF</td>
                                                <td className="px-6 py-4 text-text-main align-top text-sm">{totalSP}</td>
                                                <td className="px-6 py-4 text-text-main align-top text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                            <div className="h-full bg-brand-primary" style={{ width: `${progress}%` }} />
                                                        </div>
                                                        <span className="text-xs">{progress}%</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 align-top">
                                                    <div className="space-y-2">
                                                        {teams.map(team => (
                                                            <div key={team.id} className="flex items-center gap-2 text-xs">
                                                                <span className="w-16 truncate text-text-muted" title={team.name}>{team.name}</span>
                                                                <input
                                                                    type="number"
                                                                    className="input py-1 px-2 text-xs w-24"
                                                                    value={formData.teamBudgets?.[team.id] || 0}
                                                                    onChange={e => updateTeamBudget(team.id, Number(e.target.value))}
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 align-top text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button onClick={save} className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors" title="Save">
                                                            <Save size={18} />
                                                        </button>
                                                        <button onClick={closeForm} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors" title="Cancel">
                                                            <X size={18} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="px-6 py-4 align-top"><span className="font-mono text-sm text-brand-secondary">{feature.jiraId}</span></td>
                                                <td className="px-6 py-4 font-medium text-text-main align-top">{feature.name}</td>
                                                <td className="px-6 py-4 align-top">
                                                    <span className="badge badge-accent">
                                                        {feature.topicKey}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-text-main align-top">{feature.pibBudget.toLocaleString()} CHF</td>
                                                <td className="px-6 py-4 text-text-main align-top">{plannedPIP.toLocaleString()} CHF</td>
                                                <td className="px-6 py-4 text-text-main align-top">{totalSP}</td>
                                                <td className="px-6 py-4 text-text-main align-top">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                            <div className="h-full bg-brand-primary" style={{ width: `${progress}%` }} />
                                                        </div>
                                                        <span className="text-xs">{progress}%</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-text-muted align-top">
                                                    {Object.entries(feature.teamBudgets || {}).map(([tid, amount]) => {
                                                        const team = teams.find(t => t.id === tid);
                                                        return amount > 0 ? <div key={tid} className="whitespace-nowrap">{team?.name}: {amount}</div> : null;
                                                    })}
                                                </td>
                                                <td className="px-6 py-4 text-right align-top">
                                                    <div className="flex justify-end gap-2">
                                                        <button onClick={() => startEdit(feature)} className="p-1.5 text-text-muted hover:text-brand-accent hover:bg-gray-100 rounded transition-colors">
                                                            <Edit2 size={18} />
                                                        </button>
                                                        <button onClick={() => deleteFeature(feature.id)} className="p-1.5 text-text-muted hover:text-red-600 hover:bg-gray-100 rounded transition-colors">
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                );
                            })}
                            {filteredFeatures.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="text-center py-8 text-text-muted">
                                        No features found for {currentPI}.
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

export default Features;
