export interface CapacityDeveloper {
    key: string;
    team: string; // "Tungsten", "Neon", etc.
    name: string;
    stack: string; // "Fullstack", etc.
    dailyHours: number;
    workRatio: number; // 0-100
    internalCost: number; // CHF
    load: number; // 0-100
    manageRatio: number; // 0-100
    developRatio: number; // 0-100
    maintainRatio: number; // 0-100
    velocity: number; // SP per day
    pi: string;
    sprintTeams?: { [sprintName: string]: string }; // Special override team per sprint
    specialCase?: boolean; // If true, excluded from sums?
}

export interface CapacityAvailability {
    date: string; // YYYY-MM-DD
    sprint: string;
    pi: string;
    [devKey: string]: number | string; // Dynamic keys for developers, value 0, 0.5, 1
}

export interface CapacityImprovement {
    id: string;
    idea: string;
    priority: 'Low' | 'High';
    reporter: string;
    status: 'Backlog' | 'In Progress' | 'Done' | 'Dismissed';
    details: string;
    date: string; // ISO String
}

export interface CapacitySprint {
    name: string;
    start: string;
    end: string;
    rows?: CapacityAvailability[];
}
