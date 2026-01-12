import React from 'react';
import type { CapacityDeveloper, CapacityAvailability } from '../../types/capacity';

interface SprintData {
    name: string;
    rows: CapacityAvailability[];
}

interface DevAttrs {
    devH: number;
    maintainH: number;
    manageH: number;
    dailySP: number;
    dailyCHF: number; // Product Budget
    dailyDevCHF: number;
    dailyMainCHF: number;
    dailyManageCHF: number;
}

const DashboardTableBody: React.FC<{
    sprints: SprintData[];
    developers: CapacityDeveloper[];
    field: keyof DevAttrs;
    filterTeam: string;
    getSprintCapacity: (s: string, k: string) => number;
    getDevAttrs: (d: CapacityDeveloper) => DevAttrs;
}> = ({ sprints, developers, field, filterTeam, getSprintCapacity, getDevAttrs }) => {
    const format = (n: number) => {
        if (field === 'dailySP') return n.toFixed(1);
        if (['dailyCHF', 'dailyDevCHF', 'dailyMainCHF', 'dailyManageCHF'].includes(field)) {
            return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
        }
        return Math.round(n).toString();
    };

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

export default DashboardTableBody;

// Types needed by consumers but not exported from here usually
export type { SprintData, DevAttrs };
