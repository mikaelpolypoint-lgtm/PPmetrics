import { useData } from '../context/DataContext';
import PageHeader from '../components/PageHeader';

const SPRINTS = ['Sprint 1', 'Sprint 2', 'Sprint 3', 'Sprint 4', 'Sprint 5', 'Sprint 6'];

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
    // Formula: Avg(Team1Ratio, Team2Ratio, ...)
    // TeamRatio = (TotalActual / TotalPlan) * 100
    const calculateAvgReportedRatio = (sprintIdx: number) => {
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

            if (totalPlan > 0) {
                ratios.push((totalAct / totalPlan) * 100);
            }
        });

        if (ratios.length === 0) return '-';
        const sum = ratios.reduce((a, b) => a + b, 0);
        return (sum / ratios.length).toFixed(0) + '%';
    };

    // 2. SP Acceptance Ratio (Average)
    // TeamRatio = (ActualSP / PlanSP) * 100
    const calculateAvgSPAcceptanceRatio = (sprintIdx: number) => {
        const ratios: number[] = [];
        teams.forEach(t => {
            const plan = getVal(t.id, sprintIdx, 'sp', 'plan');
            const actual = getVal(t.id, sprintIdx, 'sp', 'actual');
            if (plan > 0) {
                ratios.push((actual / plan) * 100);
            }
        });

        if (ratios.length === 0) return '-';
        const sum = ratios.reduce((a, b) => a + b, 0);
        return (sum / ratios.length).toFixed(0) + '%';
    };

    // 3. PI Progress (Average)
    // TeamProgress = (SumActualSPSoFar / TotalPlannedSP_PI) * 100
    const calculateAvgPIProgress = (sprintIdx: number) => {
        const progresses: number[] = [];
        teams.forEach(t => {
            // Total Planned SP for this team in this PI
            const teamStories = stories.filter(s =>
                s.pi === currentPI &&
                (s.team === t.name || (t.name === 'Hydrogen 1' && s.team === 'H1'))
            );
            const totalPlannedSP = teamStories.reduce((sum, s) => sum + (s.sp || 0), 0);

            if (totalPlannedSP > 0) {
                let sumActual = 0;
                for (let i = 0; i <= sprintIdx; i++) {
                    sumActual += getVal(t.id, i, 'sp', 'actual');
                }
                progresses.push((sumActual / totalPlannedSP) * 100);
            }
        });

        if (progresses.length === 0) return '-';
        const sum = progresses.reduce((a, b) => a + b, 0);
        return (sum / progresses.length).toFixed(0) + '%';
    };

    // 4. Issue Acceptance Ratio (Average)
    const calculateAvgIssueRatio = (sprintIdx: number) => {
        const ratios: number[] = [];
        teams.forEach(t => {
            const plan = getVal(t.id, sprintIdx, 'issues', 'plan');
            const actual = getVal(t.id, sprintIdx, 'issues', 'actual');
            if (plan > 0) {
                ratios.push((actual / plan) * 100);
            }
        });
        if (ratios.length === 0) return '-';
        const sum = ratios.reduce((a, b) => a + b, 0);
        return (sum / ratios.length).toFixed(0) + '%';
    };

    // 5. Defect Detection Ratio (Average)
    // This is explicitly entered in SprintMetrics as a percent value (e.g., 90)
    // Currently stored as a number.
    const calculateAvgDefectRatio = (sprintIdx: number) => {
        const values: number[] = [];
        teams.forEach(t => {
            // Check if we have a value. Usually 0 is a valid value, but if it's missing (0 default), we might want to exclude? 
            // But getVal returns 0 for missing. Let's assume if it's 0 it counts as 0 unless ALL are 0?
            // Actually, let's just average whatever is there.
            // Wait, 'defectRatio' is stored as the value entered.
            const val = getVal(t.id, sprintIdx, 'defectRatio', 'actual');
            // If we want to check if it was actually entered, we'd need to check the raw map. 
            // For now, let's just average.
            values.push(val);
        });
        const sum = values.reduce((a, b) => a + b, 0);
        return (sum / 4).toFixed(0) + '%';
    };

    // 6. Cycle Time Bugs (Average)
    const calculateAvgCycleTimeBugs = (sprintIdx: number) => {
        const values = teams.map(t => getVal(t.id, sprintIdx, 'cycleTimeBugs', 'actual'));
        const sum = values.reduce((a, b) => a + b, 0);
        return (sum / 4).toFixed(1);
    };

    // 7. Cycle Time Collabs (Average)
    const calculateAvgCycleTimeCollabs = (sprintIdx: number) => {
        const values = teams.map(t => getVal(t.id, sprintIdx, 'cycleTimeCollabs', 'actual'));
        const sum = values.reduce((a, b) => a + b, 0);
        return (sum / 4).toFixed(1);
    };

    // --- Sum Calculations ---

    // 8. Bugs Created (Sum)
    const calculateSumBugsCreated = (sprintIdx: number) => {
        const sum = teams.reduce((acc, t) => acc + getVal(t.id, sprintIdx, 'bugsCreated', 'actual'), 0);
        return sum;
    };

    // 9. Bugs Closed (Sum)
    const calculateSumBugsClosed = (sprintIdx: number) => {
        const sum = teams.reduce((acc, t) => acc + getVal(t.id, sprintIdx, 'bugsClosed', 'actual'), 0);
        return sum;
    };

    // 10. Bugs Open (Sum)
    const calculateSumBugsOpen = (sprintIdx: number) => {
        const sum = teams.reduce((acc, t) => acc + getVal(t.id, sprintIdx, 'bugsOpen', 'actual'), 0);
        return sum;
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
                                        <td key={sIdx} className="px-6 py-4 text-center border-l border-gray-100 font-mono text-gray-600">
                                            {row.calc(sIdx)}
                                        </td>
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

export default Monatscontrolling;
