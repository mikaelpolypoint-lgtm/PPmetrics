import React, { useState, useRef } from 'react';
import { useData } from '../context/DataContext';
import PageHeader from '../components/PageHeader';
import type { EverhourEntry } from '../types';
import Papa from 'papaparse';
import { Upload, Clock, AlertCircle } from 'lucide-react';

const Everhour: React.FC = () => {
    const { everhourEntries, importEverhour, currentPI } = useData();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [error, setError] = useState<string | null>(null);

    const filteredEntries = everhourEntries.filter(e => e.pi === currentPI);

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                try {
                    const parsedEntries: EverhourEntry[] = results.data.map((row: any, index: number) => {
                        const key = row['Key'] || row['Issue Key'] || row['Task ID'] || '';
                        const hours = parseFloat(row['Time'] || row['Hours'] || row['Total Time']) || 0;
                        const sprint = row['Sprint'] || row['Tags'] || '';

                        if (!key) throw new Error(`Row ${index + 1}: Missing Key`);

                        return {
                            id: `${key}-${index}`,
                            jiraKey: key,
                            totalHours: hours,
                            sprint: sprint,
                            pi: currentPI
                        };
                    });

                    importEverhour(parsedEntries, currentPI);
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
        <div className="space-y-6">
            <PageHeader
                title={`${currentPI} Everhour Import`}
                description="Import and view time tracking data."
                actions={
                    <div className="relative">
                        <input
                            type="file"
                            accept=".csv"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            className="hidden"
                            id="everhour-upload"
                        />
                        <label
                            htmlFor="everhour-upload"
                            className="btn btn-primary flex items-center gap-2 cursor-pointer"
                        >
                            <Upload size={18} /> Import CSV
                        </label>
                    </div>
                }
            />

            {error && (
                <div className="card mb-6 flex items-center gap-3 border-red-200 bg-red-50 text-red-700">
                    <AlertCircle size={20} />
                    {error}
                </div>
            )}

            <div className="card overflow-hidden flex flex-col h-[calc(100vh-200px)]">
                <div className="overflow-x-auto overflow-y-auto flex-1 -mx-6 -my-6">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-bg-surface backdrop-blur sticky top-0 z-10">
                            <tr className="border-b border-gray-100 text-text-muted text-xs uppercase tracking-wider">
                                <th className="px-6 py-4 font-semibold">Jira Key</th>
                                <th className="px-6 py-4 font-semibold">Sprint</th>
                                <th className="px-6 py-4 font-semibold">Total Hours</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredEntries.map(entry => (
                                <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 font-mono text-sm text-brand-secondary">{entry.jiraKey}</td>
                                    <td className="px-6 py-4 text-text-main">{entry.sprint || '-'}</td>
                                    <td className="px-6 py-4 font-bold text-text-main">{entry.totalHours.toFixed(2)} h</td>
                                </tr>
                            ))}
                            {filteredEntries.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="text-center py-12 text-text-muted">
                                        <div className="flex flex-col items-center gap-3">
                                            <Clock size={48} className="opacity-20" />
                                            <p>No time data imported for {currentPI}.</p>
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

export default Everhour;
