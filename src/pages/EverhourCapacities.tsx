import React, { useState, useRef, useEffect } from 'react';
import { useData } from '../context/DataContext';
import PageHeader from '../components/PageHeader';
import Papa from 'papaparse';
import { Upload, AlertCircle, FileText } from 'lucide-react';
import { CapacityService } from '../services/CapacityService';
import type { CapacityDeveloper, CapacityAvailability } from '../types/capacity';

const CATEGORY_MAPPING: Record<string, string> = {
    'ProductMaintain': 'Maintain',
    'ProductDevelop': 'Dev',
    'ProductDeploy': 'Dev',
    'ProductQuality': 'Maintain',
    'Services': 'Maintain',
    'ProductDesign': 'Dev',
};

const DEFAULT_CATEGORY = 'Manage';

type Category = 'Dev' | 'Maintain' | 'Manage';
const CATEGORIES: Category[] = ['Dev', 'Maintain', 'Manage'];

const SPRINT_KEYS = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'];

interface TeamData {
    rates: Record<string, number>; // TeamId -> Rate
    devMap: Record<string, string>; // Member Name -> TeamId
    dateToSprintMap: Record<string, string>; // 'YYYY-MM-DD' -> 'S1' (suffix only)
}

interface TableRow {
    category: Category;
    sprints: Record<string, number>; // 'S1' -> hours
    total: number;
    chf: number;
}

const EverhourCapacities: React.FC = () => {
    const { currentPI, teams, stories } = useData();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [error, setError] = useState<string | null>(null);
    const [results, setResults] = useState<Record<string, TableRow[]>>({}); // TeamId -> Rows
    const [metaData, setMetaData] = useState<TeamData>({ rates: {}, devMap: {}, dateToSprintMap: {} });
    const [loading, setLoading] = useState(false);

    // Initial Data Load (Rates, Dev Mapping, Calendar)
    useEffect(() => {
        const initData = async () => {
            setLoading(true);
            try {
                // 1. Load Capacity Config
                await CapacityService.initDefaultSprints(currentPI);
                const [devs, avails] = await Promise.all([
                    CapacityService.getDevelopers(currentPI),
                    CapacityService.getAvailabilities(currentPI)
                ]) as [CapacityDeveloper[], CapacityAvailability[]];

                // 2. Build Date -> Sprint Map
                const dateMap: Record<string, string> = {};
                avails.forEach((row) => {
                    // Extract S1, S2, IP or use suffix replacement
                    // We want keys like "S1", "S2" ... or maybe full sprint name.
                    // The prompt asks for column "Sprint 1", "Sprint 2"...
                    // Let's store the suffix "S1", "S2" ...
                    // If IP, handle as S6? Or separate? 
                    // Prompt says "Column 3-7 (sprint 2 ... sprint 6)". Usually S6 is IP or real S6.
                    // Let's normalize row.sprint to just "S1", "S2"...
                    if (row.date) {
                        // remove PI prefix
                        const suffix = row.sprint.replace(`${currentPI}-`, '');
                        dateMap[row.date] = suffix;
                    }
                });

                // 3. Build Developer -> Team Map
                // Name match might need trim
                const dMap: Record<string, string> = {};
                devs.forEach(d => {
                    if (d.name) dMap[d.name.trim()] = d.team;
                });

                // 4. Calculate Team Rates (Copied Logic from Teams.tsx)
                const rates: Record<string, number> = {};

                // 4a. Calc Total Dev Hours per Team (excluding IP typically, but for Rate calc usually we stick to standard capacity)
                const teamHours: Record<string, number> = {};
                teams.forEach(t => teamHours[t.name] = 0);

                // Re-process avails to group by sprint
                const sprintsMap = new Map<string, CapacityAvailability[]>();
                avails.forEach(row => {
                    if (!sprintsMap.has(row.sprint)) sprintsMap.set(row.sprint, []);
                    sprintsMap.get(row.sprint)!.push(row);
                });
                // Filter out IP for rate calculation divisor? Teams.tsx does: !sprintName.includes('IP')
                const validSprints = Array.from(sprintsMap.entries()).filter(([s]) => !s.includes('IP'));

                devs.forEach(dev => {
                    if (dev.specialCase) return;
                    const dailyHours = Number(dev.dailyHours) || 8;
                    const load = Number(dev.load) || 90;
                    const developRatio = Number(dev.developRatio) || 0;
                    const devH = (dailyHours * (load / 100) * (developRatio / 100));

                    validSprints.forEach(([sprintName, rows]) => {
                        const capacityDays = rows.reduce((sum, row) => {
                            const val = row[dev.key];
                            const numericVal = (val === undefined || val === null || val === '') ? 1 : Number(val);
                            return sum + (isNaN(numericVal) ? 0 : numericVal);
                        }, 0);
                        const hours = capacityDays * devH;
                        const teamInSprint = dev.sprintTeams?.[sprintName] || dev.team;
                        if (teamInSprint) {
                            teamHours[teamInSprint] = (teamHours[teamInSprint] || 0) + hours;
                            if (teamInSprint === 'Hydrogen 1') teamHours['H1'] = (teamHours['H1'] || 0) + hours;
                        }
                    });
                });

                // 4b. Calc PIP Plan and Rate
                teams.forEach(team => {
                    const teamStories = stories.filter(s => s.pi === currentPI && (s.team === team.name || (team.name === 'H1' && s.team === 'H1')));
                    const spPlanned = teamStories.reduce((sum, s) => sum + (s.sp || 0), 0);
                    const pipPlan = spPlanned * team.spValue;
                    const devH = teamHours[team.name] || 0;

                    if (devH > 0) rates[team.name] = pipPlan / devH;
                    else rates[team.name] = 0;
                });

                setMetaData({ rates, devMap: dMap, dateToSprintMap: dateMap });

            } catch (e: any) {
                console.error("Init Error", e);
                setError("Failed to initialize capacity data: " + e.message);
            } finally {
                setLoading(false);
            }
        };

        if (currentPI) initData();
    }, [currentPI, teams, stories]);

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            if (!text) return;

            // Check if we need to skip lines
            // User report: "values ... start at row 4", "in row 3 the attributes are titled"
            // This means we need to skip the first 2 rows if the file has that metadata header.

            const lines = text.split(/\r\n|\n|\r/);
            let csvText = text;

            // Heuristic: If line 1 doesn't look like a header (e.g. doesn't start with "Member"),
            // and line 3 does, then skip 2 lines.
            if (lines.length > 2) {
                const firstLine = lines[0].trim();
                const thirdLine = lines[2].trim();

                // If first line DOES NOT start with "Member" AND third line DOES
                // We assume it's the report format.
                if (!firstLine.startsWith('Member') && thirdLine.startsWith('Member')) {
                    // Rejoin from line 3 onwards
                    // We slice 2 lines off
                    csvText = lines.slice(2).join('\n');
                }
            }

            Papa.parse(csvText, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    try {
                        processCSV(results.data);
                    } catch (e: any) {
                        setError("CSV Processing Error: " + e.message);
                    }
                },
                error: (err: any) => setError("CSV Parse Error: " + err.message)
            });
        };
        reader.readAsText(file);

        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const processCSV = (data: any[]) => {
        setError(null);
        // Structure: Team -> Category -> Sprint -> Hours
        const agg: Record<string, Record<Category, Record<string, number>>> = {};

        // Initialize structure for all known teams
        teams.forEach(t => {
            agg[t.name] = {
                'Dev': {}, 'Maintain': {}, 'Manage': {}
            };
        });

        const { devMap, dateToSprintMap } = metaData;

        data.forEach((row: any) => {
            // Columns: Member, Everhour Capacity, Time, Day
            // Using "find" logic locally since column names might vary slightly? 
            // "Member", "Everhour Capacity", "Time", "Day" as per prompt.

            const member = row['Member'];
            const capacityType = row['Everhour Capacity'];
            const time = parseFloat(row['Time']);
            const day = row['Day']; // YYYY-MM-DD

            if (!member || !day || isNaN(time)) return;

            // Map Member -> Team
            let team = devMap[member.trim()];
            if (!team) {
                // Try looking up 'Hydrogen 1' -> 'H1'
                // Or exact match failed
                return; // specific user request: "should map with the Name"
            }
            if (team === 'Hydrogen 1') team = 'H1';

            // Verify Team exists in our aggregation (might be a deactivated team?)
            if (!agg[team]) agg[team] = { 'Dev': {}, 'Maintain': {}, 'Manage': {} };

            // Map Capacity
            let cat: Category = DEFAULT_CATEGORY as Category;
            if (capacityType && CATEGORY_MAPPING[capacityType]) {
                cat = CATEGORY_MAPPING[capacityType] as Category;
            } else {
                cat = 'Manage';
            }

            // Map Date -> Sprint
            let sprint = dateToSprintMap[day]; // e.g., "S1" or "S1-Dev" (no, we stripped prefix)
            if (!sprint) {
                // Date outside of PI range?
                return;
            }
            // Normalize IP to S6 if needed or keep as IP?
            // Prompt asks for Sprint 1..6. Assuming IP is S6 or falls into S6 bucket.
            // If sprint is "IP", map to S6? 
            // Typically "Innovation and Planning" is the last sprint.
            if (sprint === 'IP') sprint = 'S6';

            // Accumulate
            if (!agg[team][cat][sprint]) agg[team][cat][sprint] = 0;
            agg[team][cat][sprint] += time;
        });

        // Convert to TableRows
        const teamRows: Record<string, TableRow[]> = {};

        teams.forEach(t => {
            const tData = agg[t.name];
            if (!tData) return;

            const rate = metaData.rates[t.name] || 0;
            const rows: TableRow[] = [];

            CATEGORIES.forEach(cat => {
                const sprintData = tData[cat];
                const total = Object.values(sprintData).reduce((a, b) => a + b, 0);
                rows.push({
                    category: cat,
                    sprints: sprintData,
                    total: total,
                    chf: total * rate
                });
            });
            teamRows[t.name] = rows;
        });

        setResults(teamRows);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <PageHeader
                title={`${currentPI} Everhour Capacities`}
                description="Import and analyze Everhour actuals by capacity category."
                actions={
                    <div className="relative">
                        <input
                            type="file"
                            accept=".csv"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            className="hidden"
                            id="eh-cap-upload"
                        />
                        <label
                            htmlFor="eh-cap-upload"
                            className="btn btn-primary flex items-center gap-2 cursor-pointer"
                        >
                            <Upload size={18} /> Import CSV
                        </label>
                    </div>
                }
            />

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-3">
                    <AlertCircle size={20} />
                    {error}
                </div>
            )}

            {Object.keys(results).length === 0 && !loading && (
                <div className="card p-12 text-center text-text-muted">
                    <FileText size={48} className="mx-auto mb-4 opacity-20" />
                    <p>Import a CSV file to view capacity breakdown.</p>
                </div>
            )}

            {teams.map(team => {
                const teamData = results[team.name];
                if (!teamData) return null;
                const rate = metaData.rates[team.name] || 0;

                return (
                    <div key={team.id} className="card overflow-hidden">
                        <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-brand-primary">{team.name}</h3>
                            <span className="text-sm text-text-muted font-mono bg-white px-2 py-1 rounded border border-gray-200">
                                Rate: {rate.toFixed(2)} CHF/h
                            </span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left border-collapse">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-3 font-semibold text-gray-700 w-32">Capacity</th>
                                        {SPRINT_KEYS.map(s => (
                                            <th key={s} className="px-6 py-3 font-semibold text-gray-600 text-right w-24">{s}</th>
                                        ))}
                                        <th className="px-6 py-3 font-bold text-gray-800 text-right border-l border-gray-200 bg-gray-50">Sum</th>
                                        <th className="px-6 py-3 font-bold text-gray-800 text-right bg-gray-50">CHF</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {teamData.map((row) => (
                                        <tr key={row.category} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-3 font-medium text-gray-700">{row.category}</td>
                                            {SPRINT_KEYS.map(s => (
                                                <td key={s} className="px-6 py-3 text-right font-mono text-gray-600">
                                                    {row.sprints[s] ? row.sprints[s].toFixed(2) : '-'}
                                                </td>
                                            ))}
                                            <td className="px-6 py-3 text-right font-bold text-gray-900 font-mono border-l border-gray-100 bg-gray-50/30">
                                                {row.total.toFixed(2)}
                                            </td>
                                            <td className="px-6 py-3 text-right font-medium text-gray-900 font-mono bg-gray-50/30">
                                                {row.chf.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    ))}
                                    {/* Total Row for Team? Optional but good for check */}
                                    <tr className="bg-brand-primary/5 font-bold border-t border-brand-primary/20">
                                        <td className="px-6 py-3 text-brand-primary">Total</td>
                                        {SPRINT_KEYS.map(s => {
                                            const colSum = teamData.reduce((sum, r) => sum + (r.sprints[s] || 0), 0);
                                            return (
                                                <td key={s} className="px-6 py-3 text-right font-mono text-brand-primary">
                                                    {colSum > 0 ? colSum.toFixed(2) : '-'}
                                                </td>
                                            );
                                        })}
                                        <td className="px-6 py-3 text-right font-mono text-brand-primary border-l border-brand-primary/10">
                                            {teamData.reduce((sum, r) => sum + r.total, 0).toFixed(2)}
                                        </td>
                                        <td className="px-6 py-3 text-right font-mono text-brand-primary">
                                            {teamData.reduce((sum, r) => sum + r.chf, 0).toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default EverhourCapacities;
