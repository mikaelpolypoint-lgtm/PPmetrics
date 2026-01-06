import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useData } from '../context/DataContext';
import PageHeader from '../components/PageHeader';
import type { Feature } from '../types';
import Papa from 'papaparse';
import { Plus, Trash2, Edit2, Upload, Download, FileJson, Filter, ArrowUp, ArrowDown, Save, X } from 'lucide-react';
import { CapacityService } from '../services/CapacityService';

type SortDirection = 'asc' | 'desc';
type SortKey = keyof Feature | 'topicPriority';

interface SortConfig {
    key: SortKey;
    direction: SortDirection;
}

const Features: React.FC = () => {
    const { features, topics, addFeature, updateFeature, deleteFeature, importFeatures, currentPI, teams, stories, everhourEntries } = useData();
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    // Combined Form Data
    const [formData, setFormData] = useState<Partial<Feature>>({});
    const [teamRates, setTeamRates] = useState<Record<string, number>>({});

    // Filter & Sort State
    const [topicFilter, setTopicFilter] = useState<string>('all');
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'topicPriority', direction: 'asc' });

    const fileInputRef = useRef<HTMLInputElement>(null);
    const jsonInputRef = useRef<HTMLInputElement>(null);

    const currentFeatures = features.filter(f => f.pi === currentPI);
    const availableTopics = topics.filter(t => t.pi === currentPI);

    // Calculate Team Rates (Upstream Logic)
    useEffect(() => {
        const calculateRates = async () => {
            try {
                const teamHours = await CapacityService.getTeamCapacityHours(currentPI);
                const rates: Record<string, number> = {};

                const currentStories = stories.filter(s => s.pi === currentPI);

                teams.forEach(team => {
                    const teamStories = currentStories.filter(s =>
                        s.team === team.name || (team.name === 'H1' && s.team === 'H1')
                    );
                    const spPlanned = teamStories.reduce((sum, s) => sum + (s.sp || 0), 0);
                    const pipPlan = spPlanned * team.spValue;
                    const hours = teamHours[team.name] || 0;

                    if (hours > 0) {
                        rates[team.name] = pipPlan / hours;
                    } else {
                        rates[team.name] = 0;
                    }
                });
                setTeamRates(rates);
            } catch (err) {
                console.error("Failed to calculate team rates", err);
            }
        };

        if (teams.length > 0) {
            calculateRates();
        }
    }, [currentPI, stories, teams]);

    const getFeatureActualCost = (featureJiraId: string) => {
        if (!featureJiraId) return 0;
        const relatedStories = stories.filter(s => s.epic === featureJiraId && s.pi === currentPI);

        let totalCost = 0;
        relatedStories.forEach(story => {
            const teamKey = Object.keys(teamRates).find(k => k === story.team || (story.team === 'H1' && k === 'H1'));
            const rate = teamKey ? teamRates[teamKey] : 0;
            if (rate > 0) {
                const entries = everhourEntries.filter(e => e.jiraKey === story.key && e.pi === currentPI);
                const hours = entries.reduce((sum, e) => sum + e.totalHours, 0);
                totalCost += (hours * rate);
            }
        });
        return totalCost;
    };

    // Processed Data (Filtered & Sorted)
    const processedFeatures = useMemo(() => {
        let result = [...currentFeatures];

        // Filter
        if (topicFilter !== 'all') {
            result = result.filter(f => f.topicKey === topicFilter);
        }

        // Sort
        result.sort((a, b) => {
            let aValue: any = a[sortConfig.key as keyof Feature];
            let bValue: any = b[sortConfig.key as keyof Feature];

            if (sortConfig.key === 'topicPriority') {
                const getPriority = (topicKey: string) => {
                    const topic = topics.find(t => t.key === topicKey && t.pi === currentPI);
                    return topic ? topic.priority : 999;
                };
                aValue = getPriority(a.topicKey);
                bValue = getPriority(b.topicKey);
            }

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return result;
    }, [currentFeatures, topicFilter, sortConfig, topics, currentPI]);

    const handleSort = (key: SortKey) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const startAdd = () => {
        setFormData({
            name: '',
            jiraId: '',
            bv: 5,
            pibBudget: 0,
            teamBudgets: {},
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
            bv: Number(formData.bv) || 0,
            pibBudget: Number(formData.pibBudget) || 0,
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
                ...(prev.teamBudgets || {}),
                [teamId]: amount
            }
        }));
    };

    // Import/Export Handlers
    const handleCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                try {
                    const parsedFeatures: Feature[] = results.data.map((row: any) => ({
                        id: row.jiraId || Math.random().toString(36).substr(2, 9),
                        name: row.name,
                        jiraId: row.jiraId,
                        bv: parseFloat(row.bv || row['Business Value']) || 0,
                        topicKey: row.topicKey,
                        pibBudget: parseFloat(row.pibBudget || row['Budget'] || 0),
                        teamBudgets: {}, // Simple import for now
                        pi: currentPI
                    }));
                    importFeatures(parsedFeatures);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                } catch (e) {
                    alert("Import failed. Check console for details.");
                    console.error(e);
                }
            }
        });
    };

    const handleJSONUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target?.result as string);
                if (Array.isArray(json)) {
                    importFeatures(json.map((f: any) => ({ ...f, pi: currentPI })));
                }
                if (jsonInputRef.current) jsonInputRef.current.value = '';
            } catch (err) {
                alert("JSON Import Error");
            }
        };
        reader.readAsText(file);
    };

    const exportCSV = () => {
        const csv = Papa.unparse(processedFeatures);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `features_export_${currentPI}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportJSON = () => {
        const json = JSON.stringify(processedFeatures, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `features_export_${currentPI}.json`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const SortIcon = ({ column }: { column: SortKey }) => {
        if (sortConfig.key !== column) return <div className="w-4 h-4" />;
        return sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
    };

    const Th = ({ column, label, align = 'left', className }: { column?: SortKey, label: string, align?: 'left' | 'right', className?: string }) => (
        <th
            className={`px-6 py-4 text-xs font-semibold uppercase tracking-wider text-text-muted select-none ${column ? 'cursor-pointer hover:bg-gray-100 transition-colors' : ''} ${className || ''}`}
            onClick={() => column && handleSort(column)}
        >
            <div className={`flex items-center gap-2 ${align === 'right' ? 'justify-end' : ''}`}>
                {label}
                {column && <SortIcon column={column} />}
            </div>
        </th>
    );

    return (
        <div>
            <PageHeader
                title={`${currentPI} Features`}
                description="Manage features and link them to topics."
                actions={
                    <div className="flex items-center gap-2">
                        <button onClick={startAdd} className="btn btn-primary flex items-center gap-2">
                            <Plus size={18} /> Add Feature
                        </button>
                        <div className="h-8 w-px bg-gray-300 mx-2" />

                        <input type="file" accept=".csv" ref={fileInputRef} onChange={handleCSVUpload} className="hidden" id="feat-csv" />
                        <label htmlFor="feat-csv" className="btn btn-secondary cursor-pointer" title="Import CSV">
                            <Upload size={18} /> CSV
                        </label>

                        <input type="file" accept=".json" ref={jsonInputRef} onChange={handleJSONUpload} className="hidden" id="feat-json" />
                        <label htmlFor="feat-json" className="btn btn-secondary cursor-pointer" title="Import JSON">
                            <FileJson size={18} /> JSON
                        </label>

                        <div className="h-8 w-px bg-gray-300 mx-2" />

                        <button onClick={exportCSV} className="btn btn-secondary" title="Export CSV">
                            <Download size={18} /> CSV
                        </button>
                        <button onClick={exportJSON} className="btn btn-secondary" title="Export JSON">
                            <Download size={18} /> JSON
                        </button>
                    </div>
                }
            />

            {/* Filter Toolbar */}
            <div className="card p-4 flex flex-wrap gap-4 items-center mb-6">
                <div className="flex items-center gap-2 text-text-muted">
                    <Filter size={18} />
                    <span className="font-medium">Filters:</span>
                </div>

                <select
                    value={topicFilter}
                    onChange={e => setTopicFilter(e.target.value)}
                    className="input py-1.5 text-sm w-40"
                >
                    <option value="all">All Topics</option>
                    {availableTopics.map(t => (
                        <option key={t.key} value={t.key}>{t.key} - {t.name}</option>
                    ))}
                </select>

                <div className="ml-auto text-sm text-text-muted">
                    Showing {processedFeatures.length} features
                </div>
            </div>

            {(isAdding || editingId) && (
                <div className="card mb-8">
                    <h3 className="text-lg font-bold text-brand-primary mb-4">{editingId ? 'Edit Feature' : 'New Feature'}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
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
                            <label className="block text-sm text-text-muted mb-1">Total PIB Budget (CHF)</label>
                            <input
                                type="number"
                                className="input"
                                value={formData.pibBudget || 0}
                                onChange={e => setFormData({ ...formData, pibBudget: Number(e.target.value) })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-text-muted mb-1">Business Value (BV)</label>
                            <input
                                type="number"
                                min="1"
                                max="10"
                                className="input"
                                value={formData.bv || 0}
                                onChange={e => setFormData({ ...formData, bv: Number(e.target.value) })}
                            />
                        </div>
                    </div>

                    <div className="border-t pt-4 mt-4">
                        <label className="block text-sm font-semibold text-text-muted mb-2">Team Split (Budget)</label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {teams.map(team => (
                                <div key={team.id} className="flex items-center gap-2">
                                    <span className="text-sm w-20">{team.name}</span>
                                    <input
                                        type="number"
                                        className="input py-1 px-2 text-sm"
                                        value={formData.teamBudgets?.[team.id] || 0}
                                        onChange={e => updateTeamBudget(team.id, Number(e.target.value))}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
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
                                <Th column="jiraId" label="Jira ID" />
                                <Th column="name" label="Name" />
                                <Th column="topicPriority" label="Topic" />
                                <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Budget PIB</th>
                                <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Planned PIP</th>
                                <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Actual</th>
                                <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Progress</th>
                                <Th column="bv" label="BV" align="right" />
                                <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {processedFeatures.map(feature => {
                                const relatedStories = stories.filter(s => s.epic === feature.jiraId && s.pi === currentPI);
                                const plannedPIP = relatedStories.reduce((sum, s) => {
                                    const team = teams.find(t => t.name === s.team || (s.team === 'H1' && t.name === 'H1'));
                                    const spValue = team ? team.spValue : 0;
                                    return sum + ((s.sp || 0) * spValue);
                                }, 0);
                                const actualCost = getFeatureActualCost(feature.jiraId);

                                const totalSP = relatedStories.reduce((sum, s) => sum + (s.sp || 0), 0);
                                const doneSP = relatedStories.filter(s => ['Done', 'Closed'].includes(s.status)).reduce((sum, s) => sum + (s.sp || 0), 0);
                                const progress = totalSP > 0 ? Math.round((doneSP / totalSP) * 100) : 0;

                                return (
                                    <tr key={feature.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 align-top"><span className="font-mono text-sm text-brand-secondary">{feature.jiraId}</span></td>
                                        <td className="px-6 py-4 font-medium text-text-main align-top">{feature.name}</td>
                                        <td className="px-6 py-4 align-top">
                                            <span className="badge badge-accent">
                                                {feature.topicKey}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-text-main align-top">{feature.pibBudget?.toLocaleString()} CHF</td>
                                        <td className="px-6 py-4 text-text-main align-top">{plannedPIP.toLocaleString()} CHF</td>
                                        <td className="px-6 py-4 text-text-main align-top font-semibold">{actualCost > 0 ? actualCost.toLocaleString('de-CH', { maximumFractionDigits: 0 }) : '-'} CHF</td>
                                        <td className="px-6 py-4 text-text-main align-top">
                                            <div className="flex items-center gap-2">
                                                <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                    <div className="h-full bg-brand-primary" style={{ width: `${progress}%` }} />
                                                </div>
                                                <span className="text-xs">{progress}%</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-text-main align-top text-right">{feature.bv}</td>
                                        <td className="px-6 py-4 text-right align-top">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => startEdit(feature)} className="p-1.5 text-text-muted hover:text-brand-accent hover:bg-gray-100 rounded transition-colors" title="Edit">
                                                    <Edit2 size={18} />
                                                </button>
                                                <button onClick={() => deleteFeature(feature.id)} className="p-1.5 text-text-muted hover:text-red-600 hover:bg-gray-100 rounded transition-colors" title="Delete">
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {processedFeatures.length === 0 && (
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
