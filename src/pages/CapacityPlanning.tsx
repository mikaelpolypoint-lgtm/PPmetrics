import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import PageHeader from '../components/PageHeader';
import { LayoutDashboard, FileText, Users } from 'lucide-react';

const CapacityPlanning: React.FC = () => {
    const { currentPI } = useData();
    const navigate = useNavigate();

    const sections = [
        { label: 'Capacity Dashboard', path: `/${currentPI}/capacity-dashboard`, desc: 'Overview of Team and Topic capacities', icon: LayoutDashboard },
        { label: 'PIB Capacity', path: `/${currentPI}/capacity-details`, desc: 'Detailed capacity planning per PIB', icon: FileText },
        { label: 'PIB Team Capacity', path: `/${currentPI}/capacity-team-details`, desc: 'Team-specific capacity breakdown', icon: Users },
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <PageHeader title="Capacity" description="Manage planning and capacities for the PI." />
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
export default CapacityPlanning;
