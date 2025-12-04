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
                        // Mapping logic
                        const key = row['Key'] || row['Issue Key'] || row['Task ID'] || '';
                        const hours = parseFloat(row['Time'] || row['Hours'] || row['Total Time']) || 0;
                        const sprint = row['Sprint'] || row['Tags'] || ''; // Assuming Sprint might be in tags or explicit column

                        if (!key) throw new Error(`Row ${index + 1}: Missing Key`);

                        return {
                            id: `${key}-${index}`, // Unique ID
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
        <div>
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
                <div className="card mb-6 flex items-center gap-3" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}>
                    <AlertCircle size={20} />
                    {error}
                </div>
            )}

            <div className="table-container card" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                <table>
                    <thead className="sticky top-0 bg-panel z-10">
                        <tr>
                            <th>Jira Key</th>
                            <th>Sprint</th>
                            <th>Total Hours</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredEntries.map(entry => (
                            <tr key={entry.id}>
                                <td className="font-mono text-sm text-accent">{entry.jiraKey}</td>
                                <td>{entry.sprint || '-'}</td>
                                <td className="font-bold">{entry.totalHours.toFixed(2)} h</td>
                            </tr>
                        ))}
                        {filteredEntries.length === 0 && (
                            <tr>
                                <td colSpan={3} className="text-center py-8 text-secondary">
                                    <div className="flex flex-col items-center gap-3">
                                        <Clock size={48} style={{ opacity: 0.2 }} />
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
    );
};

export default Everhour;
