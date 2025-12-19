import React, { useEffect, useState } from 'react';
import { useData } from '../context/DataContext';
import PageHeader from '../components/PageHeader';
import { CapacityService } from '../services/CapacityService';
import type { CapacityAvailability } from '../types/capacity';
import { Save } from 'lucide-react';

const CalendarPage: React.FC = () => {
    const { currentPI } = useData();
    const [availabilities, setAvailabilities] = useState<CapacityAvailability[]>([]);
    const [loading, setLoading] = useState(true);
    const [modifiedDates, setModifiedDates] = useState<Set<string>>(new Set());
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, [currentPI]);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            await CapacityService.initDefaultSprints(currentPI);
            const data = await CapacityService.getAvailabilities(currentPI);

            // Safe sort
            data.sort((a, b) => {
                const dateA = a.date || '';
                const dateB = b.date || '';
                return dateA.localeCompare(dateB);
            });

            setAvailabilities(data);
            setModifiedDates(new Set());
        } catch (error: any) {
            console.error("Failed to load calendar data", error);
            setError(error.message || "Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    const getDayShort = (dateStr: string) => {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return '';
            return date.toLocaleDateString('de-CH', { weekday: 'short' }).substring(0, 2);
        } catch (e) {
            return '';
        }
    };

    const getKW = (dateStr: string) => {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return '';

            const tempDate = new Date(date.valueOf());
            const dayNum = (date.getDay() + 6) % 7;
            tempDate.setDate(tempDate.getDate() - dayNum + 3);
            const firstThursday = tempDate.valueOf();
            tempDate.setMonth(0, 1);
            if (tempDate.getDay() !== 4) {
                tempDate.setMonth(0, 1 + ((4 - tempDate.getDay()) + 7) % 7);
            }
            return 1 + Math.ceil((firstThursday - tempDate.valueOf()) / 604800000);
        } catch (e) {
            return 0;
        }
    };

    const handleSprintChange = (date: string, newSprint: string) => {
        setAvailabilities(prev => prev.map(row => {
            if (row.date === date) {
                return { ...row, sprint: newSprint };
            }
            return row;
        }));
        setModifiedDates(prev => new Set(prev).add(date));
    };

    const saveChanges = async () => {
        const toSave = availabilities.filter(row => modifiedDates.has(row.date));
        if (toSave.length === 0) return;

        try {
            setLoading(true);
            await CapacityService.saveAvailability(currentPI, toSave);
            setModifiedDates(new Set());
        } catch (error) {
            console.error("Error saving calendar", error);
            alert("Error saving changes");
        } finally {
            setLoading(false);
        }
    };

    const getSprintOptions = () => {
        const sprints = [];
        for (let i = 1; i <= 6; i++) {
            sprints.push(`${currentPI}-S${i}`);
        }
        sprints.push(`${currentPI}-IP`);
        return sprints;
    };

    const sprintOptions = getSprintOptions();

    if (loading && availabilities.length === 0) {
        return (
            <div className="flex items-center justify-center h-96 text-text-muted gap-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-primary"></div>
                Loading Calendar...
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 text-center text-red-600">
                <h2 className="text-xl font-bold mb-2">Error Loading Calendar</h2>
                <p>{error}</p>
                <button onClick={loadData} className="mt-4 btn btn-primary">Retry</button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title={`${currentPI} Calendar`}
                description="Manage sprint mapping for each day in the PI."
                actions={
                    modifiedDates.size > 0 ? (
                        <button onClick={saveChanges} className="btn btn-primary flex items-center gap-2">
                            <Save size={18} /> Save Changes
                        </button>
                    ) : undefined
                }
            />

            <div className="card overflow-hidden">
                <div className="overflow-x-auto -mx-6 -my-6">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider w-32">Date</th>
                                <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider w-20">Day</th>
                                <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider w-20">KW</th>
                                <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Sprint</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {availabilities.map((row, index) => {
                                const dayShort = getDayShort(row.date);
                                const isWeekend = dayShort === 'Sa' || dayShort === 'So' || dayShort === 'Su'; // German 'So' or English 'Su'
                                const isModified = modifiedDates.has(row.date);

                                // Safe date display
                                let dateDisplay = row.date;
                                try {
                                    dateDisplay = new Date(row.date).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: '2-digit' });
                                } catch (e) { }

                                return (
                                    <tr key={row.date || index} className={`hover:bg-gray-50 transition-colors ${isModified ? 'bg-yellow-50/50' : ''} ${isWeekend ? 'bg-gray-50/30' : ''}`}>
                                        <td className="px-6 py-3 font-mono text-sm text-text-main">
                                            {dateDisplay}
                                        </td>
                                        <td className="px-6 py-3 text-sm text-text-main">
                                            {dayShort}
                                        </td>
                                        <td className="px-6 py-3 text-sm text-text-main">
                                            {getKW(row.date)}
                                        </td>
                                        <td className="px-6 py-3">
                                            <select
                                                value={row.sprint}
                                                onChange={e => handleSprintChange(row.date, e.target.value)}
                                                className="input py-1 px-2 text-sm max-w-[200px]"
                                            >
                                                {sprintOptions.map(opt => (
                                                    <option key={opt} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                        </td>
                                    </tr>
                                );
                            })}
                            {availabilities.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="text-center py-8 text-text-muted">
                                        No calendar data found.
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

export default CalendarPage;
