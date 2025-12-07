import React from 'react';

interface PageHeaderProps {
    title: string;
    description?: string;
    actions?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, description, actions }) => {
    return (
        <div className="flex justify-between items-start mb-8">
            <div>
                <h1 className="text-3xl font-bold text-slate-100 mb-2 tracking-tight">{title}</h1>
                {description && <p className="text-slate-400">{description}</p>}
            </div>
            {actions && <div className="flex gap-3">{actions}</div>}
        </div>
    );
};

export default PageHeader;
