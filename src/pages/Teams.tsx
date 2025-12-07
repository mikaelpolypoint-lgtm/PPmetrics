import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import PageHeader from '../components/PageHeader';
import type { Team } from '../types';
import { Edit2, Save, X, Trash2, Plus } from 'lucide-react';

const Teams: React.FC = () => {
    const { teams, updateTeam, addTeam, deleteTeam, currentPI } = useData();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Team | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [addForm, setAddForm] = useState<Partial<Team>>({
        name: '',
        spValue: 0,
        pibBudget: 0,
        hourlyRate: 0
    });

    const handleEdit = (team: Team) => {
        setEditingId(team.id);
        setEditForm({ ...team });
    };

    const handleSave = () => {
        if (editForm) {
            updateTeam(editForm);
            setEditingId(null);
            setEditForm(null);
        }
    };

    const handleCancel = () => {
        setEditingId(null);
        setEditForm(null);
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Are you sure you want to delete this team?')) {
            deleteTeam(id);
        }
    };

    const handleChange = (field: keyof Team, value: string | number) => {
        if (editForm) {
            setEditForm({ ...editForm, [field]: value });
        }
    };

    const handleAddChange = (field: keyof Team, value: string | number) => {
        setAddForm({ ...addForm, [field]: value });
    };

    const handleAddSubmit = () => {
        if (addForm.name) {
            const newTeam: Team = {
                id: `team-${Date.now()}`,
                name: addForm.name,
                spValue: addForm.spValue || 0,
                pibBudget: addForm.pibBudget || 0,
                hourlyRate: addForm.hourlyRate || 0
            };
            addTeam(newTeam);
            setIsAdding(false);
            setAddForm({ name: '', spValue: 0, pibBudget: 0, hourlyRate: 0 });
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title={`${currentPI} Teams`}
                description="Manage team budgets and values."
                actions={
                    <button
                        onClick={() => setIsAdding(!isAdding)}
                        className="btn btn-primary"
                    >
                        <Plus size={18} /> Add Team
                    </button>
                }
            />

            {isAdding && (
                <div className="card mb-6 border-pp-mint-500/30">
                    <h3 className="text-lg font-bold text-slate-100 mb-4">Add New Team</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Team Name</label>
                            <input
                                className="input"
                                placeholder="Team Name"
                                value={addForm.name}
                                onChange={e => handleAddChange('name', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">SP Value (CHF)</label>
                            <input
                                type="number"
                                className="input"
                                placeholder="0"
                                value={addForm.spValue}
                                onChange={e => handleAddChange('spValue', Number(e.target.value))}
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">PIB Budget</label>
                            <input
                                type="number"
                                className="input"
                                placeholder="0"
                                value={addForm.pibBudget}
                                onChange={e => handleAddChange('pibBudget', Number(e.target.value))}
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Hourly Rate</label>
                            <input
                                type="number"
                                className="input"
                                placeholder="0"
                                value={addForm.hourlyRate}
                                onChange={e => handleAddChange('hourlyRate', Number(e.target.value))}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <button onClick={() => setIsAdding(false)} className="btn btn-secondary">Cancel</button>
                        <button onClick={handleAddSubmit} className="btn btn-primary">Save Team</button>
                    </div>
                </div>
            )}

            <div className="card overflow-hidden">
                <div className="overflow-x-auto -mx-6 -my-6">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-900/50 border-b border-white/10">
                            <tr>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Team Name</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">SP Value (CHF)</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">PIB Budget</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Hourly Rate</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider w-32 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {teams.map(team => (
                                <tr key={team.id} className="group hover:bg-white/5 transition-colors">
                                    {editingId === team.id ? (
                                        <>
                                            <td className="px-6 py-3">
                                                <input
                                                    className="input py-1 px-2 text-sm"
                                                    value={editForm?.name}
                                                    onChange={e => handleChange('name', e.target.value)}
                                                />
                                            </td>
                                            <td className="px-6 py-3">
                                                <input
                                                    type="number"
                                                    className="input py-1 px-2 text-sm"
                                                    value={editForm?.spValue}
                                                    onChange={e => handleChange('spValue', Number(e.target.value))}
                                                />
                                            </td>
                                            <td className="px-6 py-3">
                                                <input
                                                    type="number"
                                                    className="input py-1 px-2 text-sm"
                                                    value={editForm?.pibBudget}
                                                    onChange={e => handleChange('pibBudget', Number(e.target.value))}
                                                />
                                            </td>
                                            <td className="px-6 py-3">
                                                <input
                                                    type="number"
                                                    className="input py-1 px-2 text-sm"
                                                    value={editForm?.hourlyRate}
                                                    onChange={e => handleChange('hourlyRate', Number(e.target.value))}
                                                />
                                            </td>
                                            <td className="px-6 py-3 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={handleSave} className="p-1.5 text-pp-green-default hover:bg-pp-green-default/10 rounded transition-colors">
                                                        <Save size={18} />
                                                    </button>
                                                    <button onClick={handleCancel} className="p-1.5 text-pp-red-700 hover:bg-pp-red-700/10 rounded transition-colors">
                                                        <X size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td className="px-6 py-4 font-medium text-slate-200">{team.name}</td>
                                            <td className="px-6 py-4 text-slate-300">{team.spValue} CHF</td>
                                            <td className="px-6 py-4 text-slate-300">{team.pibBudget} CHF</td>
                                            <td className="px-6 py-4 text-slate-300">{team.hourlyRate} CHF/h</td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => handleEdit(team)} className="p-1.5 text-slate-400 hover:text-pp-mint-500 hover:bg-white/5 rounded transition-colors">
                                                        <Edit2 size={18} />
                                                    </button>
                                                    <button onClick={() => handleDelete(team.id)} className="p-1.5 text-slate-400 hover:text-pp-red-700 hover:bg-white/5 rounded transition-colors">
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Teams;
