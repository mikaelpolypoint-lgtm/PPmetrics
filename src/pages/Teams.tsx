import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import PageHeader from '../components/PageHeader';
import type { Team } from '../types';
import { Edit2, Save, X } from 'lucide-react';

const Teams: React.FC = () => {
    const { teams, updateTeam, currentPI } = useData();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Team | null>(null);

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

    const handleChange = (field: keyof Team, value: string | number) => {
        if (editForm) {
            setEditForm({ ...editForm, [field]: value });
        }
    };

    return (
        <div>
            <PageHeader
                title={`${currentPI} Teams`}
                description="Manage team budgets and values."
            />

            <div className="table-container card">
                <table>
                    <thead>
                        <tr>
                            <th>Team Name</th>
                            <th>SP Value (CHF)</th>
                            <th>PIB Budget</th>
                            <th>Hourly Rate</th>
                            <th className="w-24">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {teams.map(team => (
                            <tr key={team.id}>
                                {editingId === team.id ? (
                                    <>
                                        <td>
                                            <input
                                                value={editForm?.name}
                                                onChange={e => handleChange('name', e.target.value)}
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="number"
                                                value={editForm?.spValue}
                                                onChange={e => handleChange('spValue', Number(e.target.value))}
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="number"
                                                value={editForm?.pibBudget}
                                                onChange={e => handleChange('pibBudget', Number(e.target.value))}
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="number"
                                                value={editForm?.hourlyRate}
                                                onChange={e => handleChange('hourlyRate', Number(e.target.value))}
                                            />
                                        </td>
                                        <td>
                                            <div className="flex gap-2">
                                                <button onClick={handleSave} className="btn-icon" style={{ color: 'var(--success)' }}>
                                                    <Save size={18} />
                                                </button>
                                                <button onClick={handleCancel} className="btn-icon" style={{ color: 'var(--danger)' }}>
                                                    <X size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </>
                                ) : (
                                    <>
                                        <td className="font-medium">{team.name}</td>
                                        <td>{team.spValue} CHF</td>
                                        <td>{team.pibBudget} CHF</td>
                                        <td>{team.hourlyRate} CHF/h</td>
                                        <td>
                                            <button onClick={() => handleEdit(team)} className="btn-icon">
                                                <Edit2 size={18} />
                                            </button>
                                        </td>
                                    </>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Teams;
