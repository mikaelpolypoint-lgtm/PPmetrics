import React, { createContext, useContext, useState, useEffect } from 'react';
import { TEAMS_DEFAULT, PIS } from '../types';
import type { Team, Topic, Feature, Story, EverhourEntry } from '../types';

interface DataContextType {
    teams: Team[];
    topics: Topic[];
    features: Feature[];
    stories: Story[];
    everhourEntries: EverhourEntry[];
    currentPI: string;
    setCurrentPI: (pi: string) => void;

    // Actions
    updateTeam: (team: Team) => void;
    addTopic: (topic: Topic) => void;
    updateTopic: (topic: Topic) => void;
    deleteTopic: (id: string) => void;
    addFeature: (feature: Feature) => void;
    updateFeature: (feature: Feature) => void;
    deleteFeature: (id: string) => void;

    // Bulk Import Actions
    importStories: (stories: Story[], pi: string) => void;
    importEverhour: (entries: EverhourEntry[], pi: string) => void;

    // Test Data
    seedTestData: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
    const context = useContext(DataContext);
    if (!context) throw new Error('useData must be used within a DataProvider');
    return context;
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [currentPI, setCurrentPI] = useState(PIS[0]);
    const [teams, setTeams] = useState<Team[]>(TEAMS_DEFAULT);
    const [topics, setTopics] = useState<Topic[]>([]);
    const [features, setFeatures] = useState<Feature[]>([]);
    const [stories, setStories] = useState<Story[]>([]);
    const [everhourEntries, setEverhourEntries] = useState<EverhourEntry[]>([]);

    // Load from local storage for persistence during dev
    useEffect(() => {
        const saved = localStorage.getItem('metrics_data');
        if (saved) {
            const parsed = JSON.parse(saved);
            setTeams(parsed.teams || TEAMS_DEFAULT);
            setTopics(parsed.topics || []);
            setFeatures(parsed.features || []);
            setStories(parsed.stories || []);
            setEverhourEntries(parsed.everhourEntries || []);
        }
    }, []);

    // Save to local storage
    useEffect(() => {
        localStorage.setItem('metrics_data', JSON.stringify({
            teams, topics, features, stories, everhourEntries
        }));
    }, [teams, topics, features, stories, everhourEntries]);

    const updateTeam = (updatedTeam: Team) => {
        setTeams(prev => prev.map(t => t.id === updatedTeam.id ? updatedTeam : t));
    };

    const addTopic = (topic: Topic) => setTopics(prev => [...prev, topic]);
    const updateTopic = (topic: Topic) => setTopics(prev => prev.map(t => t.id === topic.id ? topic : t));
    const deleteTopic = (id: string) => setTopics(prev => prev.filter(t => t.id !== id));

    const addFeature = (feature: Feature) => setFeatures(prev => [...prev, feature]);
    const updateFeature = (feature: Feature) => setFeatures(prev => prev.map(f => f.id === feature.id ? feature : f));
    const deleteFeature = (id: string) => setFeatures(prev => prev.filter(f => f.id !== id));

    const importStories = (newStories: Story[], pi: string) => {
        // Replace stories for this PI or append? Usually import replaces or updates.
        // Let's remove existing stories for this PI and add new ones to avoid duplicates if re-importing
        setStories(prev => [...prev.filter(s => s.pi !== pi), ...newStories]);
    };

    const importEverhour = (newEntries: EverhourEntry[], pi: string) => {
        setEverhourEntries(prev => [...prev.filter(e => e.pi !== pi), ...newEntries]);
    };

    const seedTestData = () => {
        // Generate some test data for 26.1
        const pi = '26.1';

        const newTopics: Topic[] = [
            { id: 't1', name: 'Tech. Improvements', key: 'TECH', priority: 0, pibBudget: 122000, teamBudgets: {}, pi },
            { id: 't2', name: 'Nichtfunktional', key: 'NFUNC', priority: 0, pibBudget: 15000, teamBudgets: {}, pi },
            { id: 't3', name: 'Leftovers', key: 'LEFT', priority: 0, pibBudget: 70000, teamBudgets: {}, pi },
            { id: 't4', name: 'EOL', key: 'EOL', priority: 0, pibBudget: 15000, teamBudgets: {}, pi },
            { id: 't5', name: 'Planungswunsch', key: 'PLAN', priority: 1, pibBudget: 45000, teamBudgets: {}, pi },
            { id: 't6', name: 'myPP Teamplan', key: 'MYPP', priority: 2, pibBudget: 95000, teamBudgets: {}, pi },
            { id: 't7', name: 'smartPEP', key: 'PEP', priority: 3, pibBudget: 115000, teamBudgets: {}, pi },
            { id: 't8', name: 'PA Beekeeper', key: 'BEEK', priority: 4, pibBudget: 15000, teamBudgets: {}, pi },
            { id: 't9', name: 'PA Ext. Verfügbarkeiten', key: 'PAEXT', priority: 5, pibBudget: 25000, teamBudgets: {}, pi },
            { id: 't10', name: 'Verb. Zeiterfassung', key: 'ZEIT', priority: 6, pibBudget: 65000, teamBudgets: {}, pi },
            { id: 't11', name: 'Changes 26.1', key: 'CHG', priority: 7, pibBudget: 13000, teamBudgets: {}, pi },
        ];

        const newFeatures: Feature[] = [
            { id: 'f1', name: 'Login Page', jiraId: 'FEAT-1', pibBudget: 10000, teamBudgets: { neon: 10000 }, epicOwner: 'John Doe', topicKey: 'TECH', pi },
            { id: 'f2', name: 'Dashboard', jiraId: 'FEAT-2', pibBudget: 20000, teamBudgets: { tungsten: 20000 }, epicOwner: 'Jane Smith', topicKey: 'TECH', pi }
        ];

        const newStories: Story[] = [
            { id: 's1', name: 'Implement Login', key: 'PROJ-101', status: 'Done', sp: 5, team: 'Neon', sprint: '26.1-S1', pi },
            { id: 's2', name: 'Design Dashboard', key: 'PROJ-102', status: 'In Progress', sp: 8, team: 'Tungsten', sprint: '26.1-S2', pi }
        ];

        setTopics(newTopics);
        setFeatures(newFeatures);
        setStories(newStories);
        alert('Test data seeded for 26.1');
    };

    return (
        <DataContext.Provider value={{
            teams, topics, features, stories, everhourEntries, currentPI, setCurrentPI,
            updateTeam, addTopic, updateTopic, deleteTopic, addFeature, updateFeature, deleteFeature,
            importStories, importEverhour, seedTestData
        }}>
            {children}
        </DataContext.Provider>
    );
};
