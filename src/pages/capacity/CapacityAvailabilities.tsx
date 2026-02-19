import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { CapacityService } from '../../services/CapacityService';
import type { CapacityDeveloper, CapacityAvailability } from '../../types/capacity';
import { Save, Upload, Download } from 'lucide-react';
import Papa from 'papaparse';

const CapacityAvailabilities: React.FC = () => {
    const { currentPI } = useData();
    const [developers, setDevelopers] = useState<CapacityDeveloper[]>([]);
    const [availabilities, setAvailabilities] = useState<CapacityAvailability[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterTeam, setFilterTeam] = useState('All');
    const [filterSprint, setFilterSprint] = useState('All');
    const [filterWeekday, setFilterWeekday] = useState('All');
    const [filterKw, setFilterKw] = useState('All');
    const [isDirty, setIsDirty] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadData();
    }, [currentPI]);

    const loadData = async () => {
        setLoading(true);
        try {
            await CapacityService.initDefaultSprints(currentPI);
            const [devs, avails] = await Promise.all([
                CapacityService.getDevelopers(currentPI),
                CapacityService.getAvailabilities(currentPI)
            ]);
            devs.sort((a, b) => (a.key || '').localeCompare(b.key || ''));
            avails.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            setDevelopers(devs);
            setAvailabilities(avails);
            setIsDirty(false);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleValueChange = (date: string, key: string, newValue: number) => {
        setAvailabilities(prev => prev.map(row => {
            if (row.date === date) {
                return { ...row, [key]: newValue };
            }
            return row;
        }));
        setIsDirty(true);
    };

    const saveChanges = async () => {
        try {
            await CapacityService.saveAvailability(currentPI, availabilities);
            setIsDirty(false);
            alert('Saved successfully!');
        } catch (e) {
            console.error(e);
            alert('Error saving changes');
        }
    };

    // Filters Data
    const { filteredDevs, filteredRows, teams, sprintNames, weekdays, kws } = useMemo(() => {
        const getWeekday = (d: string) => new Date(d).toLocaleDateString('en-US', { weekday: 'short' });
        const getISOWeek = (d: string) => {
            const date = new Date(d);
            date.setHours(0, 0, 0, 0);
            date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
            const week1 = new Date(date.getFullYear(), 0, 4);
            return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
        };

        const uniqueTeams = ['All', ...Array.from(new Set(developers.map(d => d.team).filter(Boolean)))];
        const uniqueSprints = ['All', ...Array.from(new Set(availabilities.map(a => a.sprint).filter(Boolean)))];
        const uniqueWeekdays = ['All', ...Array.from(new Set(availabilities.map(a => getWeekday(a.date))))];
        // Sort Weekdays...
        const weekOrder: any = { 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6, 'Sun': 7 };
        uniqueWeekdays.sort((a, b) => (weekOrder[a] || 99) - (weekOrder[b] || 99));

        const uniqueKws = ['All', ...Array.from(new Set(availabilities.map(a => getISOWeek(a.date))))].sort((a: any, b: any) => {
            if (a === 'All') return -1;
            if (b === 'All') return 1;
            return a - b;
        });

        const fDevs = filterTeam === 'All' ? developers : developers.filter(d => d.team === filterTeam);

        const fRows = availabilities.filter(r => {
            const w = getWeekday(r.date);
            const k = getISOWeek(r.date);
            return (filterSprint === 'All' || r.sprint === filterSprint) &&
                (filterWeekday === 'All' || w === filterWeekday) &&
                (filterKw === 'All' || String(k) === String(filterKw));
        });

        return { filteredDevs: fDevs, filteredRows: fRows, teams: uniqueTeams, sprintNames: uniqueSprints, weekdays: uniqueWeekdays, kws: uniqueKws };
    }, [developers, availabilities, filterTeam, filterSprint, filterWeekday, filterKw]);

    const exportCSV = () => {
        const fields = ['Date', 'Sprint', 'PI', ...developers.map(d => d.key)];
        const data = availabilities.map(row => {
            const csvRow: any = {
                'Date': new Date(row.date).toLocaleDateString('de-DE'), // DD.MM.YYYY
                'Sprint': row.sprint,
                'PI': row.pi
            };
            developers.forEach(dev => {
                csvRow[dev.key] = row[dev.key] !== undefined ? row[dev.key] : 1;
            });
            return csvRow;
        });
        const csv = Papa.unparse({ fields, data });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `availabilities_${currentPI}.csv`;
        link.click();
    };

    const importCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            const text = evt.target?.result as string;
            // Improved delimiter detection
            const firstLine = text.split('\n')[0];
            const delimiter = firstLine.includes(';') ? ';' : ',';

            console.log("Importing CSV...", { size: text.length, delimiter, firstLine });

            Papa.parse(text, {
                header: true,
                delimiter,
                skipEmptyLines: true,
                complete: (results) => {
                    if (results.errors && results.errors.length > 0) {
                        console.warn("CSV Parse Errors:", results.errors);
                    }

                    const data = results.data as any[];
                    console.log("Parsed rows:", data.length);

                    let updatedCount = 0;
                    let matchFailures = 0;
                    const newAvails = [...availabilities];

                    const cleanData = data.map(row => {
                        const newRow: any = {};
                        Object.keys(row).forEach(k => newRow[k.trim().replace(/^\uFEFF/, '')] = row[k]);
                        return newRow;
                    });

                    // Helper logic adapted from availabilities.js
                    const parseVal = (val: any) => {
                        if (!val) return 0;
                        const s = val.toString().trim().toLowerCase();
                        if (s === '1') return 1;
                        if (s.includes('0.5')) return 0.5;
                        return 0;
                    };

                    const parseDate = (d: string) => {
                        if (!d) return null;
                        const cleanD = d.trim();
                        // Try DD.MM.YYYY
                        const partsDot = cleanD.split('.');
                        if (partsDot.length === 3) {
                            let y = partsDot[2];
                            if (y.length === 2) y = '20' + y;
                            const m = partsDot[1].padStart(2, '0');
                            const day = partsDot[0].padStart(2, '0');
                            return `${y}-${m}-${day}`;
                        }
                        // Try YYYY-MM-DD
                        const partsDash = cleanD.split('-');
                        if (partsDash.length === 3) {
                            // Check if first part is year (4 digits)
                            if (partsDash[0].length === 4) return cleanD;
                            // Maybe DD-MM-YYYY? Rare but possible
                            return `${partsDash[2]}-${partsDash[1]}-${partsDash[0]}`;
                        }
                        return cleanD; // fallback
                    };

                    cleanData.forEach((csvRow, idx) => {
                        let dateKey = Object.keys(csvRow).find(k => k.toUpperCase() === 'DATUM' || k.toUpperCase() === 'DATE');
                        // Relaxed search for date column if explicit key not found
                        if (!dateKey) dateKey = Object.keys(csvRow).find(k => /^\d{1,2}[.-]\d{1,2}[.-]\d{2,4}$/.test(csvRow[k]));

                        if (!dateKey) {
                            if (idx < 5) console.warn("Row missing date key", csvRow);
                            return;
                        }

                        const rawDate = csvRow[dateKey];
                        const csvDate = parseDate(rawDate);

                        if (!csvDate) {
                            if (idx < 5) console.warn("Failed to parse date", rawDate);
                            return;
                        }

                        const targetIndex = newAvails.findIndex(r => r.date === csvDate);
                        if (targetIndex !== -1) {
                            updatedCount++;
                            developers.forEach(dev => {
                                // Only update devs managed by PEP (External)
                                if (!dev.pepPlan) return;

                                const csvKey = Object.keys(csvRow).find(k => {
                                    const cleanK = k.trim().toUpperCase();
                                    const devK = dev.key.toUpperCase();
                                    return cleanK === devK || cleanK.substring(0, 3) === devK;
                                });
                                if (csvKey && csvRow[csvKey] !== undefined) {
                                    newAvails[targetIndex] = {
                                        ...newAvails[targetIndex],
                                        [dev.key]: parseVal(csvRow[csvKey])
                                    };
                                }
                            });
                        } else {
                            matchFailures++;
                            if (matchFailures < 3) console.log("Date not found in calendar:", csvDate);
                        }
                    });

                    console.log(`Updated: ${updatedCount}, Failures: ${matchFailures}`);

                    if (updatedCount > 0) {
                        if (confirm(`Updated ${updatedCount} days from CSV. Apply changes?`)) {
                            setAvailabilities(newAvails);
                            setIsDirty(true);
                        }
                    } else {
                        alert(`No matching dates found. (Parsed ${data.length} rows, ${matchFailures} dates not in calendar). Check console for details.`);
                    }
                }
            });
        };
        reader.readAsText(file);
    };

    const handleBulkColumnUpdate = (devKey: string, value: number) => {
        if (!confirm(`Set ${devKey} to ${value} for all ${filteredRows.length} visible dates?`)) return;

        const updates = new Set<string>(); // efficient lookup
        filteredRows.forEach(r => updates.add(r.date));

        setAvailabilities(prev => prev.map(row => {
            if (updates.has(row.date)) {
                return { ...row, [devKey]: value };
            }
            return row;
        }));
        setIsDirty(true);
    };

    const handleBulkRowUpdate = (date: string, value: number) => {
        // Updates all VISIBLE developers for this row
        setAvailabilities(prev => prev.map(row => {
            if (row.date === date) {
                const newRow = { ...row };
                filteredDevs.forEach(d => {
                    newRow[d.key] = value;
                });
                return newRow;
            }
            return row;
        }));
        setIsDirty(true);
    };

    const nextValue = (current: number) => {
        if (current === 1) return 0.5;
        if (current === 0.5) return 0;
        return 1;
    };

    // Helper for cell color
    const getCellColor = (val: number) => {
        if (val === 1) return 'bg-green-100 text-green-800 hover:bg-green-200';
        if (val === 0.5) return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
        return 'bg-red-100 text-red-800 hover:bg-red-200';
    };

    if (loading) return <div className="p-8 text-center text-text-muted">Loading Availabilities...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 bg-bg-surface p-4 rounded-xl border border-border shadow-sm">
                <div className="flex gap-4 flex-wrap">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-text-muted uppercase">Team</label>
                        <select value={filterTeam} onChange={e => setFilterTeam(e.target.value)} className="border rounded px-2 py-1 text-sm bg-bg-main">
                            {teams.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-text-muted uppercase">Sprint</label>
                        <select value={filterSprint} onChange={e => setFilterSprint(e.target.value)} className="border rounded px-2 py-1 text-sm bg-bg-main">
                            {sprintNames.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-text-muted uppercase">Weekday</label>
                        <select value={filterWeekday} onChange={e => setFilterWeekday(e.target.value)} className="border rounded px-2 py-1 text-sm bg-bg-main">
                            {weekdays.map(w => <option key={w} value={w}>{w}</option>)}
                        </select>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-text-muted uppercase">KW</label>
                        <select value={filterKw} onChange={e => setFilterKw(e.target.value)} className="border rounded px-2 py-1 text-sm bg-bg-main">
                            {kws.map(k => <option key={k} value={String(k)}>{k}</option>)}
                        </select>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button onClick={() => fileInputRef.current?.click()} className="btn btn-secondary flex items-center gap-2 px-3 py-2 border rounded hover:bg-gray-50">
                        <Upload size={16} /> Import CSV
                    </button>
                    <input type="file" ref={fileInputRef} onChange={importCSV} accept=".csv" className="hidden" />

                    <button onClick={exportCSV} className="btn btn-secondary flex items-center gap-2 px-3 py-2 border rounded hover:bg-gray-50">
                        <Download size={16} /> Export CSV
                    </button>

                    {isDirty && (
                        <button onClick={saveChanges} className="btn-success flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                            <Save size={16} /> Save Changes
                        </button>
                    )}
                </div>
            </div>

            <div className="bg-bg-surface rounded-xl border border-border shadow-sm overflow-hidden flex flex-col h-[70vh]">
                <div className="overflow-auto flex-1">
                    <table className="w-full text-sm relative border-collapse">
                        <thead className="bg-gray-50 border-b border-border sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-4 py-3 text-left min-w-[120px] bg-gray-50 z-20 sticky left-0 border-r border-gray-100">
                                    <div className="flex items-center gap-2">
                                        Date
                                        {/* Global row actions for visible rows? No, maybe per row is better */}
                                    </div>
                                </th>
                                <th className="px-4 py-3 text-left bg-gray-50">WkDay</th>
                                <th className="px-4 py-3 text-left bg-gray-50">KW</th>
                                <th className="px-4 py-3 text-left bg-gray-50">Sprint</th>
                                <th className="px-4 py-3 text-left bg-gray-50 border-r border-gray-200">PI</th>
                                {filteredDevs.map(d => (
                                    <th key={d.key} className="px-2 py-3 text-center bg-gray-50 min-w-[80px] group border-b-2 border-transparent hover:border-brand-primary/20 transition-colors">
                                        <div className="flex flex-col items-center gap-1">
                                            <span className="font-bold text-gray-700" title={d.name}>{d.key}</span>
                                            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden transform scale-90">
                                                <button
                                                    onClick={() => handleBulkColumnUpdate(d.key, 1)}
                                                    className="w-6 h-6 flex items-center justify-center text-[10px] font-bold bg-green-50 text-green-700 hover:bg-green-100"
                                                    title="Set all visible to 1"
                                                >
                                                    1
                                                </button>
                                                <button
                                                    onClick={() => handleBulkColumnUpdate(d.key, 0.5)}
                                                    className="w-6 h-6 flex items-center justify-center text-[10px] font-bold bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
                                                    title="Set all visible to 0.5"
                                                >
                                                    ½
                                                </button>
                                                <button
                                                    onClick={() => handleBulkColumnUpdate(d.key, 0)}
                                                    className="w-6 h-6 flex items-center justify-center text-[10px] font-bold bg-red-50 text-red-700 hover:bg-red-100"
                                                    title="Set all visible to 0"
                                                >
                                                    0
                                                </button>
                                            </div>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredRows.map(row => {
                                const date = new Date(row.date);
                                const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
                                // Simple ISO week calc
                                const target = new Date(row.date);
                                const dayNr = (date.getDay() + 6) % 7;
                                target.setDate(target.getDate() - dayNr + 3);
                                const firstThursday = target.valueOf();
                                target.setMonth(0, 1);
                                if (target.getDay() !== 4) {
                                    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
                                }
                                const kw = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);

                                return (
                                    <tr key={row.date} className="hover:bg-gray-50 group/row">
                                        <td className="px-4 py-2 font-medium sticky left-0 bg-white group-hover/row:bg-gray-50 border-r border-gray-100 z-10">
                                            <div className="flex items-center justify-between gap-2">
                                                <span>{new Date(row.date).toLocaleDateString('de-DE')}</span>
                                                {/* Row Actions */}
                                                <div className="flex gap-0.5 opacity-0 group-hover/row:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => handleBulkRowUpdate(row.date, 0)}
                                                        className="w-5 h-5 flex items-center justify-center rounded text-[10px] bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
                                                        title="Mark whole day as absent (0)"
                                                    >
                                                        0
                                                    </button>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-2 text-text-muted">{weekday}</td>
                                        <td className="px-4 py-2 text-text-muted">{kw}</td>
                                        <td className="px-4 py-2 text-text-muted">{row.sprint}</td>
                                        <td className="px-4 py-2 text-text-muted border-r border-gray-200">{row.pi}</td>
                                        {filteredDevs.map(dev => {
                                            const val = row[dev.key] !== undefined ? Number(row[dev.key]) : 1;
                                            return (
                                                <td key={dev.key} className="p-0 border-l border-gray-50">
                                                    <button
                                                        onClick={() => handleValueChange(row.date, dev.key, nextValue(val))}
                                                        className={`w-full h-full min-h-[40px] flex items-center justify-center font-bold text-sm transition-colors ${getCellColor(val)}`}
                                                    >
                                                        {val}
                                                    </button>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default CapacityAvailabilities;
