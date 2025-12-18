import React from 'react';

const CapacityChanges: React.FC = () => {
    return (
        <div className="card p-8 bg-bg-surface border border-border rounded-xl">
            <h3 className="text-xl font-bold mb-4">Changes Comparison</h3>
            <p className="text-text-muted">Upload an Availabilities export file (CSV) to see the difference between the current system data and the file.</p>
            {/* Logic ported from changes.js would go here. */}
        </div>
    );
};

export default CapacityChanges;
