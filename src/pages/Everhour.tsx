import React, { useState, useRef, useEffect } from 'react';
import { useData } from '../context/DataContext';
import PageHeader from '../components/PageHeader';
import Papa from 'papaparse';
import { Upload, Clock, AlertCircle, FileText } from 'lucide-react';
import { CapacityService } from '../services/CapacityService';
import type { CapacityAvailability } from '../types/capacity';

interface EverhourRow {
    key: string;
    total: number;
    sprintHours: Record<string, number>;
}

const Everhour: React.FC = () => {
    const { currentPI, importEverhour, everhourEntries } = useData();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [rows, setRows] = useState<EverhourRow[]>([]);
    const [dateToSprintMap, setDateToSprintMap] = useState<Record<string, string>>({});
    const [sprintNames, setSprintNames] = useState<string[]>([]);

    useEffect(() => {
        loadSprintData();
    }, [currentPI]);

    // Load existing data from context on mount or PI change
    useEffect(() => {
        if (!everhourEntries.length) return;

        const piEntries = everhourEntries.filter(e => e.pi === currentPI);
        if (piEntries.length === 0) {
            setRows([]); // Clear rows if no entries for current PI
            return;
        }

        const taskMap = new Map<string, EverhourRow>();

        piEntries.forEach(entry => {
            if (!taskMap.has(entry.jiraKey)) {
                taskMap.set(entry.jiraKey, { key: entry.jiraKey, total: 0, sprintHours: {} });
            }
            const row = taskMap.get(entry.jiraKey)!;
            row.total += entry.totalHours;
            row.sprintHours[entry.sprint] = (row.sprintHours[entry.sprint] || 0) + entry.totalHours;
        });

        const sortedRows = Array.from(taskMap.values()).sort((a, b) => b.total - a.total);
        setRows(sortedRows);
    }, [everhourEntries, currentPI]);


    const loadSprintData = async () => {
        try {
            await CapacityService.initDefaultSprints(currentPI);
            const data = await CapacityService.getAvailabilities(currentPI);

            const map: Record<string, string> = {};
            data.forEach(d => {
                if (d.sprint) {
                    map[d.date] = d.sprint; // d.date is YYYY-MM-DD
                }
            });
            setDateToSprintMap(map);

            // Generate sprint names for columns (1-5 + IP)
            const sprints = [];
            for (let i = 1; i <= 6; i++) {
                sprints.push(`${currentPI}-S${i}`);
            }
            sprints.push(`${currentPI}-IP`);
            setSprintNames(sprints);

        } catch (e) {
            console.error("Failed to load sprint data", e);
            setError("Failed to load calendar data for sprint mapping.");
        }
    };

    const processCSVData = (csvText: string) => {
        setError(null);
        try {
            // parse with header: false to find the real header
            const result = Papa.parse(csvText, {
                header: false,
                skipEmptyLines: true,
            });

            if (result.errors.length > 0) {
                throw new Error(result.errors[0].message);
            }

            const data = result.data as string[][];

            // Find header row index
            const headerRowIndex = data.findIndex(row => row.includes("Task Number") || row.includes("Task ID") || row.includes("Issue Key"));

            if (headerRowIndex === -1) {
                throw new Error("Could not find 'Task Number' header in CSV.");
            }

            // Extract headers and body
            const headers = data[headerRowIndex];
            const body = data.slice(headerRowIndex + 1);

            // Map indices
            const keyIdx = headers.findIndex(h => h.trim() === "Task Number" || h.trim() === "Task ID" || h.trim() === "Issue Key" || h.trim() === "Key");
            const dayIdx = headers.findIndex(h => h.trim() === "Day" || h.trim() === "Date");
            const timeIdx = headers.findIndex(h => h.trim() === "Time" || h.trim() === "Hours" || h.trim() === "Total Time");

            if (keyIdx === -1 || dayIdx === -1 || timeIdx === -1) {
                throw new Error("Missing required columns: Task Number, Day, Time");
            }

            // Aggregation map
            const taskMap = new Map<string, EverhourRow>();

            body.forEach((row, idx) => {
                // Remove # from key if present
                let key = row[keyIdx]?.trim();
                const day = row[dayIdx]?.trim();
                const timeStr = row[timeIdx]?.trim();

                if (!key || !day || !timeStr) return; // Skip invalid rows or summary rows like "Total"

                if (key === "Total") return; // Skip total row

                if (key.startsWith('#')) key = key.substring(1);

                const hours = parseFloat(timeStr) || 0;

                // Determine Sprint
                // CSV date format might vary, but sample is YYYY-MM-DD. 
                // If mapping fails, maybe try to normalize? 
                // Sample: 2025-12-09. CapacityService keys are YYYY-MM-DD.
                const sprint = dateToSprintMap[day] || 'Unknown';

                if (!taskMap.has(key)) {
                    taskMap.set(key, { key, total: 0, sprintHours: {} });
                }

                const entry = taskMap.get(key)!;
                entry.total += hours;
                entry.sprintHours[sprint] = (entry.sprintHours[sprint] || 0) + hours;
            });

            // Convert Processed Rows to EverhourEntries for Context
            const newEntries: import('../types').EverhourEntry[] = [];
            taskMap.forEach((row, key) => {
                Object.entries(row.sprintHours).forEach(([sprint, hours]) => {
                    newEntries.push({
                        id: `${key}-${sprint}-${currentPI}`,
                        jiraKey: key,
                        sprint: sprint,
                        totalHours: hours,
                        pi: currentPI
                    });
                });
            });

            // Save to Context
            importEverhour(newEntries, currentPI);

        } catch (e: any) {
            setError(e.message);
        }
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            processCSVData(text);
        };
        reader.readAsText(file);

        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const loadSampleData = async () => {
        setLoading(true);
        try {
            const response = await fetch('/PPmetrics/everhour.csv');
            if (!response.ok) throw new Error("Failed to fetch sample file");
            const text = await response.text();
            processCSVData(text);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title={`${currentPI} Everhour Import`}
                description="Import time tracking data and view by sprint."
                actions={
                    <div className="flex gap-2">
                        <button
                            onClick={loadSampleData}
                            disabled={loading}
                            className="btn btn-secondary flex items-center gap-2"
                        >
                            <FileText size={18} /> Load Sample
                        </button>
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
                    </div>
                }
            />

            {error && (
                <div className="card mb-6 flex items-center gap-3 border-red-200 bg-red-50 text-red-700">
                    <AlertCircle size={20} />
                    {error}
                </div>
            )}

            <div className="card overflow-hidden">
                <div className="overflow-x-auto -mx-6 -my-6">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Key</th>
                                {sprintNames.map(s => (
                                    <th key={s} className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider text-right">{s.split('-')[1]}</th>
                                ))}
                                <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {rows.map(row => (
                                <tr key={row.key} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-3 font-mono text-sm text-brand-secondary font-medium">{row.key}</td>
                                    {sprintNames.map(s => (
                                        <td key={s} className="px-6 py-3 text-sm text-text-main text-right">
                                            {row.sprintHours[s]?.toFixed(2) || '-'}
                                        </td>
                                    ))}
                                    <td className="px-6 py-3 text-sm font-bold text-text-main text-right">{row.total.toFixed(2)}</td>

                                </tr>
                            ))}
                            {rows.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={sprintNames.length + 2} className="text-center py-12 text-text-muted">
                                        <div className="flex flex-col items-center gap-3">
                                            <Clock size={48} className="opacity-20" />
                                            <p>No data to display.</p>
                                            <p className="text-sm">Import a CSV file to see the breakdown.</p>
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
