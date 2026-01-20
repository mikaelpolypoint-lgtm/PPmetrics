import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import PageHeader from '../components/PageHeader';
import { Activity, PieChart, Clock, LayoutDashboard, BarChart3 } from 'lucide-react';

const SprintMetricsGroup: React.FC = () => {
    const { currentPI } = useData();
    const navigate = useNavigate();

    const sections = [
        { label: 'Dashboard', path: `/${currentPI}/dashboard`, desc: 'Main PI Dashboard (Budget vs Actuals)', icon: LayoutDashboard },
        { label: 'Burndown', path: `/${currentPI}/burndown`, desc: 'Track progress over time', icon: PieChart },
        { label: 'Sprint Metrics', path: `/${currentPI}/sprint-metrics`, desc: 'Key performance indicators per sprint', icon: Activity },
        { label: 'Monatscontrolling', path: `/${currentPI}/monatscontrolling`, desc: 'Monthly controlling reports', icon: PieChart },
        { label: 'Everhour Capacities', path: `/${currentPI}/everhour-capacities`, desc: 'Time tracking vs Capacity', icon: Clock },
        { label: 'Metric Config', path: `/${currentPI}/metrics`, desc: 'Configure metric parameters', icon: BarChart3 },
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <PageHeader title="Metrics" description="Track all PI and Sprint metrics in one place." />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sections.map(s => (
                    <div
                        key={s.path}
                        onClick={() => navigate(s.path)}
                        className="card cursor-pointer group hover:border-brand-primary transition-all duration-200 hover:shadow-md"
                    >
                        <div className="flex items-center gap-4 mb-3">
                            <div className="p-2 rounded-lg bg-brand-primary/5 text-brand-primary group-hover:bg-brand-primary group-hover:text-white transition-colors">
                                <s.icon size={24} />
                            </div>
                            <h3 className="font-bold text-lg text-text-main group-hover:text-brand-primary transition-colors">{s.label}</h3>
                        </div>
                        <p className="text-sm text-text-muted">{s.desc}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};
export default SprintMetricsGroup;
