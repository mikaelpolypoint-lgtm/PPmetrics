import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import PageHeader from '../components/PageHeader';
import { Download } from 'lucide-react';

const SPRINTS = ['Sprint 1', 'Sprint 2', 'Sprint 3', 'Sprint 4', 'Sprint 5', 'Sprint 6'];

type MetricType = 'plan' | 'actual';


const SprintMetrics: React.FC = () => {
    const { teams, stories, currentPI, sprintMetrics, saveSprintMetrics } = useData();
    const [selectedTeamId, setSelectedTeamId] = useState<string>('');

    // Local state stores all combined values in a simplified map for easy access in this view
    // Key: `${sprintIdx}-${metric}-${type}`
    const [localMetrics, setLocalMetrics] = useState<Record<string, number>>({});

    // Select first team by default
    useEffect(() => {
        if (teams.length > 0 && !selectedTeamId) {
            setSelectedTeamId(teams[0].id);
        }
    }, [teams, selectedTeamId]);

    // Load metrics for selected team
    useEffect(() => {
        if (!selectedTeamId) return;

        const docId = `${selectedTeamId}_${currentPI}`;
        const metricDoc = sprintMetrics.find(d => d.id === docId);

        if (metricDoc) {
            setLocalMetrics(metricDoc.values);
        } else {
            setLocalMetrics({});
        }
    }, [selectedTeamId, currentPI, sprintMetrics]);

    const activeTeam = teams.find(t => t.id === selectedTeamId) || teams[0];

    // Generic state updater with persistence
    const updateMetric = (sprintIdx: number, metric: string, type: MetricType, val: string) => {
        if (!selectedTeamId) return;

        const numVal = val === '' ? NaN : parseFloat(val);
        const key = `${sprintIdx}-${metric}-${type}`;

        // Optimistic update
        const newMetrics = { ...localMetrics };
        if (isNaN(numVal)) delete newMetrics[key];
        else newMetrics[key] = numVal;

        setLocalMetrics(newMetrics);

        // Persist
        const docId = `${selectedTeamId}_${currentPI}`;
        saveSprintMetrics({
            id: docId,
            teamId: selectedTeamId,
            pi: currentPI,
            values: newMetrics
        });
    };

    // Accessors
    const getVal = (sprintIdx: number, metric: string, type: MetricType): number | '' => {
        const key = `${sprintIdx}-${metric}-${type}`;
        return localMetrics[key] ?? '';
    };

    // --- Capacity Logic ---
    const calculateCapacityTotal = (sprintIdx: number, type: MetricType): number => {
        const dev = getVal(sprintIdx, 'dev', type) || 0;
        const maintain = getVal(sprintIdx, 'maintain', type) || 0;
        const manage = getVal(sprintIdx, 'manage', type) || 0;
        const absence = getVal(sprintIdx, 'absence', type) || 0;
        return (dev as number) + (maintain as number) + (manage as number) + (absence as number);
    };

    const calculateReportedRatio = (sprintIdx: number): string => {
        const totalPlan = calculateCapacityTotal(sprintIdx, 'plan');
        const totalActual = calculateCapacityTotal(sprintIdx, 'actual');
        if (!totalPlan) return '';
        return ((totalActual / totalPlan) * 100).toFixed(0) + '%';
    };

    // --- Derived Scope Metrics ---
    const calculateSPAcceptanceRatio = (sprintIdx: number): string => {
        const actual = getVal(sprintIdx, 'sp', 'actual');
        const plan = getVal(sprintIdx, 'sp', 'plan');
        if (!plan || !actual) return '';
        return (((actual as number) / (plan as number)) * 100).toFixed(0) + '%';
    };

    const calculateVelocity = (sprintIdx: number): string => {
        const actualSP = getVal(sprintIdx, 'sp', 'actual');
        const actualDevHours = getVal(sprintIdx, 'dev', 'actual');

        if (!actualSP || !actualDevHours) return '';
        const manDays = (actualDevHours as number) / 8;
        if (manDays === 0) return '';
        return ((actualSP as number) / manDays).toFixed(2);
    };

    const calculateIssuesAcceptanceRatio = (sprintIdx: number): string => {
        const actual = getVal(sprintIdx, 'issues', 'actual');
        const plan = getVal(sprintIdx, 'issues', 'plan');
        if (!plan || !actual) return '';
        return (((actual as number) / (plan as number)) * 100).toFixed(0) + '%';
    };

    const calculatePIProgress = (sprintIdx: number): string => {
        if (!activeTeam) return '';
        const teamStories = stories.filter(s =>
            s.pi === currentPI &&
            (s.team === activeTeam.name || (activeTeam.name === 'Hydrogen 1' && s.team === 'H1'))
        );
        const totalPlannedSP = teamStories.reduce((sum, s) => sum + (s.sp || 0), 0);
        if (totalPlannedSP === 0) return '0%';

        let sumActualSP = 0;
        for (let i = 0; i <= sprintIdx; i++) {
            sumActualSP += (getVal(i, 'sp', 'actual') as number) || 0;
        }
        return ((sumActualSP / totalPlannedSP) * 100).toFixed(0) + '%';
    };

    // --- Export CSV ---
    const exportCSV = () => {
        if (!activeTeam) return;
        const teamName = activeTeam.name;
        const piName = currentPI;

        let csvContent = `Team: ${teamName}, PI: ${piName}\n\n`;

        // ... (Header logic)
        let header = "Metric";
        SPRINTS.forEach(sprint => header += `,${sprint} Plan,${sprint} Actual`);
        csvContent += header + "\n";
        const formatValue = (val: number | string) => (val === '' || val === undefined || val === null) ? '-' : val;

        // Rows helper
        const addRow = (label: string, metric: string, isCalc = false, calcFn?: (i: number) => string) => {
            let row = `"${label}"`;
            SPRINTS.forEach((_, i) => {
                if (isCalc && calcFn) {
                    row += `,${formatValue(calcFn(i))},`;
                } else {
                    row += `,${formatValue(getVal(i, metric as any, 'plan'))},${formatValue(getVal(i, metric as any, 'actual'))}`;
                }
            });
            csvContent += row + "\n";
        };

        csvContent += "\nCapacity\n";
        addRow("Dev (h)", 'dev');
        addRow("Maintain (h)", 'maintain');
        addRow("Manage (h)", 'manage');
        addRow("Absence (h)", 'absence');

        // Total row
        let totalRow = `"Total (h)"`;
        SPRINTS.forEach((_, i) => totalRow += `,${formatValue(calculateCapacityTotal(i, 'plan'))},${formatValue(calculateCapacityTotal(i, 'actual'))}`);
        csvContent += totalRow + "\n";

        addRow("Reported % (result/plan)", '', true, calculateReportedRatio);

        csvContent += "\nScope\n";
        addRow("Storypoints", 'sp');
        addRow("SP acceptance ratio", '', true, calculateSPAcceptanceRatio);
        addRow("PI Progress", '', true, calculatePIProgress);
        addRow("Velocity", '', true, calculateVelocity);
        addRow("Issues", 'issues');
        addRow("Issue acceptance ratio", '', true, calculateIssuesAcceptanceRatio);

        csvContent += "\nQuality\n";
        addRow("Bugs created in sprint", 'bugsCreated');
        addRow("Bugs closed in sprint", 'bugsClosed');
        addRow("Bugs currently open", 'bugsOpen');
        addRow("Defect detection ratio", 'defectRatio');
        addRow("Cycle time bugs", 'cycleTimeBugs');
        addRow("Cycle time collabs", 'cycleTimeCollabs');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `${teamName}_${piName}_SprintMetrics.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <PageHeader
                title="Sprint Metrics"
                description="Track capacity, scope, and quality metrics per team across the PI."
                actions={
                    <button onClick={exportCSV} className="btn btn-secondary flex items-center gap-2">
                        <Download size={18} /> Export CSV
                    </button>
                }
            />

            {/* Team Tabs */}
            <div className="border-b border-gray-200">
                <div className="flex gap-8 overflow-x-auto pb-px">
                    {teams.map(team => (
                        <button
                            key={team.id}
                            onClick={() => setSelectedTeamId(team.id)}
                            className={`pb-4 px-1 font-medium text-sm transition-all whitespace-nowrap ${selectedTeamId === team.id
                                ? 'text-brand-primary border-b-2 border-brand-primary'
                                : 'text-text-muted hover:text-text-main border-b-2 border-transparent hover:border-gray-200'
                                }`}
                        >
                            {team.name}
                        </button>
                    ))}
                </div>
            </div>

            {activeTeam ? (
                <div className="flex flex-col gap-10">
                    {/* Table 1: Capacity */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-brand-primary">Capacity</h3>
                            <span className="text-xs font-mono text-text-muted uppercase tracking-wider">Metrics</span>
                        </div>

                        <div className="overflow-x-auto">
                            <MetricTable>
                                <InputRow label="Dev (h)" sprints={SPRINTS}
                                    getValue={(i, type) => getVal(i, 'dev', type)}
                                    onChange={(i, type, v) => updateMetric(i, 'dev', type, v)} />
                                <InputRow label="Maintain (h)" sprints={SPRINTS}
                                    getValue={(i, type) => getVal(i, 'maintain', type)}
                                    onChange={(i, type, v) => updateMetric(i, 'maintain', type, v)} />
                                <InputRow label="Manage (h)" sprints={SPRINTS}
                                    getValue={(i, type) => getVal(i, 'manage', type)}
                                    onChange={(i, type, v) => updateMetric(i, 'manage', type, v)} />
                                <InputRow label="Absence (h)" sprints={SPRINTS}
                                    getValue={(i, type) => getVal(i, 'absence', type)}
                                    onChange={(i, type, v) => updateMetric(i, 'absence', type, v)} />

                                {/* Calculated Total Row */}
                                <tr className="bg-gray-50/50 font-semibold group hover:bg-gray-100/50 transition-colors border-t-2 border-gray-100">
                                    <td className="px-6 py-3 text-gray-800 border-r border-gray-100 sticky left-0 z-10 bg-gray-50 group-hover:bg-gray-100/50">Total (h)</td>
                                    {SPRINTS.map((_, i) => (
                                        <td key={i} className="p-0 border-l border-gray-100 h-full">
                                            <div className="grid grid-cols-2 h-full divide-x divide-gray-100 text-center">
                                                <div className="py-3 px-2 text-gray-700">{calculateCapacityTotal(i, 'plan') || '-'}</div>
                                                <div className="py-3 px-2 text-gray-700">{calculateCapacityTotal(i, 'actual') || '-'}</div>
                                            </div>
                                        </td>
                                    ))}
                                </tr>

                                <CalculatedRow label="Reported % (result/plan)" sprints={SPRINTS} getValue={calculateReportedRatio} highlight />
                            </MetricTable>
                        </div>
                    </div>

                    {/* Table 2: Scope */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-brand-primary">Scope</h3>
                            <span className="text-xs font-mono text-text-muted uppercase tracking-wider">Metrics</span>
                        </div>
                        <div className="overflow-x-auto">
                            <MetricTable>
                                <InputRow label="Storypoints" sprints={SPRINTS}
                                    getValue={(i, type) => getVal(i, 'sp', type)}
                                    onChange={(i, type, v) => updateMetric(i, 'sp', type, v)} />
                                <CalculatedRow label="SP acceptance ratio (result/plan)" sprints={SPRINTS} getValue={calculateSPAcceptanceRatio} highlight />
                                <CalculatedRow label="PI Progress (% done)" sprints={SPRINTS} getValue={calculatePIProgress} highlight />
                                <CalculatedRow label="Velocity (SP / Dev Days)" sprints={SPRINTS} getValue={calculateVelocity} highlight={false} />
                                <InputRow label="Issues" sprints={SPRINTS}
                                    getValue={(i, type) => getVal(i, 'issues', type)}
                                    onChange={(i, type, v) => updateMetric(i, 'issues', type, v)} />
                                <CalculatedRow label="Issue acceptance ratio (result/plan)" sprints={SPRINTS} getValue={calculateIssuesAcceptanceRatio} highlight />
                            </MetricTable>
                        </div>
                    </div>

                    {/* Table 3: Quality */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-brand-primary">Quality</h3>
                            <span className="text-xs font-mono text-text-muted uppercase tracking-wider">Metrics</span>
                        </div>
                        <div className="overflow-x-auto">
                            <MetricTable>
                                <InputRow label="Bugs created in sprint" sprints={SPRINTS}
                                    getValue={(i, type) => getVal(i, 'bugsCreated', type)}
                                    onChange={(i, type, v) => updateMetric(i, 'bugsCreated', type, v)} />
                                <InputRow label="Bugs closed in sprint" sprints={SPRINTS}
                                    getValue={(i, type) => getVal(i, 'bugsClosed', type)}
                                    onChange={(i, type, v) => updateMetric(i, 'bugsClosed', type, v)} />
                                <InputRow label="Bugs currently open" sprints={SPRINTS}
                                    getValue={(i, type) => getVal(i, 'bugsOpen', type)}
                                    onChange={(i, type, v) => updateMetric(i, 'bugsOpen', type, v)} />
                                <InputRow label="Defect detection ratio" sprints={SPRINTS}
                                    getValue={(i, type) => getVal(i, 'defectRatio', type)}
                                    onChange={(i, type, v) => updateMetric(i, 'defectRatio', type, v)} />
                                <InputRow label="Cycle time bugs" sprints={SPRINTS}
                                    getValue={(i, type) => getVal(i, 'cycleTimeBugs', type)}
                                    onChange={(i, type, v) => updateMetric(i, 'cycleTimeBugs', type, v)} />
                                <InputRow label="Cycle time collabs" sprints={SPRINTS}
                                    getValue={(i, type) => getVal(i, 'cycleTimeCollabs', type)}
                                    onChange={(i, type, v) => updateMetric(i, 'cycleTimeCollabs', type, v)} />
                            </MetricTable>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-center py-12 text-text-muted">
                    No teams available. Please add teams in the Teams section.
                </div>
            )}
        </div>
    );
};

// --- Reusable Components ---
const MetricTable: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <table className="w-full text-sm text-left border-collapse">
        <thead>
            <tr className="bg-gray-50/80 border-b border-gray-200">
                <th className="px-6 py-4 font-bold text-gray-700 w-64 min-w-[200px] bg-gray-50/80 sticky left-0 z-10">Metric</th>
                {SPRINTS.map(s => (
                    <th key={s} className="px-2 py-3 font-semibold text-gray-600 text-center border-l border-gray-200 min-w-[140px]">
                        <div className="mb-2 text-xs uppercase tracking-wide text-brand-secondary">{s}</div>
                        <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-400 font-normal uppercase tracking-wider">
                            <span className="text-center">Plan</span>
                            <span className="text-center">Actual</span>
                        </div>
                    </th>
                ))}
            </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
            {children}
        </tbody>
    </table>
);

const InputRow: React.FC<{
    label: string,
    sprints: string[],
    getValue: (idx: number, type: MetricType) => number | '',
    onChange: (idx: number, type: MetricType, val: string) => void
}> = ({ label, sprints, getValue, onChange }) => (
    <tr className="group hover:bg-gray-50/50 transition-colors">
        <td className="px-6 py-3 font-medium text-gray-700 border-r border-gray-100 sticky left-0 z-10 bg-white group-hover:bg-gray-50/50">
            {label}
        </td>
        {sprints.map((_, idx) => (
            <td key={idx} className="p-0 border-l border-gray-100 h-full relative">
                <div className="grid grid-cols-2 h-full divide-x divide-gray-100">
                    <input
                        type="number"
                        value={getValue(idx, 'plan')}
                        onChange={(e) => onChange(idx, 'plan', e.target.value)}
                        className="w-full h-full text-center py-3 bg-transparent focus:outline-none focus:bg-brand-primary/5 focus:text-brand-primary transition-colors placeholder-gray-200 text-gray-600 spin-button-none"
                        placeholder="-"
                    />
                    <input
                        type="number"
                        value={getValue(idx, 'actual')}
                        onChange={(e) => onChange(idx, 'actual', e.target.value)}
                        className="w-full h-full text-center py-3 bg-transparent focus:outline-none focus:bg-brand-primary/5 focus:text-brand-primary transition-colors placeholder-gray-200 text-gray-600 spin-button-none"
                        placeholder="-"
                    />
                </div>
            </td>
        ))}
    </tr>
);

const CalculatedRow: React.FC<{
    label: string,
    sprints: string[],
    getValue: (idx: number) => string,
    highlight?: boolean
}> = ({ label, sprints, getValue, highlight }) => (
    <tr className={`group transition-colors ${highlight ? 'bg-yellow-50/30 hover:bg-yellow-50/60' : 'hover:bg-gray-50/50'}`}>
        <td className={`px-6 py-3 text-gray-800 border-r border-gray-100 sticky left-0 z-10 ${highlight ? 'bg-yellow-50/30 group-hover:bg-yellow-50/60' : 'bg-white group-hover:bg-gray-50/50'}`}>
            {label}
        </td>
        {sprints.map((_, idx) => (
            <td key={idx} className="p-0 border-l border-gray-100 h-full" colSpan={1}>
                <div className="py-3 px-2 text-center text-gray-700 w-full">
                    {getValue(idx) || '-'}
                </div>
            </td>
        ))}
    </tr>
);

export default SprintMetrics;
