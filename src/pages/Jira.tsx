import React, { useState, useRef, useMemo } from 'react';
import { useData } from '../context/DataContext';
import PageHeader from '../components/PageHeader';
import type { Story, Feature } from '../types';
import Papa from 'papaparse';
import { Upload, FileText, AlertCircle, Plus, Edit2, Trash2, X, Save, Download, Filter, ArrowUp, ArrowDown, FileJson } from 'lucide-react';
import clsx from 'clsx';

type SortDirection = 'asc' | 'desc';
type SortKey = keyof Story | 'statusColor' | 'since';

interface SortConfig {
    key: SortKey;
    direction: SortDirection;
}

const Jira: React.FC = () => {
    const { stories, importStories, importFeatures, currentPI, addStory, updateStory, deleteStory } = useData();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const jsonInputRef = useRef<HTMLInputElement>(null);
    const [error, setError] = useState<string | null>(null);

    // Filter State
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [featureFilter, setFeatureFilter] = useState<string>('all');
    const [teamFilter, setTeamFilter] = useState<string>('all');

    // Sort State
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'statusColor', direction: 'asc' });

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<Partial<Story>>({});

    // Derived Data
    const currentStories = stories.filter(s => s.pi === currentPI);
    const uniqueFeatures = Array.from(new Set(currentStories.map(s => s.epic).filter(Boolean)));
    const uniqueTeams = Array.from(new Set(currentStories.map(s => s.team).filter(Boolean)));

    // Helper: Status Normalization
    const normalizeStatus = (status: string) => {
        const s = status.toLowerCase();
        if (s === 'done') return 'Done';
        if (['in testing', 'ready for testing', 'ready design review'].includes(s)) return 'Testing';
        if (s === 'ready for code review') return 'Code Review';
        if (s === 'in development') return 'Started';
        if (s === 'blocked') return 'Blocked';
        return 'Open';
    };

    // Helper: Status Categories & Colors
    const getStatusCategory = (status: string) => {
        const s = status.toLowerCase();
        if (s === 'done') return 'done';
        if (s === 'testing') return 'testing';
        if (s === 'code review') return 'review';
        if (s === 'started') return 'dev';
        if (s === 'blocked') return 'blocked';
        return 'open';
    };

    const getStatusColor = (status: string) => {
        const category = getStatusCategory(status);
        switch (category) {
            case 'done': return 'bg-green-700 text-white border-green-800';
            case 'testing': return 'bg-green-100 text-green-800 border-green-200';
            case 'review': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'dev': return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'blocked': return 'bg-red-900 text-white border-red-950';
            default: return 'bg-red-100 text-red-800 border-red-200';
        }
    };

    const getStatusRank = (status: string) => {
        const category = getStatusCategory(status);
        switch (category) {
            case 'done': return 1;
            case 'testing': return 2;
            case 'review': return 3;
            case 'dev': return 4;
            case 'open': return 5;
            case 'blocked': return 6;
            default: return 7;
        }
    };

    // Filtering & Sorting
    const processedStories = useMemo(() => {
        let result = [...currentStories];

        // Filter
        if (statusFilter !== 'all') {
            result = result.filter(s => getStatusCategory(s.status) === statusFilter);
        }
        if (featureFilter !== 'all') {
            result = result.filter(s => s.epic === featureFilter);
        }
        if (teamFilter !== 'all') {
            result = result.filter(s => s.team === teamFilter);
        }

        // Sort
        result.sort((a, b) => {
            let aValue: any = a[sortConfig.key as keyof Story];
            let bValue: any = b[sortConfig.key as keyof Story];

            if (sortConfig.key === 'statusColor') {
                aValue = getStatusRank(a.status);
                bValue = getStatusRank(b.status);
            } else if (sortConfig.key === 'since') {
                // Parse "dd.mm.yy" to comparable value
                const parseDate = (d?: string) => {
                    if (!d) return 0;
                    const parts = d.split('.');
                    if (parts.length !== 3) return 0;
                    // "25" -> 2025
                    return new Date(`20${parts[2]}-${parts[1]}-${parts[0]}`).getTime();
                };
                aValue = parseDate(a.since);
                bValue = parseDate(b.since);
            }

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return result;
    }, [currentStories, statusFilter, featureFilter, teamFilter, sortConfig]);

    const handleSort = (key: SortKey) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const handleCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                try {
                    const parsedStories: Story[] = results.data.map((row: any) => {
                        const findVal = (keys: string[]) => {
                            for (const k of keys) {
                                const foundKey = Object.keys(row).find(rk => rk.toLowerCase() === k.toLowerCase());
                                if (foundKey) return row[foundKey];
                            }
                            return '';
                        };

                        const summary = findVal(['Summary', 'Name']) || '';
                        const key = findVal(['Key', 'Issue key', 'ID']) || '';
                        const status = normalizeStatus(findVal(['Status']) || '');
                        const sp = parseFloat(findVal(['Custom field (Story Points)', 'Story Points', 'SP'])) || 0;
                        let team = findVal(['Custom field (pdev_unit)', 'pdev_unit', 'Team']) || '';

                        if (team === 'Hydrogen 1') team = 'H1';
                        let sprint = findVal(['Custom field (CurrentSprint)', 'current Sprint', 'Sprint']) || '';

                        // Normalize Sprint: Remove team prefixes (case insensitive, handles whitespace)
                        sprint = sprint.trim().replace(/^(H1-|Tungsten-|Zn2C-|Neon-)/i, '');

                        const epic = findVal(['Parent key', 'Parent', 'Epic Link', 'Custom field (Epic Link)']) || '';
                        const epicSummary = findVal(['Parent summary', 'Parent Summary']) || epic;

                        // Parse "Status Category Changed" -> "dd.mm.yy"
                        let since = '';
                        const rawSince = findVal(['Status Category Changed', 'Status Changed']) || '';
                        if (rawSince) {
                            try {
                                // Expected format: "18.09.2025 14:19" or similar
                                const datePart = rawSince.split(' ')[0]; // "18.09.2025"
                                const parts = datePart.split('.');
                                if (parts.length === 3) {
                                    const day = parts[0];
                                    const month = parts[1];
                                    const year = parts[2].slice(-2); // "25"
                                    since = `${day}.${month}.${year}`;
                                } else {
                                    // Fallback if format is different (e.g. YYYY-MM-DD)
                                    const d = new Date(rawSince);
                                    if (!isNaN(d.getTime())) {
                                        const day = String(d.getDate()).padStart(2, '0');
                                        const month = String(d.getMonth() + 1).padStart(2, '0');
                                        const year = String(d.getFullYear()).slice(-2);
                                        since = `${day}.${month}.${year}`;
                                    }
                                }
                            } catch (e) {
                                console.warn("Failed to parse date:", rawSince);
                            }
                        }

                        if (!key) throw new Error("Could not find Issue Key in CSV row");

                        return {
                            id: key,
                            name: summary.substring(0, 50),
                            key: key,
                            status: status,
                            sp: sp,
                            team: team,
                            sprint: sprint,
                            epic: epic,
                            epicSummary: epicSummary,
                            pi: currentPI,
                            since: since
                        };
                    });

                    const uniqueEpics = new Map<string, string>();
                    parsedStories.forEach((s: any) => {
                        if (s.epic && !uniqueEpics.has(s.epic)) {
                            uniqueEpics.set(s.epic, s.epicSummary);
                        }
                    });

                    const newFeatures: Feature[] = Array.from(uniqueEpics.entries()).map(([key, summary]) => ({
                        id: key,
                        name: summary,
                        jiraId: key,
                        pibBudget: 0,
                        teamBudgets: {},
                        epicOwner: '',
                        topicKey: '',
                        pi: currentPI
                    }));

                    importStories(parsedStories.map((s: any) => {
                        const { epicSummary, ...story } = s;
                        return story as Story;
                    }), currentPI);

                    if (newFeatures.length > 0) {
                        importFeatures(newFeatures);
                    }

                    setError(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                } catch (e: any) {
                    setError(`Import failed: ${e.message} `);
                }
            },
            error: (err) => {
                setError(`CSV Parse Error: ${err.message} `);
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
                if (!Array.isArray(json)) throw new Error("JSON must be an array of stories");

                // Basic validation
                const validStories = json.filter((s: any) => s.id && s.key && s.name).map((s: any) => ({
                    ...s,
                    status: normalizeStatus(s.status)
                }));
                importStories(validStories, currentPI);
                setError(null);
                if (jsonInputRef.current) jsonInputRef.current.value = '';
            } catch (err: any) {
                setError(`JSON Import Error: ${err.message}`);
            }
        };
        reader.readAsText(file);
    };

    const exportCSV = () => {
        const csv = Papa.unparse(processedStories);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `jira_export_${currentPI}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportJSON = () => {
        const json = JSON.stringify(processedStories, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `jira_export_${currentPI}.json`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // ... Modal Handlers (same as before) ...
    const handleOpenAddModal = () => {
        setIsEditing(false);
        setFormData({
            id: `MANUAL-${Date.now()}`,
            key: '',
            name: '',
            status: 'Open',
            sp: 0,
            team: '',
            sprint: `${currentPI}-S1`,
            epic: '',
            pi: currentPI
        });
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (story: Story) => {
        setIsEditing(true);
        setFormData({ ...story });
        setIsModalOpen(true);
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.key || !formData.name) {
            alert("Key and Summary are required");
            return;
        }

        const storyToSave = formData as Story;

        if (isEditing) {
            updateStory(storyToSave);
        } else {
            if (!storyToSave.id) storyToSave.id = storyToSave.key;
            addStory(storyToSave);
        }
        setIsModalOpen(false);
    };

    const handleDelete = (id: string) => {
        if (confirm('Are you sure you want to delete this issue?')) {
            deleteStory(id);
        }
    };

    const SortIcon = ({ column }: { column: SortKey }) => {
        if (sortConfig.key !== column) return <div className="w-4 h-4" />;
        return sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
    };

    const Th = ({ column, label, align = 'left' }: { column: SortKey, label: string, align?: 'left' | 'right' }) => (
        <th
            className={`px-6 py-4 font-semibold cursor-pointer hover:bg-gray-100 transition-colors select-none text-${align}`}
            onClick={() => handleSort(column)}
        >
            <div className={`flex items-center gap-2 ${align === 'right' ? 'justify-end' : ''}`}>
                {label}
                <SortIcon column={column} />
            </div>
        </th>
    );

    return (
        <div className="space-y-6">
            <PageHeader
                title={`${currentPI} Jira Import`}
                description="Import, manage, and analyze Jira stories."
                actions={
                    <div className="flex items-center gap-2">
                        <button onClick={handleOpenAddModal} className="btn btn-primary">
                            <Plus size={18} /> Add
                        </button>

                        <div className="h-8 w-px bg-gray-300 mx-2" />

                        <input type="file" accept=".csv" ref={fileInputRef} onChange={handleCSVUpload} className="hidden" id="csv-upload" />
                        <label htmlFor="csv-upload" className="btn btn-secondary cursor-pointer" title="Import CSV">
                            <Upload size={18} /> CSV
                        </label>

                        <input type="file" accept=".json" ref={jsonInputRef} onChange={handleJSONUpload} className="hidden" id="json-upload" />
                        <label htmlFor="json-upload" className="btn btn-secondary cursor-pointer" title="Import JSON">
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

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-3">
                    <AlertCircle size={20} />
                    {error}
                </div>
            )}

            {/* Filters Toolbar */}
            <div className="card p-4 flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2 text-text-muted">
                    <Filter size={18} />
                    <span className="font-medium">Filters:</span>
                </div>

                <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="input py-1.5 text-sm w-40"
                >
                    <option value="all">All Statuses</option>
                    <option value="done">Done (Green)</option>
                    <option value="testing">Testing (Lt Green)</option>
                    <option value="review">Code Review (Yel)</option>
                    <option value="dev">Started (Orange)</option>
                    <option value="blocked">Blocked (Dk Red)</option>
                    <option value="open">Open (Red)</option>
                </select>

                <select
                    value={featureFilter}
                    onChange={e => setFeatureFilter(e.target.value)}
                    className="input py-1.5 text-sm w-40"
                >
                    <option value="all">All Features</option>
                    {uniqueFeatures.map(f => (
                        <option key={f} value={f}>{f}</option>
                    ))}
                </select>

                <select
                    value={teamFilter}
                    onChange={e => setTeamFilter(e.target.value)}
                    className="input py-1.5 text-sm w-40"
                >
                    <option value="all">All Teams</option>
                    {uniqueTeams.map(t => (
                        <option key={t} value={t}>{t}</option>
                    ))}
                </select>

                <div className="ml-auto text-sm text-text-muted">
                    Showing {processedStories.length} issues
                </div>
            </div>

            <div className="card overflow-hidden flex flex-col h-[calc(100vh-280px)]">
                <div className="overflow-x-auto overflow-y-auto flex-1 -mx-6 -my-6">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-bg-surface backdrop-blur sticky top-0 z-10 shadow-sm">
                            <tr className="border-b border-gray-200 text-text-muted text-xs uppercase tracking-wider">
                                <Th column="key" label="Key" />
                                <Th column="name" label="Summary" />
                                <Th column="statusColor" label="Status" />
                                <Th column="since" label="Since" />
                                <Th column="sp" label="SP" />
                                <Th column="team" label="Team" />
                                <Th column="sprint" label="Sprint" />
                                <Th column="epic" label="Feature" />
                                <th className="px-6 py-4 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {processedStories.map(story => (
                                <tr key={story.id} className="group hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-3 font-mono text-sm">
                                        <a
                                            href={`https://polypoint.atlassian.net/browse/${story.key}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-brand-secondary hover:text-brand-primary hover:underline"
                                        >
                                            {story.key}
                                        </a>
                                    </td>
                                    <td className="px-6 py-3 text-text-main max-w-md truncate" title={story.name}>{story.name}</td>
                                    <td className="px-6 py-3">
                                        <span className={clsx(
                                            "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border",
                                            getStatusColor(story.status)
                                        )}>
                                            {story.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3 text-text-muted text-xs">{story.since}</td>
                                    <td className="px-6 py-3 text-text-main">{story.sp}</td>
                                    <td className="px-6 py-3 text-text-main">{story.team}</td>
                                    <td className="px-6 py-3 text-text-main">{story.sprint}</td>
                                    <td className="px-6 py-3"><span className="badge badge-accent">{story.epic}</span></td>
                                    <td className="px-6 py-3 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleOpenEditModal(story)}
                                                className="p-1 text-gray-400 hover:text-brand-primary transition-colors"
                                                title="Edit"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(story.id)}
                                                className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {processedStories.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="text-center py-12 text-text-muted">
                                        <div className="flex flex-col items-center gap-3">
                                            <FileText size={48} className="opacity-20" />
                                            <p>No stories found matching your filters.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                            <h3 className="font-semibold text-lg text-gray-800">
                                {isEditing ? 'Edit Issue' : 'Add New Issue'}
                            </h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Key *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.key || ''}
                                        onChange={e => setFormData({ ...formData, key: e.target.value })}
                                        className="input w-full"
                                        placeholder="PROJ-123"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                    <select
                                        value={formData.status || 'To Do'}
                                        onChange={e => setFormData({ ...formData, status: e.target.value })}
                                        className="input w-full"
                                    >
                                        <option value="Open">Open</option>
                                        <option value="Started">Started</option>
                                        <option value="Code Review">Code Review</option>
                                        <option value="Testing">Testing</option>
                                        <option value="Blocked">Blocked</option>
                                        <option value="Done">Done</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Summary *</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name || ''}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="input w-full"
                                    placeholder="Issue summary..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Story Points</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.5"
                                        value={formData.sp || 0}
                                        onChange={e => setFormData({ ...formData, sp: parseFloat(e.target.value) })}
                                        className="input w-full"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Team</label>
                                    <input
                                        type="text"
                                        value={formData.team || ''}
                                        onChange={e => setFormData({ ...formData, team: e.target.value })}
                                        className="input w-full"
                                        placeholder="Team Name"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Sprint</label>
                                    <input
                                        type="text"
                                        value={formData.sprint || ''}
                                        onChange={e => setFormData({ ...formData, sprint: e.target.value })}
                                        className="input w-full"
                                        placeholder="26.1-S1"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Feature / Epic Link</label>
                                    <input
                                        type="text"
                                        value={formData.epic || ''}
                                        onChange={e => setFormData({ ...formData, epic: e.target.value })}
                                        className="input w-full"
                                        placeholder="FEAT-123"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="btn btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                >
                                    <Save size={18} />
                                    {isEditing ? 'Save Changes' : 'Create Issue'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Jira;
