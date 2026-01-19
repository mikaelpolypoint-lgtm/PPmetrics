import React, { useEffect, useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { CapacityService } from '../../services/CapacityService';
import type { CapacityDeveloper, CapacityAvailability } from '../../types/capacity';
import { Download } from 'lucide-react';
import Papa from 'papaparse';
// Removed InfoTooltip import

interface SprintData {
    name: string;
    rows: CapacityAvailability[];
}

interface DevAttrs {
    devH: number;
    maintainH: number;
    manageH: number;
    dailySP: number;
    dailyCHF: number;
    dailyDevCHF: number;
    dailyMainCHF: number;
    dailyManageCHF: number;
}

const CapacityTeamDetails: React.FC = () => {
    const { currentPI } = useData();
    const [developers, setDevelopers] = useState<CapacityDeveloper[]>([]);
    const [availabilities, setAvailabilities] = useState<CapacityAvailability[]>([]);
    const [loading, setLoading] = useState(true);
    // const [filterTeam, setFilterTeam] = useState('All'); // No longer needed
    const [filterSprint, setFilterSprint] = useState('All');

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                await CapacityService.ensureDefaults(currentPI);
                const [devs, avails] = await Promise.all([
                    CapacityService.getDevelopers(currentPI),
                    CapacityService.getAvailabilities(currentPI)
                ]);

                if (avails.length === 0) {
                    await CapacityService.initDefaultSprints(currentPI);
                    const newAvails = await CapacityService.getAvailabilities(currentPI);
                    setAvailabilities(newAvails);
                } else {
                    setAvailabilities(avails);
                }

                devs.sort((a, b) => (a.key || '').localeCompare(b.key || ''));
                setDevelopers(devs);
            } catch (error) {
                console.error("Error loading team capacity details:", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [currentPI]);

    const { sprints, teams, sprintNames, filteredDevs, filteredSprints } = useMemo(() => {
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

        // Get unique teams from developers
        const uniqueTeams = Array.from(new Set(developers.map(d => d.team).filter(Boolean))).sort();
        const sprintNamesList = ['All', ...sortedSprints.map(s => s.name)];

        const fSprints = filterSprint === 'All' ? sortedSprints : sortedSprints.filter(s => s.name === filterSprint);

        // We want all devs, filtered only by sprint visibility logic if needed, but generally correct
        const fDevs = developers;

        return {
            sprints: sprintsMap,
            sprintsList: sortedSprints,
            teams: uniqueTeams,
            sprintNames: sprintNamesList,
            filteredDevs: fDevs,
            filteredSprints: fSprints
        };
    }, [developers, availabilities, filterSprint]);

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

        const productiveH = devH + maintainH;
        const totalCost = (Number(dev.internalCost) || 0) * 1.33;
        let dailyCHF = 0;
        let dailyDevCHF = 0;
        let dailyMainCHF = 0;
        let dailyManageCHF = 0;

        if (productiveH > 0 && load > 0) {
            dailyCHF = (devH + (manageH * devH / productiveH)) * totalCost;

            const loadFactor = load / 100;
            const rawCost = Number(dev.internalCost) || 0;

            dailyDevCHF = (devH / loadFactor) * rawCost;
            dailyMainCHF = (maintainH / loadFactor) * rawCost;
            dailyManageCHF = (manageH / loadFactor) * rawCost;
        }

        return { devH, maintainH, manageH, dailySP, dailyCHF, dailyDevCHF, dailyMainCHF, dailyManageCHF };
    };

    const format = (n: number, field: keyof DevAttrs) => {
        if (field === 'dailySP') return n.toFixed(1);
        if (['dailyCHF', 'dailyDevCHF', 'dailyMainCHF', 'dailyManageCHF'].includes(field)) {
            return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
        }
        return Math.round(n).toString();
    };

    const exportCSV = (title: string, field: keyof DevAttrs) => {
        const header = ['Sprint', ...teams, 'Total', 'Ohne IP Total'];
        const csvData: any[] = [];

        filteredSprints.forEach(sprint => {
            const row: any = { 'Sprint': sprint.name };
            let sprintTotal = 0;
            let sprintTotalNoIP = 0;
            const isIpSprint = sprint.name.includes('IP');

            teams.forEach(team => {
                let teamTotal = 0;
                filteredDevs.forEach(dev => {
                    const devTeamInSprint = dev.sprintTeams?.[sprint.name] || dev.team;
                    if (devTeamInSprint === team && !dev.specialCase) {
                        const capacityDays = getSprintCapacity(sprint.name, dev.key);
                        const attrs = getDevAttrs(dev);
                        teamTotal += capacityDays * attrs[field];
                    }
                });
                row[team] = format(teamTotal, field);
                sprintTotal += teamTotal;
                if (!isIpSprint) {
                    sprintTotalNoIP += teamTotal;
                }
            });

            row['Total'] = format(sprintTotal, field);
            row['Ohne IP Total'] = format(sprintTotalNoIP, field); // Add Ohne IP Total for the row
            csvData.push(row);
        });

        const csv = Papa.unparse({ fields: header, data: csvData });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `team_capacity_${title.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
    };

    if (loading) return <div className="p-8 text-center text-text-muted">Loading Team Capacity...</div>;

    // Tables configuration
    const tables = [
        { title: "SP Load", field: "dailySP" as const },
        { title: "Product Budget", field: "dailyCHF" as const },
        { title: "Daily Dev CHF", field: "dailyDevCHF" as const },
        { title: "Daily Main CHF", field: "dailyMainCHF" as const },
        { title: "Daily Manage CHF", field: "dailyManageCHF" as const },
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <h1 className="text-2xl font-bold text-gray-800">PIB Team Capacity</h1>

            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 text-sm text-blue-800">
                <p>
                    <strong>PIB Team Capacity</strong> provides a granular view of capacity and costs aggregated by <strong>Team</strong>.
                    Each column represents a team, allowing for quick comparison of <strong>Store Points Load</strong> and <strong>Financial Budget</strong> distribution across different teams per sprint.
                </p>
            </div>

            <div className="flex items-center gap-4 bg-bg-surface p-4 rounded-xl border border-border shadow-sm">
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
                            <h3 className="font-semibold text-text-main flex items-center">
                                {table.title}
                            </h3>
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
                                        {teams.map(team => (
                                            <th key={team} className="px-4 py-3 font-bold text-text-main text-right">{team}</th>
                                        ))}
                                        <th className="px-4 py-3 font-bold text-text-main text-right bg-gray-100">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {filteredSprints.map(sprint => {
                                        let rowTotal = 0;
                                        const rowTeamTotals: Record<string, number> = {};

                                        // Calculate for each team
                                        teams.forEach(team => {
                                            let teamTotal = 0;
                                            filteredDevs.forEach(dev => {
                                                const devTeamInSprint = dev.sprintTeams?.[sprint.name] || dev.team;
                                                if (devTeamInSprint === team && !dev.specialCase) {
                                                    const capacityDays = getSprintCapacity(sprint.name, dev.key);
                                                    const attrs = getDevAttrs(dev);
                                                    teamTotal += capacityDays * attrs[table.field];
                                                }
                                            });
                                            rowTeamTotals[team] = teamTotal;
                                            rowTotal += teamTotal;
                                        });

                                        return (
                                            <tr key={sprint.name} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-4 py-2 font-medium text-text-main">{sprint.name}</td>
                                                {teams.map(team => (
                                                    <td key={team} className="px-4 py-2 text-right text-text-main">
                                                        {format(rowTeamTotals[team], table.field)}
                                                    </td>
                                                ))}
                                                <td className="px-4 py-2 text-right font-bold text-text-main bg-gray-50">{format(rowTotal, table.field)}</td>
                                            </tr>
                                        );
                                    })}
                                    {/* Grand Totals */}
                                    {(() => {
                                        const totalMap: Record<string, number> = {};
                                        const noIpMap: Record<string, number> = {};
                                        let grandTotal = 0;
                                        let grandTotalNoIP = 0;

                                        teams.forEach(t => { totalMap[t] = 0; noIpMap[t] = 0; });

                                        filteredSprints.forEach(sprint => {
                                            const isIpSprint = sprint.name.includes('IP');

                                            filteredDevs.forEach(dev => {
                                                if (dev.specialCase) return;

                                                const devTeamInSprint = dev.sprintTeams?.[sprint.name] || dev.team;
                                                if (teams.includes(devTeamInSprint || '')) {
                                                    const capacityDays = getSprintCapacity(sprint.name, dev.key);
                                                    const attrs = getDevAttrs(dev);
                                                    const val = capacityDays * attrs[table.field];

                                                    const teamKey = devTeamInSprint!;
                                                    totalMap[teamKey] += val;

                                                    if (!isIpSprint) {
                                                        noIpMap[teamKey] += val;
                                                    }
                                                }
                                            });
                                        });

                                        // Calculate overall grand totals from the maps
                                        grandTotal = Object.values(totalMap).reduce((sum, val) => sum + val, 0);
                                        grandTotalNoIP = Object.values(noIpMap).reduce((sum, val) => sum + val, 0);


                                        return (
                                            <>
                                                <tr className="bg-blue-50/50 font-bold border-t-2 border-blue-100">
                                                    <td className="px-4 py-2">Total</td>
                                                    {teams.map(team => (
                                                        <td key={team} className="px-4 py-2 text-right">{format(totalMap[team], table.field)}</td>
                                                    ))}
                                                    <td className="px-4 py-2 text-right bg-blue-100">{format(grandTotal, table.field)}</td>
                                                </tr>
                                                <tr className="bg-emerald-50/50 font-bold">
                                                    <td className="px-4 py-2">Ohne IP</td>
                                                    {teams.map(team => (
                                                        <td key={team} className="px-4 py-2 text-right">{format(noIpMap[team], table.field)}</td>
                                                    ))}
                                                    <td className="px-4 py-2 text-right bg-emerald-100">{format(grandTotalNoIP, table.field)}</td>
                                                </tr>
                                            </>
                                        )
                                    })()}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CapacityTeamDetails;
