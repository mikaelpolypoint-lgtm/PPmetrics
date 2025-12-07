import React, { useState, useRef } from 'react';
import { useData } from '../context/DataContext';
import PageHeader from '../components/PageHeader';
import type { Story, Feature } from '../types';
import Papa from 'papaparse';
import { Upload, FileText, AlertCircle } from 'lucide-react';

const Jira: React.FC = () => {
    const { stories, importStories, importFeatures, currentPI, loadTestJiraData } = useData();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [error, setError] = useState<string | null>(null);

    const filteredStories = stories.filter(s => s.pi === currentPI);

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                try {
                    const parsedStories: Story[] = results.data.map((row: any) => {
                        // Map fields based on user requirements
                        // Note: CSV headers might vary, assuming standard Jira export or user needs to map
                        // For this MVP we assume the CSV has headers roughly matching the requirement or we try to find them

                        // Helper to find key case-insensitively
                        const findVal = (keys: string[]) => {
                            for (const k of keys) {
                                const foundKey = Object.keys(row).find(rk => rk.toLowerCase() === k.toLowerCase());
                                if (foundKey) return row[foundKey];
                            }
                            return '';
                        };

                        const summary = findVal(['Summary', 'Name']) || '';
                        const key = findVal(['Key', 'Issue key', 'ID']) || '';
                        const status = findVal(['Status']) || '';
                        const sp = parseFloat(findVal(['Custom field (Story Points)', 'Story Points', 'SP'])) || 0;
                        let team = findVal(['Custom field (pdev_unit)', 'pdev_unit', 'Team']) || '';

                        // Team Name Mapping
                        if (team === 'Hydrogen 1') team = 'H1';
                        const sprint = findVal(['Custom field (current Sprint)', 'current Sprint', 'Sprint']) || '';
                        const epic = findVal(['Parent key', 'Parent', 'Epic Link', 'Custom field (Epic Link)']) || '';
                        const epicSummary = findVal(['Parent summary', 'Parent Summary']) || epic; // Fallback to key if summary missing

                        if (!key) throw new Error("Could not find Issue Key in CSV row");

                        return {
                            id: key, // Use Key as ID
                            name: summary.substring(0, 50),
                            key: key,
                            status: status,
                            sp: sp,
                            team: team,
                            sprint: sprint,
                            epic: epic,
                            epicSummary: epicSummary, // Temp field for extraction
                            pi: currentPI
                        };
                    });

                    // Extract Features
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
                        const { epicSummary, ...story } = s; // Remove temp field
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

    return (
        <div className="space-y-6">
            <PageHeader
                title={`${currentPI} Jira Import`}
                description="Import and view Jira stories."
                actions={
                    <div className="flex items-center gap-3">
                        <input
                            type="file"
                            accept=".csv"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            className="hidden"
                            id="jira-upload"
                        />
                        <label
                            htmlFor="jira-upload"
                            className="btn btn-primary cursor-pointer"
                        >
                            <Upload size={18} /> Import CSV
                        </label>
                        <button
                            onClick={loadTestJiraData}
                            className="btn btn-secondary"
                        >
                            <FileText size={18} /> Load Test Data
                        </button>
                    </div>
                }
            />

            {error && (
                <div className="bg-pp-red-700/10 border border-pp-red-700/20 text-pp-red-700 px-4 py-3 rounded-lg flex items-center gap-3">
                    <AlertCircle size={20} />
                    {error}
                </div>
            )}

            <div className="card overflow-hidden flex flex-col h-[calc(100vh-200px)]">
                <div className="overflow-x-auto overflow-y-auto flex-1 -mx-6 -my-6">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-900/90 backdrop-blur sticky top-0 z-10">
                            <tr className="border-b border-white/10 text-slate-400 text-xs uppercase tracking-wider">
                                <th className="px-6 py-4 font-semibold">Key</th>
                                <th className="px-6 py-4 font-semibold">Summary</th>
                                <th className="px-6 py-4 font-semibold">Status</th>
                                <th className="px-6 py-4 font-semibold">SP</th>
                                <th className="px-6 py-4 font-semibold">Team</th>
                                <th className="px-6 py-4 font-semibold">Sprint</th>
                                <th className="px-6 py-4 font-semibold">Feature</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredStories.map(story => (
                                <tr key={story.id} className="group hover:bg-white/5 transition-colors">
                                    <td className="px-6 py-3 font-mono text-sm text-pp-blue-500">{story.key}</td>
                                    <td className="px-6 py-3 text-slate-200 max-w-md truncate" title={story.name}>{story.name}</td>
                                    <td className="px-6 py-3">
                                        <span className="badge badge-primary">
                                            {story.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3 text-slate-300">{story.sp}</td>
                                    <td className="px-6 py-3 text-slate-300">{story.team}</td>
                                    <td className="px-6 py-3 text-slate-300">{story.sprint}</td>
                                    <td className="px-6 py-3"><span className="badge badge-accent">{story.epic}</span></td>
                                </tr>
                            ))}
                            {filteredStories.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="text-center py-12 text-slate-500">
                                        <div className="flex flex-col items-center gap-3">
                                            <FileText size={48} className="opacity-20" />
                                            <p>No stories imported for {currentPI}.</p>
                                            <p className="text-sm">Upload a CSV file to get started.</p>
                                        </div>
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

export default Jira;
