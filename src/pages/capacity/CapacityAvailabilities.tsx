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
            const delimiter = text.split('\n')[0].includes(';') ? ';' : ',';
            Papa.parse(text, {
                header: true, delimiter, skipEmptyLines: true,
                complete: (results) => {
                    const data = results.data as any[];
                    let updatedCount = 0;
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
                        const p = d.split('.');
                        if (p.length === 3) {
                            let y = p[2];
                            if (y.length === 2) y = '20' + y;
                            return `${y}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
                        }
                        return d; // fallback (YYYY-MM-DD)
                    };

                    cleanData.forEach(csvRow => {
                        let dateKey = Object.keys(csvRow).find(k => k.toUpperCase() === 'DATUM' || k.toUpperCase() === 'DATE');
                        if (!dateKey) dateKey = Object.keys(csvRow).find(k => /^\d{1,2}\.\d{1,2}\.\d{2,4}$/.test(csvRow[k]));
                        if (!dateKey) return;
                        const csvDate = parseDate(csvRow[dateKey]);
                        if (!csvDate) return;

                        const targetIndex = newAvails.findIndex(r => r.date === csvDate);
                        if (targetIndex !== -1) {
                            updatedCount++;
                            developers.forEach(dev => {
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
                        }
                    });

                    if (updatedCount > 0) {
                        if (confirm(`Updated ${updatedCount} days from CSV. Apply changes?`)) {
                            setAvailabilities(newAvails);
                            setIsDirty(true);
                        }
                    } else {
                        alert('No matching dates found.');
                    }
                }
            });
        };
        reader.readAsText(file);
    };

    if (loading) return <div>Loading...</div>;

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
                                <th className="px-4 py-3 text-left min-w-[100px] bg-gray-50">Date</th>
                                <th className="px-4 py-3 text-left bg-gray-50">WkDay</th>
                                <th className="px-4 py-3 text-left bg-gray-50">KW</th>
                                <th className="px-4 py-3 text-left bg-gray-50">Sprint</th>
                                <th className="px-4 py-3 text-left bg-gray-50">PI</th>
                                {filteredDevs.map(d => (
                                    <th key={d.key} className="px-4 py-3 text-center bg-gray-50 min-w-[60px]" title={d.name}>{d.key}</th>
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
                                    <tr key={row.date} className="hover:bg-gray-50">
                                        <td className="px-4 py-2 font-medium">{new Date(row.date).toLocaleDateString('de-DE')}</td>
                                        <td className="px-4 py-2">{weekday}</td>
                                        <td className="px-4 py-2">{kw}</td>
                                        <td className="px-4 py-2">{row.sprint}</td>
                                        <td className="px-4 py-2">{row.pi}</td>
                                        {filteredDevs.map(dev => {
                                            const val = row[dev.key] !== undefined ? Number(row[dev.key]) : 1;
                                            let bgClass = 'bg-green-100/50';
                                            if (val === 0) bgClass = 'bg-red-100/50';
                                            if (val === 0.5) bgClass = 'bg-yellow-100/50';

                                            return (
                                                <td key={dev.key} className={`p-0 border-l border-gray-100 ${bgClass}`}>
                                                    <input
                                                        type="number"
                                                        step="0.5"
                                                        min="0"
                                                        max="1"
                                                        value={val}
                                                        onChange={(e) => handleValueChange(row.date, dev.key, Number(e.target.value))}
                                                        className={`w-full h-full text-center bg-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-accent py-2`}
                                                    />
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
