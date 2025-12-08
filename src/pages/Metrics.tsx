import React, { useState } from 'react';
import PageHeader from '../components/PageHeader';
import { Plus, Trash2 } from 'lucide-react';

interface MetricDef {
    id: string;
    name: string;
    description: string;
    formula: string;
}

const Metrics: React.FC = () => {
    // Local state for now, could be moved to context
    const [metrics, setMetrics] = useState<MetricDef[]>([
        { id: '1', name: 'Team Cost', description: 'Cost of team based on SP', formula: 'Sum(SP) * Team SP Value' },
        { id: '2', name: 'Budget Variance', description: 'Difference between allocated and planned', formula: 'Topic Budget - Sum(Feature Budgets)' }
    ]);
    const [isAdding, setIsAdding] = useState(false);
    const [newMetric, setNewMetric] = useState<Partial<MetricDef>>({});

    const addMetric = () => {
        if (newMetric.name) {
            setMetrics([...metrics, { ...newMetric, id: Math.random().toString() } as MetricDef]);
            setIsAdding(false);
            setNewMetric({});
        }
    };

    return (
        <div>
            <PageHeader
                title="Metrics Configuration"
                description="Manage metric definitions and calculation formulas."
                actions={
                    <button onClick={() => setIsAdding(true)} className="btn btn-primary flex items-center gap-2">
                        <Plus size={18} /> Add Metric
                    </button>
                }
            />

            {isAdding && (
                <div className="card mb-6 border-brand-accent/30">
                    <h3 className="font-bold text-brand-primary mb-4 p-6 pb-0">New Metric Definition</h3>
                    <div className="p-6 pt-2 grid gap-4">
                        <input
                            className="input"
                            placeholder="Metric Name"
                            value={newMetric.name || ''}
                            onChange={e => setNewMetric({ ...newMetric, name: e.target.value })}
                        />
                        <input
                            className="input"
                            placeholder="Description"
                            value={newMetric.description || ''}
                            onChange={e => setNewMetric({ ...newMetric, description: e.target.value })}
                        />
                        <input
                            className="input"
                            placeholder="Formula / Calculation Logic"
                            value={newMetric.formula || ''}
                            onChange={e => setNewMetric({ ...newMetric, formula: e.target.value })}
                        />
                        <div className="flex justify-end gap-2 mt-2">
                            <button onClick={() => setIsAdding(false)} className="btn btn-secondary">Cancel</button>
                            <button onClick={addMetric} className="btn btn-primary">Save</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Name</th>
                                <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Description</th>
                                <th className="px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Formula</th>
                                <th className="px-6 py-4 w-16"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {metrics.map(m => (
                                <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-text-main">{m.name}</td>
                                    <td className="px-6 py-4 text-text-muted">{m.description}</td>
                                    <td className="px-6 py-4 font-mono text-sm text-brand-accent">{m.formula}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => setMetrics(metrics.filter(x => x.id !== m.id))} className="text-text-muted hover:text-red-600 transition-colors">
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Metrics;
