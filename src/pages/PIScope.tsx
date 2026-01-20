import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import PageHeader from '../components/PageHeader';
import { Layers, Database, FileText, Clock } from 'lucide-react';

const PIScope: React.FC = () => {
    const { currentPI } = useData();
    const navigate = useNavigate();

    const sections = [
        { label: 'Topics', path: `/${currentPI}/topics`, desc: 'Manage high-level topics', icon: Layers },
        { label: 'Features', path: `/${currentPI}/features`, desc: 'Manage features (Epics)', icon: Database },
        { label: 'Jira', path: `/${currentPI}/jira`, desc: 'View Jira stories and tasks', icon: FileText },
        { label: 'Everhour', path: `/${currentPI}/everhour`, desc: 'View time tracking entries', icon: Clock },
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <PageHeader title="Scope" description="Manage the scope of the Program Increment." />
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
export default PIScope;
