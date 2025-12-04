export interface Team {
  id: string;
  name: string;
  spValue: number; // CHF
  pibBudget: number;
  hourlyRate: number;
}

export interface Topic {
  id: string;
  name: string;
  key: string;
  priority: number;
  pibBudget: number;
  teamBudgets: Record<string, number>; // TeamID -> Amount
  pi: string; // e.g., "26.1"
}

export interface Feature {
  id: string;
  name: string;
  jiraId: string;
  pibBudget: number;
  teamBudgets: Record<string, number>;
  epicOwner: string;
  topicKey: string;
  pi: string;
}

export interface Story {
  id: string;
  name: string;
  key: string; // Jira Key
  status: string;
  sp: number;
  team: string; // Team Name from Jira
  sprint: string;
  epic: string; // Parent key
  pi: string;
}

export interface EverhourEntry {
  id: string;
  jiraKey: string;
  totalHours: number;
  sprint: string;
  pi: string;
}

export const TEAMS_DEFAULT: Team[] = [
  { id: 'neon', name: 'Neon', spValue: 0, pibBudget: 0, hourlyRate: 0 },
  { id: 'h1', name: 'Hydrogen 1', spValue: 0, pibBudget: 0, hourlyRate: 0 },
  { id: 'zn2c', name: 'Zn2C', spValue: 0, pibBudget: 0, hourlyRate: 0 },
  { id: 'tungsten', name: 'Tungsten', spValue: 0, pibBudget: 0, hourlyRate: 0 },
];

export const PIS = ['26.1', '26.2', '26.3', '26.4'];

export const SPRINTS: Record<string, string[]> = {
  '26.1': ['26.1-S1', '26.1-S2', '26.1-S3', '26.1-S4', '26.1-S5', '26.1-IP'],
  '26.2': ['26.2-S1', '26.2-S2', '26.2-S3', '26.2-S4', '26.2-S5', '26.2-IP'],
  '26.3': ['26.3-S1', '26.3-S2', '26.3-S3', '26.3-S4', '26.3-S5', '26.3-IP'],
  '26.4': ['26.4-S1', '26.4-S2', '26.4-S3', '26.4-S4', '26.4-S5', '26.4-IP'],
};
