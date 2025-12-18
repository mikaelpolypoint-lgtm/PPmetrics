import React, { useEffect, useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { CapacityService } from '../../services/CapacityService';
import type { CapacityDeveloper, CapacityAvailability } from '../../types/capacity';
import { Download } from 'lucide-react';
import Papa from 'papaparse';

interface SprintData {
    name: string;
    rows: CapacityAvailability[];
}

interface DevAttrs {
    devH: number;
    maintainH: number;
    manageH: number;
    dailySP: number;
}

const CapacityDashboard: React.FC = () => {
    const { currentPI } = useData();
    const [developers, setDevelopers] = useState<CapacityDeveloper[]>([]);
    const [availabilities, setAvailabilities] = useState<CapacityAvailability[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterTeam, setFilterTeam] = useState('All');
    const [filterSprint, setFilterSprint] = useState('All');

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                // Ensure defaults first (as SM does)
                await CapacityService.ensureDefaults(currentPI);
                const [devs, avails] = await Promise.all([
                    CapacityService.getDevelopers(currentPI),
                    CapacityService.getAvailabilities(currentPI)
                ]);

                // Init defaults if empty availabilities
                if (avails.length === 0) {
                    await CapacityService.initDefaultSprints(currentPI);
                    // Re-fetch
                    const newAvails = await CapacityService.getAvailabilities(currentPI);
                    setAvailabilities(newAvails);
                } else {
                    setAvailabilities(avails);
                }

                devs.sort((a, b) => (a.key || '').localeCompare(b.key || ''));
                setDevelopers(devs);
            } catch (error) {
                console.error("Error loading capacity dashboard:", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [currentPI]);

    // Processing Logic
    const { sprints, teams, sprintNames, filteredDevs, filteredSprints } = useMemo(() => {
        // Group by Sprint
        const sprintsMap = new Map<string, SprintData>();
        availabilities.forEach(row => {
            if (!sprintsMap.has(row.sprint)) {
                sprintsMap.set(row.sprint, { name: row.sprint, rows: [] });
            }
            sprintsMap.get(row.sprint)!.rows.push(row);
        });

        const sortedSprints = Array.from(sprintsMap.values()).sort((a, b) => {
            const dateA = a.rows[0]?.date || '';
            const dateB = b.rows[0]?.date || '';
            return dateA.localeCompare(dateB);
        });

        const teamsList = ['All', ...Array.from(new Set(developers.map(d => d.team).filter(Boolean)))];
        const sprintNamesList = ['All', ...sortedSprints.map(s => s.name)];

        const getDevTeam = (dev: CapacityDeveloper, sprintName: string) => {
            if (dev.sprintTeams && dev.sprintTeams[sprintName]) {
                return dev.sprintTeams[sprintName];
            }
            return dev.team;
        };

        const fSprints = filterSprint === 'All' ? sortedSprints : sortedSprints.filter(s => s.name === filterSprint);

        const fDevs = developers.filter(d => {
            if (filterTeam === 'All') return true;
            // Include if dev is in the team for ANY visible sprint
            return fSprints.some(s => getDevTeam(d, s.name) === filterTeam);
        });

        return {
            sprints: sprintsMap,
            sprintsList: sortedSprints,
            teams: teamsList,
            sprintNames: sprintNamesList,
            filteredDevs: fDevs,
            filteredSprints: fSprints
        };
    }, [developers, availabilities, filterTeam, filterSprint]);

    const getSprintCapacity = (sprintName: string, devKey: string) => {
        const sprintData = sprints.get(sprintName);
        if (!sprintData) return 0;

        return sprintData.rows.reduce((sum, row) => {
            const val = row[devKey];
            const numericVal = (val === undefined || val === null || val === '') ? 1 : Number(val);
            return sum + (isNaN(numericVal) ? 0 : numericVal);
        }, 0);
    };

    const getDevAttrs = (dev: CapacityDeveloper): DevAttrs => {
        const dailyHours = Number(dev.dailyHours) || 8;
        const load = Number(dev.load) || 90;
        const developRatio = Number(dev.developRatio) || 0;
        const maintainRatio = Number(dev.maintainRatio) || 0;
        const manageRatio = Number(dev.manageRatio) || 0;
        const velocity = Number(dev.velocity) || 0;

        const devH = (dailyHours * (load / 100) * (developRatio / 100));
        const maintainH = (dailyHours * (load / 100) * (maintainRatio / 100));
        const manageH = (dailyHours * (load / 100) * (manageRatio / 100));
        const dailySP = (devH / 8) * velocity;

        return { devH, maintainH, manageH, dailySP };
    };

    const exportCSV = (title: string, field: keyof DevAttrs) => {
        const header = ['Sprint', ...filteredDevs.map(d => d.key), 'Total'];
        const csvData: any[] = [];
        const devTotals: Record<string, number> = {};
        const devTotalsNoIP: Record<string, number> = {};

        filteredDevs.forEach(d => { devTotals[d.key] = 0; devTotalsNoIP[d.key] = 0; });

        filteredSprints.forEach(sprint => {
            const isIpSprint = sprint.name.includes('IP');
            const row: any = { 'Sprint': sprint.name };
            let rowTotal = 0;

            filteredDevs.forEach(dev => {
                const capacityDays = getSprintCapacity(sprint.name, dev.key);
                const attrs = getDevAttrs(dev);
                const val = capacityDays * attrs[field];

                const devTeamInSprint = dev.sprintTeams?.[sprint.name] || dev.team;
                const isMember = filterTeam === 'All' || devTeamInSprint === filterTeam;

                if (isMember) {
                    devTotals[dev.key] += val;
                    if (!isIpSprint) devTotalsNoIP[dev.key] += val;
                    if (!dev.specialCase) rowTotal += val;
                }

                row[dev.key] = isMember ? (field === 'dailySP' ? val.toFixed(1) : Math.round(val)) : '';
            });
            row['Total'] = field === 'dailySP' ? rowTotal.toFixed(1) : Math.round(rowTotal);
            csvData.push(row);
        });

        // Totals
        const totalRow: any = { 'Sprint': 'Total' };
        let grandTotal = 0;
        filteredDevs.forEach(dev => {
            totalRow[dev.key] = field === 'dailySP' ? devTotals[dev.key].toFixed(1) : Math.round(devTotals[dev.key]);
            if (!dev.specialCase) grandTotal += devTotals[dev.key];
        });
        totalRow['Total'] = field === 'dailySP' ? grandTotal.toFixed(1) : Math.round(grandTotal);
        csvData.push(totalRow);

        const noIpRow: any = { 'Sprint': 'Ohne IP' };
        let grandTotalNoIP = 0;
        filteredDevs.forEach(dev => {
            noIpRow[dev.key] = field === 'dailySP' ? devTotalsNoIP[dev.key].toFixed(1) : Math.round(devTotalsNoIP[dev.key]);
            if (!dev.specialCase) grandTotalNoIP += devTotalsNoIP[dev.key];
        });
        noIpRow['Total'] = field === 'dailySP' ? grandTotalNoIP.toFixed(1) : Math.round(grandTotalNoIP);
        csvData.push(noIpRow);

        const csv = Papa.unparse({ fields: header, data: csvData });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `capacity_${title.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
    };

    if (loading) return <div className="p-8 text-center text-text-muted">Loading Capacity Dashboard...</div>;

    const tables = [
        { title: "SP Load", field: "dailySP" as const },
        { title: "Dev h", field: "devH" as const },
        { title: "Maintain h", field: "maintainH" as const },
        { title: "Manage h", field: "manageH" as const }
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4 bg-bg-surface p-4 rounded-xl border border-border shadow-sm">
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-text-muted uppercase">Team</label>
                    <select
                        value={filterTeam}
                        onChange={e => setFilterTeam(e.target.value)}
                        className="bg-bg-main border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-accent focus:outline-none"
                    >
                        {teams.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-text-muted uppercase">Sprint</label>
                    <select
                        value={filterSprint}
                        onChange={e => setFilterSprint(e.target.value)}
                        className="bg-bg-main border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-accent focus:outline-none"
                    >
                        {sprintNames.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-8">
                {tables.map(table => (
                    <div key={table.title} className="bg-bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-border bg-gray-50/50">
                            <h3 className="font-semibold text-text-main">{table.title}</h3>
                            <button
                                onClick={() => exportCSV(table.title, table.field)}
                                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-brand-primary bg-brand-primary/10 rounded-lg hover:bg-brand-primary/20 transition-colors"
                            >
                                <Download size={14} />
                                Export CSV
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-border text-left">
                                        <th className="px-4 py-3 font-medium text-text-muted min-w-[120px]">Sprint</th>
                                        {filteredDevs.map(d => (
                                            <th key={d.key} className="px-4 py-3 font-medium text-text-muted text-center" title={d.name}>{d.key}</th>
                                        ))}
                                        <th className="px-4 py-3 font-bold text-text-main text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    <DashboardTableBody
                                        sprints={filteredSprints}
                                        developers={filteredDevs}
                                        field={table.field}
                                        filterTeam={filterTeam}
                                        getSprintCapacity={getSprintCapacity}
                                        getDevAttrs={getDevAttrs}
                                    />
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Extracted for performance/cleanness
const DashboardTableBody: React.FC<{
    sprints: SprintData[];
    developers: CapacityDeveloper[];
    field: keyof DevAttrs;
    filterTeam: string;
    getSprintCapacity: (s: string, k: string) => number;
    getDevAttrs: (d: CapacityDeveloper) => DevAttrs;
}> = ({ sprints, developers, field, filterTeam, getSprintCapacity, getDevAttrs }) => {
    const format = (n: number) => field === 'dailySP' ? n.toFixed(1) : Math.round(n);

    // Calculate totals
    const devTotals: Record<string, number> = {};
    const devTotalsNoIP: Record<string, number> = {};
    developers.forEach(d => { devTotals[d.key] = 0; devTotalsNoIP[d.key] = 0; });

    let grandTotal = 0;
    let grandTotalNoIP = 0;

    const rows = sprints.map(sprint => {
        const isIpSprint = sprint.name.includes('IP');
        let rowTotal = 0;

        const cells = developers.map(dev => {
            const capacityDays = getSprintCapacity(sprint.name, dev.key);
            const attrs = getDevAttrs(dev);
            const val = capacityDays * attrs[field];

            const devTeamInSprint = dev.sprintTeams?.[sprint.name] || dev.team;
            const isMember = filterTeam === 'All' || devTeamInSprint === filterTeam;

            if (isMember) {
                devTotals[dev.key] += val;
                if (!isIpSprint) devTotalsNoIP[dev.key] += val;
                if (!dev.specialCase) rowTotal += val;
            }

            return (
                <td key={dev.key} className={`px-4 py-2 text-center ${dev.specialCase ? 'text-red-500 font-bold' : 'text-text-main'}`}>
                    {isMember ? format(val) : <span className="text-gray-300">-</span>}
                </td>
            );
        });

        return (
            <tr key={sprint.name} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-2 font-medium text-text-main">{sprint.name}</td>
                {cells}
                <td className="px-4 py-2 text-right font-bold text-text-main">{format(rowTotal)}</td>
            </tr>
        );
    });

    // Totals
    const totalCells = developers.map(dev => {
        if (!dev.specialCase) grandTotal += devTotals[dev.key];
        return (
            <td key={dev.key} className={`px-4 py-2 text-center font-bold ${dev.specialCase ? 'text-red-500' : 'text-text-main'}`}>
                {format(devTotals[dev.key])}
            </td>
        );
    });

    const noIpCells = developers.map(dev => {
        if (!dev.specialCase) grandTotalNoIP += devTotalsNoIP[dev.key];
        return (
            <td key={dev.key} className={`px-4 py-2 text-center font-bold ${dev.specialCase ? 'text-red-500' : 'text-text-main'}`}>
                {format(devTotalsNoIP[dev.key])}
            </td>
        );
    });

    return (
        <>
            {rows}
            <tr className="bg-blue-50/50 font-bold border-t-2 border-blue-100">
                <td className="px-4 py-2">Total</td>
                {totalCells}
                <td className="px-4 py-2 text-right">{format(grandTotal)}</td>
            </tr>
            <tr className="bg-emerald-50/50 font-bold">
                <td className="px-4 py-2">Ohne IP</td>
                {noIpCells}
                <td className="px-4 py-2 text-right">{format(grandTotalNoIP)}</td>
            </tr>
        </>
    );
};

export default CapacityDashboard;
