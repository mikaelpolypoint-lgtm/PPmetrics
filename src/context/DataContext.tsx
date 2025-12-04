import React, { createContext, useContext, useState, useEffect } from 'react';
import { TEAMS_DEFAULT, PIS } from '../types';
import type { Team, Topic, Feature, Story, EverhourEntry } from '../types';
import { db } from '../lib/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { TEST_JIRA_DATA } from '../data/testJiraData';

interface DataContextType {
    teams: Team[];
    topics: Topic[];
    features: Feature[];
    stories: Story[];
    everhourEntries: EverhourEntry[];
    currentPI: string;
    setCurrentPI: (pi: string) => void;
    isLoading: boolean;

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
    loadTestJiraData: () => void;
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
    const [isLoading, setIsLoading] = useState(true);

    // Load data from Firestore
    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                // Teams
                const teamsSnap = await getDocs(collection(db, 'teams'));
                if (!teamsSnap.empty) {
                    const loadedTeams = teamsSnap.docs.map(d => d.data() as Team);
                    if (loadedTeams.length > 0) setTeams(loadedTeams);
                } else {
                    // Initialize teams in DB if empty
                    const batch = writeBatch(db);
                    TEAMS_DEFAULT.forEach(t => {
                        batch.set(doc(db, 'teams', t.id), t);
                    });
                    await batch.commit();
                }

                // Topics
                const topicsSnap = await getDocs(collection(db, 'topics'));
                setTopics(topicsSnap.docs.map(d => d.data() as Topic));

                // Features
                const featuresSnap = await getDocs(collection(db, 'features'));
                setFeatures(featuresSnap.docs.map(d => d.data() as Feature));

                // Stories
                const storiesSnap = await getDocs(collection(db, 'stories'));
                setStories(storiesSnap.docs.map(d => d.data() as Story));

                // Everhour
                const everhourSnap = await getDocs(collection(db, 'everhourEntries'));
                setEverhourEntries(everhourSnap.docs.map(d => d.data() as EverhourEntry));

            } catch (error) {
                console.error("Error loading data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, []);

    const updateTeam = async (updatedTeam: Team) => {
        setTeams(prev => prev.map(t => t.id === updatedTeam.id ? updatedTeam : t));
        await setDoc(doc(db, 'teams', updatedTeam.id), updatedTeam);
    };

    const addTopic = async (topic: Topic) => {
        setTopics(prev => [...prev, topic]);
        await setDoc(doc(db, 'topics', topic.id), topic);
    };

    const updateTopic = async (topic: Topic) => {
        setTopics(prev => prev.map(t => t.id === topic.id ? topic : t));
        await setDoc(doc(db, 'topics', topic.id), topic);
    };

    const deleteTopic = async (id: string) => {
        setTopics(prev => prev.filter(t => t.id !== id));
        await deleteDoc(doc(db, 'topics', id));
    };

    const addFeature = async (feature: Feature) => {
        setFeatures(prev => [...prev, feature]);
        await setDoc(doc(db, 'features', feature.id), feature);
    };

    const updateFeature = async (feature: Feature) => {
        setFeatures(prev => prev.map(f => f.id === feature.id ? feature : f));
        await setDoc(doc(db, 'features', feature.id), feature);
    };

    const deleteFeature = async (id: string) => {
        setFeatures(prev => prev.filter(f => f.id !== id));
        await deleteDoc(doc(db, 'features', id));
    };

    const importStories = async (newStories: Story[], pi: string) => {
        // Optimistic update
        setStories(prev => [...prev.filter(s => s.pi !== pi), ...newStories]);

        // Batch write to Firestore
        const storiesToDelete = stories.filter(s => s.pi === pi);

        const batch = writeBatch(db);
        storiesToDelete.forEach(s => {
            batch.delete(doc(db, 'stories', s.id));
        });
        newStories.forEach(s => {
            batch.set(doc(db, 'stories', s.id), s);
        });
        await batch.commit();
    };

    const importEverhour = async (newEntries: EverhourEntry[], pi: string) => {
        setEverhourEntries(prev => [...prev.filter(e => e.pi !== pi), ...newEntries]);

        const entriesToDelete = everhourEntries.filter(e => e.pi === pi);
        const batch = writeBatch(db);
        entriesToDelete.forEach(e => {
            batch.delete(doc(db, 'everhourEntries', e.id));
        });
        newEntries.forEach(e => {
            batch.set(doc(db, 'everhourEntries', e.id), e);
        });
        await batch.commit();
    };

    const seedTestData = async () => {
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
            { id: 's1', name: 'Implement Login', key: 'PROJ-101', status: 'Done', sp: 5, team: 'Neon', sprint: '26.1-S1', epic: 'TECH', pi },
            { id: 's2', name: 'Design Dashboard', key: 'PROJ-102', status: 'In Progress', sp: 8, team: 'Tungsten', sprint: '26.1-S2', epic: 'TECH', pi }
        ];

        // Update State
        setTopics(prev => [...prev.filter(t => t.pi !== pi), ...newTopics]);
        setFeatures(prev => [...prev.filter(f => f.pi !== pi), ...newFeatures]);
        setStories(prev => [...prev.filter(s => s.pi !== pi), ...newStories]);

        // Batch Write
        const batch = writeBatch(db);
        newTopics.forEach(t => batch.set(doc(db, 'topics', t.id), t));
        newFeatures.forEach(f => batch.set(doc(db, 'features', f.id), f));
        newStories.forEach(s => batch.set(doc(db, 'stories', s.id), s));

        await batch.commit();
        alert('Test data seeded for 26.1 to Firestore');
    };

    const loadTestJiraData = async () => {
        const pi = '26.1';
        // Optimistic update
        setStories(prev => [...prev.filter(s => s.pi !== pi), ...TEST_JIRA_DATA]);

        // Batch write
        const batch = writeBatch(db);
        // Delete existing for this PI first
        const storiesToDelete = stories.filter(s => s.pi === pi);
        storiesToDelete.forEach(s => batch.delete(doc(db, 'stories', s.id)));

        TEST_JIRA_DATA.forEach(s => {
            batch.set(doc(db, 'stories', s.id), s);
        });

        await batch.commit();
        alert(`Imported ${TEST_JIRA_DATA.length} stories from local test file.`);
    };

    return (
        <DataContext.Provider value={{
            teams, topics, features, stories, everhourEntries, currentPI, setCurrentPI, isLoading,
            updateTeam, addTopic, updateTopic, deleteTopic, addFeature, updateFeature, deleteFeature,
            importStories, importEverhour, seedTestData, loadTestJiraData
        }}>
            {children}
        </DataContext.Provider>
    );
};
