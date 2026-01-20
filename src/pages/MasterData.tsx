import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import PageHeader from '../components/PageHeader';
import { Users, Clock, CalendarDays, Activity } from 'lucide-react';

const MasterData: React.FC = () => {
    const { currentPI } = useData();
    const navigate = useNavigate();

    const sections = [
        { label: 'Calendar', path: `/${currentPI}/calendar`, desc: 'Manage sprints, holidays, and PI dates', icon: Clock },
        { label: 'Teams', path: `/${currentPI}/teams`, desc: 'Manage teams, velocities, and capacities', icon: Users },
        { label: 'Developers', path: `/${currentPI}/capacity-developers`, desc: 'Manage developers and team assignments', icon: Users },
        { label: 'Availabilities', path: `/${currentPI}/capacity-availabilities`, desc: 'Manage developer presence and absence', icon: CalendarDays },
        { label: 'Changes', path: `/${currentPI}/capacity-changes`, desc: 'Track history of capacity changes', icon: Activity },
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <PageHeader title="Configuration" description="Manage core configuration and base data." />

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

export default MasterData;
