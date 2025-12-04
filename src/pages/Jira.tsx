import React, { useState, useRef } from 'react';
import { useData } from '../context/DataContext';
import PageHeader from '../components/PageHeader';
import type { Story } from '../types';
import Papa from 'papaparse';
import { Upload, FileText, AlertCircle } from 'lucide-react';

const Jira: React.FC = () => {
    const { stories, importStories, currentPI, loadTestJiraData } = useData();
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
                        const team = findVal(['Custom field (pdev_unit)', 'pdev_unit', 'Team']) || '';
                        const sprint = findVal(['Custom field (current Sprint)', 'current Sprint', 'Sprint']) || '';
                        const epic = findVal(['Parent key', 'Parent', 'Epic Link', 'Custom field (Epic Link)']) || '';

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
                            pi: currentPI
                        };
                    });

                    importStories(parsedStories, currentPI);
                    setError(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                } catch (e: any) {
                    setError(`Import failed: ${e.message}`);
                }
            },
            error: (err) => {
                setError(`CSV Parse Error: ${err.message}`);
            }
        });
    };

    return (
        <div>
            <PageHeader
                title={`${currentPI} Jira Import`}
                description="Import and view Jira stories."
                actions={
                    <div className="relative">
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
                            className="btn btn-primary flex items-center gap-2 cursor-pointer"
                        >
                            <Upload size={18} /> Import CSV
                        </label>
                        <button
                            onClick={loadTestJiraData}
                            className="btn btn-secondary flex items-center gap-2 ml-2"
                        >
                            <FileText size={18} /> Load Test Data
                        </button>
                    </div>
                }
            />

            {error && (
                <div className="card mb-6 flex items-center gap-3" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}>
                    <AlertCircle size={20} />
                    {error}
                </div>
            )}

            <div className="table-container card" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                <table>
                    <thead className="sticky top-0 bg-panel z-10">
                        <tr>
                            <th>Key</th>
                            <th>Summary</th>
                            <th>Status</th>
                            <th>SP</th>
                            <th>Team</th>
                            <th>Sprint</th>
                            <th>Epic</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredStories.map(story => (
                            <tr key={story.id}>
                                <td className="font-mono text-sm text-accent">{story.key}</td>
                                <td title={story.name}>{story.name}</td>
                                <td>
                                    <span className="badge badge-primary">
                                        {story.status}
                                    </span>
                                </td>
                                <td>{story.sp}</td>
                                <td>{story.team}</td>
                                <td>{story.sprint}</td>
                                <td><span className="badge badge-accent">{story.epic}</span></td>
                            </tr>
                        ))}
                        {filteredStories.length === 0 && (
                            <tr>
                                <td colSpan={7} className="text-center py-8 text-secondary">
                                    <div className="flex flex-col items-center gap-3">
                                        <FileText size={48} style={{ opacity: 0.2 }} />
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
    );
};

export default Jira;
