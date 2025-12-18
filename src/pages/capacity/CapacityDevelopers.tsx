import React, { useEffect, useState, useRef } from 'react';
import { useData } from '../../context/DataContext';
import { CapacityService } from '../../services/CapacityService';
import type { CapacityDeveloper } from '../../types/capacity';
import { Plus, Save, Trash2, Download, Upload, Settings } from 'lucide-react';
import Papa from 'papaparse';

const TEAMS = ['Neon', 'H1', 'Zn2C', 'Tungsten', 'UI', 'TMGT', 'Admin'];

const CapacityDevelopers: React.FC = () => {
    const { currentPI } = useData();
    const [developers, setDevelopers] = useState<CapacityDeveloper[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterTeam, setFilterTeam] = useState('All');
    const [modifiedKeys, setModifiedKeys] = useState<Set<string>>(new Set());
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [showImportMenu, setShowImportMenu] = useState(false);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalDev, setModalDev] = useState<CapacityDeveloper | null>(null);
    const [sprints, setSprints] = useState<string[]>([]);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const csvInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadData();
    }, [currentPI]);

    const loadData = async () => {
        setLoading(true);
        try {
            await CapacityService.ensureDefaults(currentPI);
            const devs = await CapacityService.getDevelopers(currentPI);
            devs.sort((a, b) => (a.team || '').localeCompare(b.team || '') || (a.name || '').localeCompare(b.name || ''));
            setDevelopers(devs);
            setModifiedKeys(new Set());
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (key: string, field: keyof CapacityDeveloper, value: any) => {
        setDevelopers(prev => prev.map(d => {
            if (d.key === key) {
                return { ...d, [field]: value };
            }
            return d;
        }));
        setModifiedKeys(prev => new Set(prev).add(key));
    };

    const handleKeyChange = (oldKey: string, newKey: string) => {
        if (!newKey || newKey.length > 3) return;
        setDevelopers(prev => prev.map(d => {
            if (d.key === oldKey) return { ...d, key: newKey };
            return d;
        }));
        setModifiedKeys(prev => {
            const next = new Set(prev);
            next.delete(oldKey);
            next.add(newKey);
            return next;
        });
    };

    const addDeveloper = () => {
        const newDev: CapacityDeveloper = {
            team: 'Neon', key: '', name: '', stack: 'Fullstack',
            dailyHours: 8, workRatio: 100, internalCost: 100, load: 90,
            manageRatio: 0, developRatio: 80, maintainRatio: 20, velocity: 1,
            pi: currentPI, specialCase: false
        };
        setDevelopers(prev => [...prev, newDev]);
    };

    const deleteDeveloper = async (key: string) => {
        if (!key) {
            setDevelopers(prev => prev.filter(d => d.key !== ''));
            return;
        }
        if (confirm(`Delete developer ${key}?`)) {
            await CapacityService.deleteDeveloper(currentPI, key);
            setDevelopers(prev => prev.filter(d => d.key !== key));
            setModifiedKeys(prev => {
                const next = new Set(prev);
                next.delete(key);
                return next;
            });
        }
    };

    const saveChanges = async () => {
        const toSave = developers.filter(d => (modifiedKeys.has(d.key) || d.key === '') && d.key && d.key.length > 0);

        if (toSave.length === 0) return;

        const promises = toSave.map(d => CapacityService.saveDeveloper(currentPI, d));

        try {
            await Promise.all(promises);
            setModifiedKeys(new Set());
            alert('Changes saved!');
        } catch (e) {
            console.error(e);
            alert('Error saving changes');
        }
    };

    const exportJSON = () => {
        const dataStr = JSON.stringify(developers, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        const link = document.createElement('a');
        link.href = dataUri;
        link.download = `developers_${currentPI}.json`;
        link.click();
    };

    const exportCSV = () => {
        const csv = Papa.unparse(developers.map(({ sprintTeams, ...rest }) => rest)); // Exclude complex obj
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `developers_${currentPI}.csv`;
        link.click();
    };

    const importJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const imported = JSON.parse(event.target?.result as string);
                if (Array.isArray(imported)) {
                    if (confirm(`Import ${imported.length} developers?`)) {
                        for (const d of imported) {
                            d.pi = currentPI;
                            await CapacityService.saveDeveloper(currentPI, d);
                        }
                        loadData();
                    }
                }
            } catch (err) { alert('Import failed'); }
        };
        reader.readAsText(file);
    };

    const importCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                if (confirm(`Import ${results.data.length} items?`)) {
                    for (const d of results.data as any[]) {
                        if (!d.key) continue;
                        d.pi = currentPI;
                        d.dailyHours = Number(d.dailyHours);
                        d.workRatio = Number(d.workRatio);
                        await CapacityService.saveDeveloper(currentPI, d);
                    }
                    loadData();
                }
            }
        });
    };

    const openSprintModal = async (dev: CapacityDeveloper) => {
        const avails = await CapacityService.getAvailabilities(currentPI);
        const uniqueSprints = Array.from(new Set(avails.map(a => a.sprint).filter(Boolean))).sort();
        setSprints(uniqueSprints);
        setModalDev({ ...dev, sprintTeams: dev.sprintTeams || {} });
        setIsModalOpen(true);
    };

    const saveSprintTeams = () => {
        if (!modalDev) return;
        handleInputChange(modalDev.key, 'sprintTeams', modalDev.sprintTeams);
        setIsModalOpen(false);
    };

    const getCalculated = (dev: CapacityDeveloper) => {
        const dailyHours = Number(dev.dailyHours) || 8;
        const load = Number(dev.load) || 90;
        const developRatio = Number(dev.developRatio) || 0;
        const maintainRatio = Number(dev.maintainRatio) || 0;
        const manageRatio = Number(dev.manageRatio) || 0;
        const velocity = Number(dev.velocity) || 0;

        const devH = (dailyHours * (load / 100) * (developRatio / 100));
        const maintainH = (dailyHours * (load / 100) * (maintainRatio / 100));
        const manageH = (dailyHours * (load / 100) * (manageRatio / 100));
        const dailySP = (devH / 8) * velocity;
        return { devH, maintainH, manageH, dailySP };
    };

    const filteredDevs = filterTeam === 'All' ? developers : developers.filter(d => d.team === filterTeam);

    if (loading) return <div className="p-8 text-center text-text-muted">Loading Developers...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 bg-bg-surface p-4 rounded-xl border border-border shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-text-muted uppercase">Filter Team</label>
                        <select
                            value={filterTeam}
                            onChange={e => setFilterTeam(e.target.value)}
                            className="bg-bg-main border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-accent focus:outline-none"
                        >
                            <option value="All">All</option>
                            {Array.from(new Set(developers.map(d => d.team).filter(Boolean))).map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="relative">
                        <button onClick={() => setShowExportMenu(!showExportMenu)} className="btn btn-secondary flex items-center gap-2 px-3 py-2 border rounded hover:bg-gray-50">
                            <Download size={16} /> Export
                        </button>
                        {showExportMenu && (
                            <div className="absolute right-0 top-full mt-1 bg-white border shadow rounded z-10 w-32 py-1">
                                <button onClick={exportJSON} className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-sm">JSON</button>
                                <button onClick={exportCSV} className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-sm">CSV</button>
                            </div>
                        )}
                    </div>

                    <div className="relative">
                        <button onClick={() => setShowImportMenu(!showImportMenu)} className="btn btn-secondary flex items-center gap-2 px-3 py-2 border rounded hover:bg-gray-50">
                            <Upload size={16} /> Import
                        </button>
                        {showImportMenu && (
                            <div className="absolute right-0 top-full mt-1 bg-white border shadow rounded z-10 w-32 py-1">
                                <button onClick={() => fileInputRef.current?.click()} className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-sm">JSON</button>
                                <button onClick={() => csvInputRef.current?.click()} className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-sm">CSV</button>
                            </div>
                        )}
                        <input type="file" ref={fileInputRef} onChange={importJSON} accept=".json" className="hidden" />
                        <input type="file" ref={csvInputRef} onChange={importCSV} accept=".csv" className="hidden" />
                    </div>

                    <button onClick={addDeveloper} className="btn-primary flex items-center gap-2 px-3 py-2 bg-brand-primary text-white rounded hover:bg-brand-primary/90">
                        <Plus size={16} /> Add Developer
                    </button>

                    {modifiedKeys.size > 0 && (
                        <button onClick={saveChanges} className="btn-success flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                            <Save size={16} /> Save Changes
                        </button>
                    )}
                </div>
            </div>

            <div className="bg-bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-border">
                            <tr>
                                <th className="px-4 py-3 text-left">Action</th>
                                <th className="px-4 py-3 text-left">Team</th>
                                <th className="px-4 py-3 text-left">Key</th>
                                <th className="px-4 py-3 text-left">Spec.</th>
                                <th className="px-4 py-3 text-left">Hrs/Day</th>
                                <th className="px-4 py-3 text-left">Work %</th>
                                <th className="px-4 py-3 text-left">Cost</th>
                                <th className="px-4 py-3 text-left">Load %</th>
                                <th className="px-4 py-3 text-left">Mng %</th>
                                <th className="px-4 py-3 text-left">Dev %</th>
                                <th className="px-4 py-3 text-left">Mnt %</th>
                                <th className="px-4 py-3 text-left">Vel.</th>
                                <th className="px-4 py-3 text-left text-gray-500">Dev H</th>
                                <th className="px-4 py-3 text-left text-gray-500">Mnt H</th>
                                <th className="px-4 py-3 text-left text-gray-500">Mng H</th>
                                <th className="px-4 py-3 text-left text-gray-500">SP/Day</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredDevs.map((dev, idx) => {
                                const calc = getCalculated(dev);
                                const isModified = modifiedKeys.has(dev.key);
                                return (
                                    <tr key={dev.key || idx} className={`hover:bg-gray-50 ${isModified ? 'bg-yellow-50' : ''}`}>
                                        <td className="px-4 py-2 flex gap-1">
                                            <button onClick={() => deleteDeveloper(dev.key)} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                                            <button onClick={() => openSprintModal(dev)} className="p-1 text-blue-500 hover:bg-blue-50 rounded"><Settings size={16} /></button>
                                        </td>
                                        <td className="px-4 py-2">
                                            <select
                                                value={dev.team}
                                                onChange={e => handleInputChange(dev.key, 'team', e.target.value)}
                                                className="bg-transparent border-none focus:ring-1 p-1 w-24"
                                            >
                                                {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
                                            </select>
                                        </td>
                                        <td className="px-4 py-2">
                                            <input
                                                value={dev.key}
                                                maxLength={3}
                                                onChange={e => handleKeyChange(dev.key, e.target.value)}
                                                className="bg-transparent w-12 border border-gray-200 rounded px-1 py-0.5"
                                            />
                                        </td>
                                        <td className="px-4 py-2 text-center">
                                            <input type="checkbox" checked={dev.specialCase || false} onChange={e => handleInputChange(dev.key, 'specialCase', e.target.checked)} />
                                        </td>
                                        <td className="px-4 py-2"><input type="number" value={dev.dailyHours} onChange={e => handleInputChange(dev.key, 'dailyHours', Number(e.target.value))} className="w-12 bg-transparent border-b border-gray-200 focus:border-blue-500 outline-none" /></td>
                                        <td className="px-4 py-2"><input type="number" value={dev.workRatio} onChange={e => handleInputChange(dev.key, 'workRatio', Number(e.target.value))} className="w-12 bg-transparent border-b border-gray-200 focus:border-blue-500 outline-none" /></td>
                                        <td className="px-4 py-2"><input type="number" value={dev.internalCost} onChange={e => handleInputChange(dev.key, 'internalCost', Number(e.target.value))} className="w-12 bg-transparent border-b border-gray-200 focus:border-blue-500 outline-none" /></td>
                                        <td className="px-4 py-2"><input type="number" value={dev.load} onChange={e => handleInputChange(dev.key, 'load', Number(e.target.value))} className="w-12 bg-transparent border-b border-gray-200 focus:border-blue-500 outline-none" /></td>
                                        <td className="px-4 py-2"><input type="number" value={dev.manageRatio} onChange={e => handleInputChange(dev.key, 'manageRatio', Number(e.target.value))} className="w-12 bg-transparent border-b border-gray-200 focus:border-blue-500 outline-none" /></td>
                                        <td className="px-4 py-2"><input type="number" value={dev.developRatio} onChange={e => handleInputChange(dev.key, 'developRatio', Number(e.target.value))} className="w-12 bg-transparent border-b border-gray-200 focus:border-blue-500 outline-none" /></td>
                                        <td className="px-4 py-2"><input type="number" value={dev.maintainRatio} onChange={e => handleInputChange(dev.key, 'maintainRatio', Number(e.target.value))} className="w-12 bg-transparent border-b border-gray-200 focus:border-blue-500 outline-none" /></td>
                                        <td className="px-4 py-2"><input type="number" value={dev.velocity} step="0.1" onChange={e => handleInputChange(dev.key, 'velocity', Number(e.target.value))} className="w-12 bg-transparent border-b border-gray-200 focus:border-blue-500 outline-none" /></td>

                                        <td className="px-4 py-2 text-gray-500">{calc.devH.toFixed(2)}</td>
                                        <td className="px-4 py-2 text-gray-500">{calc.maintainH.toFixed(2)}</td>
                                        <td className="px-4 py-2 text-gray-500">{calc.manageH.toFixed(2)}</td>
                                        <td className="px-4 py-2 text-gray-500">{calc.dailySP.toFixed(2)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && modalDev && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-[500px] max-w-[90%] flex flex-col gap-4 shadow-xl">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-bold">Manage Sprint Teams: {modalDev.key}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-black">&times;</button>
                        </div>
                        <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto">
                            {sprints.map(s => (
                                <div key={s} className="flex items-center justify-between">
                                    <span className="font-medium">{s}</span>
                                    <select
                                        value={modalDev.sprintTeams?.[s] || modalDev.team}
                                        onChange={e => setModalDev({
                                            ...modalDev,
                                            sprintTeams: { ...modalDev.sprintTeams, [s]: e.target.value }
                                        })}
                                        className="border rounded px-2 py-1 text-sm bg-white"
                                    >
                                        <option value={modalDev.team}>Default ({modalDev.team})</option>
                                        {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-end gap-2 pt-4 border-t">
                            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
                            <button onClick={saveSprintTeams} className="px-4 py-2 text-sm bg-brand-primary text-white rounded hover:bg-brand-primary/90">Save</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CapacityDevelopers;
