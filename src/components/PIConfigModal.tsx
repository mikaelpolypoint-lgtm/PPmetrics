import React, { useState, useEffect } from 'react';
import type { PIConfiguration } from '../types/capacity';
import { Download, Upload } from 'lucide-react';

interface PIConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (config: PIConfiguration) => Promise<void>;
    initialConfig: PIConfiguration;
    pi: string;
}

export const PIConfigModal: React.FC<PIConfigModalProps> = ({ isOpen, onClose, onSave, initialConfig, pi }) => {
    const [config, setConfig] = useState<PIConfiguration>(initialConfig);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setConfig(initialConfig);
    }, [initialConfig, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await onSave({ ...config, pi });
            onClose();
        } catch (error) {
            console.error("Failed to save config", error);
            alert("Failed to save configuration");
        } finally {
            setSaving(false);
        }
    };

    const handleExport = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(config, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `pi_config_${pi}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);
                // Basic validation
                if (json.sprintCount && Array.isArray(json.sprintLengths)) {
                    setConfig({ ...json, pi }); // Keep current PI but adopt other settings
                } else {
                    alert("Invalid configuration file");
                }
            } catch (err) {
                console.error("Error parsing JSON", err);
                alert("Error parsing JSON file");
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Configure PI {pi}</h2>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={handleExport}
                            className="p-2 text-text-muted hover:text-brand-primary rounded hover:bg-gray-100"
                            title="Export Configuration"
                        >
                            <Download size={18} />
                        </button>
                        <label className="p-2 text-text-muted hover:text-brand-primary rounded hover:bg-gray-100 cursor-pointer" title="Import Configuration">
                            <Upload size={18} />
                            <input
                                type="file"
                                accept=".json"
                                className="hidden"
                                onChange={handleImport}
                            />
                        </label>
                    </div>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-text-main mb-1">Start Date</label>
                        <input
                            type="date"
                            required
                            className="input w-full"
                            value={config.startDate}
                            onChange={e => setConfig({ ...config, startDate: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-text-main mb-1">Sprint Count</label>
                            <input
                                type="number"
                                min="1"
                                max="10"
                                required
                                className="input w-full"
                                value={config.sprintCount}
                                onChange={e => {
                                    const count = parseInt(e.target.value) || 0;
                                    const lengths = [...(config.sprintLengths || [])];
                                    // Resize array
                                    while (lengths.length < count) lengths.push(2);
                                    while (lengths.length > count) lengths.pop();
                                    setConfig({ ...config, sprintCount: count, sprintLengths: lengths });
                                }}
                            />
                        </div>
                    </div>

                    <div className="space-y-2 max-h-48 overflow-y-auto border rounded p-2 bg-gray-50">
                        <label className="block text-xs font-semibold text-text-muted uppercase">Sprint Durations (Weeks)</label>
                        {Array.from({ length: config.sprintCount }).map((_, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                                <span className="text-sm font-medium w-16">Sprint {idx + 1}</span>
                                <input
                                    type="number"
                                    min="1"
                                    max="5"
                                    className="input py-1 px-2 h-8 flex-1"
                                    value={config.sprintLengths?.[idx] ?? 2}
                                    onChange={e => {
                                        const val = parseInt(e.target.value) || 2;
                                        const newLengths = [...(config.sprintLengths || [])];
                                        // Ensure array is filled up to this index if it wasn't
                                        while (newLengths.length <= idx) newLengths.push(2);
                                        newLengths[idx] = val;
                                        setConfig({ ...config, sprintLengths: newLengths });
                                    }}
                                />
                            </div>
                        ))}
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                        <input
                            type="checkbox"
                            id="ipSprint"
                            checked={config.ipSprint}
                            onChange={e => setConfig({ ...config, ipSprint: e.target.checked })}
                            className="rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
                        />
                        <label htmlFor="ipSprint" className="text-sm font-medium text-text-main">Include IP Sprint</label>
                    </div>

                    {config.ipSprint && (
                        <div>
                            <label className="block text-sm font-medium text-text-main mb-1">IP Sprint Duration (Weeks)</label>
                            <input
                                type="number"
                                min="1"
                                max="4"
                                required
                                className="input w-full"
                                value={config.ipSprintLengthWeeks}
                                onChange={e => setConfig({ ...config, ipSprintLengthWeeks: parseInt(e.target.value) || 1 })}
                            />
                        </div>
                    )}

                    <div className="flex justify-end gap-3 mt-6">
                        <button type="button" onClick={onClose} className="btn btn-ghost" disabled={saving}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            {saving ? 'Generating...' : 'Apply & Generate'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
