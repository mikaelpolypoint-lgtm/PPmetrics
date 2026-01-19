import React from 'react';
import PageHeader from '../components/PageHeader';
import { Database, Layers, Target, FileText, Users, Clock, ArrowDown } from 'lucide-react';

const Tutorial: React.FC = () => {
    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto">
            <PageHeader
                title="Tutorial: Understanding the Data Structure"
                description="A guide to how data connects within PPMetrics."
            />

            {/* Introduction */}
            <div className="card">
                <h3 className="text-lg font-bold text-brand-primary mb-4">Overview</h3>
                <p className="text-text-main leading-relaxed">
                    PPMetrics allows for precise tracking of budgets, plans, and actual costs by linking time tracking (Everhour),
                    Agile planning (Jira), and strategic budgeting (Topics). Understanding this hierarchy is key to accurate reporting.
                </p>
            </div>

            {/* Visual Hierarchy */}
            <div className="relative flex flex-col items-center gap-8 py-8">

                {/* Level 1: PI */}
                <div className="w-full max-w-2xl">
                    <div className="card border-l-4 border-l-blue-600 bg-blue-50/50">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-white rounded-lg shadow-sm">
                                <Clock className="text-blue-600" size={24} />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900 mb-1">PI (Program Increment)</h4>
                                <p className="text-sm text-gray-600 mb-2">The core container (e.g., "26.1").</p>
                                <p className="text-sm text-gray-600">
                                    Everything revolves around the PI. It defines the timebox (approx. 3 months) containing 5-6 Sprits.
                                    Budgets and Capacities are set per PI.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <ArrowDown className="text-gray-300" />

                {/* Level 2: Topic */}
                <div className="w-full max-w-2xl">
                    <div className="card border-l-4 border-l-purple-600 bg-purple-50/50">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-white rounded-lg shadow-sm">
                                <Layers className="text-purple-600" size={24} />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900 mb-1">Topic</h4>
                                <p className="text-sm text-gray-600 mb-2">A strategic theme or bucket.</p>
                                <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                                    <li>Represents a large budget pot (e.g., "Tech Improvements", "SmartPEP").</li>
                                    <li>Allocates budget to specific Teams (e.g., Neon gets 50k CHF for this Topic).</li>
                                    <li>Total Budget = Sum of all Feature/Team allocations.</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                <ArrowDown className="text-gray-300" />

                {/* Level 3: Feature (Epic) */}
                <div className="w-full max-w-2xl">
                    <div className="card border-l-4 border-l-emerald-600 bg-emerald-50/50">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-white rounded-lg shadow-sm">
                                <Database className="text-emerald-600" size={24} />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900 mb-1">Feature (Jira Epic)</h4>
                                <p className="text-sm text-gray-600 mb-2">A deliverable functionality.</p>
                                <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                                    <li>Directly linked to a Jira Epic (e.g., "PROJ-123").</li>
                                    <li>Must belong to a <strong>Topic</strong>.</li>
                                    <li>Has a Business Value (BV) and Planned Budget (Scope).</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                <ArrowDown className="text-gray-300" />

                {/* Level 4: Story */}
                <div className="w-full max-w-2xl">
                    <div className="card border-l-4 border-l-orange-600 bg-orange-50/50">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-white rounded-lg shadow-sm">
                                <FileText className="text-orange-600" size={24} />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900 mb-1">Story</h4>
                                <p className="text-sm text-gray-600 mb-2">The smallest unit of work.</p>
                                <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                                    <li>Linked to Jira Story.</li>
                                    <li>Assigned to a <strong>Team</strong> and a <strong>Sprint</strong>.</li>
                                    <li>Costs money based on <strong>Story Points (SP)</strong> × Team Rate (CHF/SP).</li>
                                    <li><strong>Actual Cost</strong> is calculated via <strong>Everhour</strong> time tracking on this story.</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Key Concepts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="card">
                    <div className="flex items-center gap-3 mb-4">
                        <Target className="text-brand-primary" />
                        <h4 className="font-bold text-gray-900">Budget vs. Actuals</h4>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">
                        Budget flows from the <strong>Topic</strong>. Planned costs are calculated by summing up the Story Points of all stories.
                        Actual costs come from real hours logged in Everhour multiplied by the team's calculated hourly rate.
                    </p>
                </div>

                <div className="card">
                    <div className="flex items-center gap-3 mb-4">
                        <Users className="text-brand-primary" />
                        <h4 className="font-bold text-gray-900">Teams & Rates</h4>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">
                        Each team has a specific capacity in hours and a cost target.
                        We calculate a "Price per Story Point" (CHF/SP) to convert planned points into planned budget.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Tutorial;
