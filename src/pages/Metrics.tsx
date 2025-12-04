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
                <div className="card mb-6">
                    <h3 className="font-bold mb-4">New Metric Definition</h3>
                    <div className="grid gap-4 mb-4">
                        <input
                            placeholder="Metric Name"
                            value={newMetric.name || ''}
                            onChange={e => setNewMetric({ ...newMetric, name: e.target.value })}
                        />
                        <input
                            placeholder="Description"
                            value={newMetric.description || ''}
                            onChange={e => setNewMetric({ ...newMetric, description: e.target.value })}
                        />
                        <input
                            placeholder="Formula / Calculation Logic"
                            value={newMetric.formula || ''}
                            onChange={e => setNewMetric({ ...newMetric, formula: e.target.value })}
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <button onClick={() => setIsAdding(false)} className="btn btn-secondary">Cancel</button>
                        <button onClick={addMetric} className="btn btn-primary">Save</button>
                    </div>
                </div>
            )}

            <div className="card">
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Description</th>
                            <th>Formula</th>
                            <th className="w-16"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {metrics.map(m => (
                            <tr key={m.id}>
                                <td className="font-medium">{m.name}</td>
                                <td>{m.description}</td>
                                <td className="font-mono text-sm text-[var(--accent)]">{m.formula}</td>
                                <td>
                                    <button onClick={() => setMetrics(metrics.filter(x => x.id !== m.id))} className="text-[var(--danger)]">
                                        <Trash2 size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Metrics;
