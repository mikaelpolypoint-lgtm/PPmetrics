import { useData } from '../context/DataContext';
import PageHeader from '../components/PageHeader';

const SPRINTS = ['Sprint 1', 'Sprint 2', 'Sprint 3', 'Sprint 4', 'Sprint 5', 'Sprint 6'];


interface MetricResult {
    display: string | number;
    breakdown: { team: string; value: string | number }[];
}

const Monatscontrolling: React.FC = () => {
    const { teams, stories, currentPI, sprintMetrics } = useData();

    // Helper to get value for a specific team, sprint, metric, type
    const getVal = (teamId: string, sprintIdx: number, metric: string, type: 'plan' | 'actual') => {
        const docId = `${teamId}_${currentPI}`;
        const doc = sprintMetrics.find(d => d.id === docId);
        if (!doc) return 0;
        const key = `${sprintIdx}-${metric}-${type}`;
        return doc.values[key] || 0;
    };

    // --- Calculation Helpers ---

    // 1. Reported % Hours (Average)
    const calculateAvgReportedRatio = (sprintIdx: number): MetricResult => {
        const breakdown: { team: string; value: string | number }[] = [];
        const ratios: number[] = [];

        teams.forEach(t => {
            const devPlan = getVal(t.id, sprintIdx, 'dev', 'plan');
            const maintainPlan = getVal(t.id, sprintIdx, 'maintain', 'plan');
            const managePlan = getVal(t.id, sprintIdx, 'manage', 'plan');
            const absencePlan = getVal(t.id, sprintIdx, 'absence', 'plan');
            const totalPlan = devPlan + maintainPlan + managePlan + absencePlan;

            const devAct = getVal(t.id, sprintIdx, 'dev', 'actual');
            const maintainAct = getVal(t.id, sprintIdx, 'maintain', 'actual');
            const manageAct = getVal(t.id, sprintIdx, 'manage', 'actual');
            const absenceAct = getVal(t.id, sprintIdx, 'absence', 'actual');
            const totalAct = devAct + maintainAct + manageAct + absenceAct;

            let val: string | number = '-';
            if (totalPlan > 0) {
                const ratio = (totalAct / totalPlan) * 100;
                ratios.push(ratio);
                val = ratio.toFixed(0) + '%';
            }
            breakdown.push({ team: t.name, value: val });
        });

        if (ratios.length === 0) return { display: '-', breakdown };
        const sum = ratios.reduce((a, b) => a + b, 0);
        return { display: (sum / ratios.length).toFixed(0) + '%', breakdown };
    };

    // 2. SP Acceptance Ratio (Average)
    const calculateAvgSPAcceptanceRatio = (sprintIdx: number): MetricResult => {
        const breakdown: { team: string; value: string | number }[] = [];
        const ratios: number[] = [];

        teams.forEach(t => {
            const plan = getVal(t.id, sprintIdx, 'sp', 'plan');
            const actual = getVal(t.id, sprintIdx, 'sp', 'actual');
            let val: string | number = '-';
            if (plan > 0) {
                const ratio = (actual / plan) * 100;
                ratios.push(ratio);
                val = ratio.toFixed(0) + '%';
            }
            breakdown.push({ team: t.name, value: val });
        });

        if (ratios.length === 0) return { display: '-', breakdown };
        const sum = ratios.reduce((a, b) => a + b, 0);
        return { display: (sum / ratios.length).toFixed(0) + '%', breakdown };
    };

    // 3. PI Progress (Average)
    const calculateAvgPIProgress = (sprintIdx: number): MetricResult => {
        const breakdown: { team: string; value: string | number }[] = [];
        const progresses: number[] = [];

        teams.forEach(t => {
            const teamStories = stories.filter(s =>
                s.pi === currentPI &&
                (s.team === t.name || (t.name === 'Hydrogen 1' && s.team === 'H1'))
            );
            const totalPlannedSP = teamStories.reduce((sum, s) => sum + (s.sp || 0), 0);
            let val: string | number = '-';

            if (totalPlannedSP > 0) {
                let sumActual = 0;
                for (let i = 0; i <= sprintIdx; i++) {
                    sumActual += getVal(t.id, i, 'sp', 'actual');
                }
                const prog = (sumActual / totalPlannedSP) * 100;
                progresses.push(prog);
                val = prog.toFixed(0) + '%';
            }
            breakdown.push({ team: t.name, value: val });
        });

        if (progresses.length === 0) return { display: '-', breakdown };
        const sum = progresses.reduce((a, b) => a + b, 0);
        return { display: (sum / progresses.length).toFixed(0) + '%', breakdown };
    };

    // 4. Issue Acceptance Ratio (Average)
    const calculateAvgIssueRatio = (sprintIdx: number): MetricResult => {
        const breakdown: { team: string; value: string | number }[] = [];
        const ratios: number[] = [];
        teams.forEach(t => {
            const plan = getVal(t.id, sprintIdx, 'issues', 'plan');
            const actual = getVal(t.id, sprintIdx, 'issues', 'actual');
            let val: string | number = '-';
            if (plan > 0) {
                const ratio = (actual / plan) * 100;
                ratios.push(ratio);
                val = ratio.toFixed(0) + '%';
            }
            breakdown.push({ team: t.name, value: val });
        });
        if (ratios.length === 0) return { display: '-', breakdown };
        const sum = ratios.reduce((a, b) => a + b, 0);
        return { display: (sum / ratios.length).toFixed(0) + '%', breakdown };
    };

    // 5. Defect Detection Ratio (Average)
    const calculateAvgDefectRatio = (sprintIdx: number): MetricResult => {
        const breakdown: { team: string; value: string | number }[] = [];
        const values: number[] = [];
        teams.forEach(t => {
            const val = getVal(t.id, sprintIdx, 'defectRatio', 'actual');
            values.push(val);
            breakdown.push({ team: t.name, value: val + '%' });
        });
        const sum = values.reduce((a, b) => a + b, 0);
        return { display: (sum / 4).toFixed(0) + '%', breakdown };
    };

    // 6. Cycle Time Bugs (Average)
    const calculateAvgCycleTimeBugs = (sprintIdx: number): MetricResult => {
        const breakdown: { team: string; value: string | number }[] = [];
        const values: number[] = [];
        teams.forEach(t => {
            const val = getVal(t.id, sprintIdx, 'cycleTimeBugs', 'actual');
            values.push(val);
            breakdown.push({ team: t.name, value: val });
        });
        const sum = values.reduce((a, b) => a + b, 0);
        return { display: (sum / 4).toFixed(1), breakdown };
    };

    // 7. Cycle Time Collabs (Average)
    const calculateAvgCycleTimeCollabs = (sprintIdx: number): MetricResult => {
        const breakdown: { team: string; value: string | number }[] = [];
        const values: number[] = [];
        teams.forEach(t => {
            const val = getVal(t.id, sprintIdx, 'cycleTimeCollabs', 'actual');
            values.push(val);
            breakdown.push({ team: t.name, value: val });
        });
        const sum = values.reduce((a, b) => a + b, 0);
        return { display: (sum / 4).toFixed(1), breakdown };
    };

    // --- Sum Calculations ---

    // 8. Bugs Created (Sum)
    const calculateSumBugsCreated = (sprintIdx: number): MetricResult => {
        const breakdown: { team: string; value: string | number }[] = [];
        const sum = teams.reduce((acc, t) => {
            const val = getVal(t.id, sprintIdx, 'bugsCreated', 'actual');
            breakdown.push({ team: t.name, value: val });
            return acc + val;
        }, 0);
        return { display: sum, breakdown };
    };

    // 9. Bugs Closed (Sum)
    const calculateSumBugsClosed = (sprintIdx: number): MetricResult => {
        const breakdown: { team: string; value: string | number }[] = [];
        const sum = teams.reduce((acc, t) => {
            const val = getVal(t.id, sprintIdx, 'bugsClosed', 'actual');
            breakdown.push({ team: t.name, value: val });
            return acc + val;
        }, 0);
        return { display: sum, breakdown };
    };

    // 10. Bugs Open (Sum)
    const calculateSumBugsOpen = (sprintIdx: number): MetricResult => {
        const breakdown: { team: string; value: string | number }[] = [];
        const sum = teams.reduce((acc, t) => {
            const val = getVal(t.id, sprintIdx, 'bugsOpen', 'actual');
            breakdown.push({ team: t.name, value: val });
            return acc + val;
        }, 0);
        return { display: sum, breakdown };
    };

    const rows = [
        { label: 'Reported % hours (Avg)', calc: calculateAvgReportedRatio, highlight: true },
        { label: 'SP Acceptance ratio (Avg)', calc: calculateAvgSPAcceptanceRatio, highlight: true },
        { label: 'PI Progress (Avg)', calc: calculateAvgPIProgress, highlight: true },
        { label: 'Issue acceptance ratio (Avg)', calc: calculateAvgIssueRatio, highlight: true },
        { label: 'Defect detection ratio (Avg)', calc: calculateAvgDefectRatio, highlight: false },
        { label: 'Cycle time bugs (Avg)', calc: calculateAvgCycleTimeBugs, highlight: false },
        { label: 'Cycle time collabs (Avg)', calc: calculateAvgCycleTimeCollabs, highlight: false },
        { label: 'Bugs created in sprint (Sum)', calc: calculateSumBugsCreated, highlight: false },
        { label: 'Bugs closed in sprint (Sum)', calc: calculateSumBugsClosed, highlight: false },
        { label: 'Bugs currently open (Sum)', calc: calculateSumBugsOpen, highlight: false },
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <PageHeader
                title={`${currentPI} Monatscontrolling`}
                description="Cumulated view of metrics across all teams."
            />

            <div className="card overflow-hidden">
                <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100">
                    <h3 className="font-bold text-lg text-brand-primary">Cumulated Metrics</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/80 border-b border-gray-200">
                                <th className="px-6 py-4 font-bold text-gray-700 w-64">Metric</th>
                                {SPRINTS.map(s => (
                                    <th key={s} className="px-6 py-4 font-semibold text-gray-600 text-center border-l border-gray-200">
                                        <span className="uppercase tracking-wide text-xs">{s}</span>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {rows.map((row, idx) => (
                                <tr key={idx} className={`hover:bg-gray-50/50 transition-colors ${row.highlight ? 'bg-yellow-50/10' : ''}`}>
                                    <td className="px-6 py-4 font-medium text-gray-700 border-r border-gray-100 bg-white">
                                        {row.label}
                                    </td>
                                    {SPRINTS.map((_, sIdx) => (
                                        <TooltipCell key={sIdx} result={row.calc(sIdx)} />
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const TooltipCell: React.FC<{ result: MetricResult }> = ({ result }) => (
    <td className="px-6 py-4 text-center border-l border-gray-100 font-mono text-gray-600 relative group cursor-pointer hover:bg-white transition-colors">
        <span className="border-b border-dashed border-gray-300 pb-0.5">{result.display}</span>

        {/* Tooltip */}
        <div className="absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 bg-gray-900/95 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 backdrop-blur-sm pointer-events-none transform translate-y-1 group-hover:translate-y-0">
            <div className="p-2 space-y-1">
                <div className="font-semibold border-b border-gray-700 pb-1 mb-1 text-gray-300 text-[10px] uppercase tracking-wide">Breakdown</div>
                {result.breakdown.map((item, i) => (
                    <div key={i} className="flex justify-between items-center text-gray-200">
                        <span>{item.team}:</span>
                        <span className="font-mono font-medium text-white">{item.value}</span>
                    </div>
                ))}
            </div>
            {/* Arrow */}
            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-4 border-transparent border-t-gray-900/95"></div>
        </div>
    </td>
);

export default Monatscontrolling;

