import { db } from '../lib/firebase';
import { collection, getDocs, setDoc, doc, query, where, deleteDoc, getDoc } from 'firebase/firestore';
import type { CapacityDeveloper, CapacityAvailability, CapacityImprovement } from '../types/capacity';

export const CapacityService = {
    // --- Developers ---
    async getDevelopers(pi: string): Promise<CapacityDeveloper[]> {
        const q = query(collection(db, "developers"), where("pi", "==", pi));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => d.data() as CapacityDeveloper);
    },

    async saveDeveloper(pi: string, developer: CapacityDeveloper): Promise<void> {
        if (!developer.key) throw new Error("Developer key is required");
        developer.pi = pi;
        await setDoc(doc(db, "developers", `${pi}_${developer.key}`), developer);
    },

    async deleteDeveloper(pi: string, key: string): Promise<void> {
        await deleteDoc(doc(db, "developers", `${pi}_${key}`));
    },

    // --- Availabilities ---
    async getAvailabilities(pi: string): Promise<CapacityAvailability[]> {
        const q = query(collection(db, "availabilities"), where("pi", "==", pi));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => d.data() as CapacityAvailability);
    },

    async saveAvailability(pi: string, availabilityData: CapacityAvailability[]): Promise<void> {
        // Save each row (date) as a document
        const promises = availabilityData.map(row => {
            const docId = `${pi}_${row.date}`;
            return setDoc(doc(db, "availabilities", docId), { ...row, pi });
        });
        await Promise.all(promises);
    },

    async initDefaultSprints(pi: string): Promise<void> {
        const current = await this.getAvailabilities(pi);
        if (current.length > 0) return;

        // Hardcoded logic for 26.1 (and others if pattern matches)
        // For now, mirroring SM hardcoded logic
        if (pi === '26.1') {
            const sprints = [
                { name: '26.1-S1', start: '2025-12-04', end: '2025-12-17' },
                { name: '26.1-S2', start: '2025-12-18', end: '2026-01-14' },
                { name: '26.1-S3', start: '2026-01-15', end: '2026-01-28' },
                { name: '26.1-S4', start: '2026-01-29', end: '2026-02-18' },
                { name: '26.1-IP', start: '2026-02-19', end: '2026-03-04' }
            ];

            const rows: CapacityAvailability[] = [];

            const getDates = (startDate: string, endDate: string) => {
                const dates: Date[] = [];
                let currentDate = new Date(startDate);
                const stopDate = new Date(endDate);
                while (currentDate <= stopDate) {
                    const day = currentDate.getDay();
                    if (day !== 0 && day !== 6) {
                        dates.push(new Date(currentDate));
                    }
                    currentDate.setDate(currentDate.getDate() + 1);
                }
                return dates;
            };

            sprints.forEach(sprint => {
                const dates = getDates(sprint.start, sprint.end);
                dates.forEach(d => {
                    rows.push({
                        date: d.toISOString().split('T')[0],
                        sprint: sprint.name,
                        pi: pi
                    });
                });
            });

            await this.saveAvailability(pi, rows);
        }
    },

    async ensureDefaults(pi: string): Promise<void> {
        const DEFAULT_DEVELOPERS: Partial<CapacityDeveloper>[] = [
            { team: 'Tungsten', key: 'JRE' }, { team: 'Tungsten', key: 'DKA' }, { team: 'Tungsten', key: 'LRU' },
            { team: 'Tungsten', key: 'RGA' }, { team: 'Tungsten', key: 'LOR' }, { team: 'Tungsten', key: 'OMO' },
            { team: 'Neon', key: 'BRO' }, { team: 'Neon', key: 'MPL' }, { team: 'Neon', key: 'LBU' },
            { team: 'Neon', key: 'RTH' }, { team: 'Neon', key: 'IWI' }, { team: 'Neon', key: 'STH' },
            { team: 'H1', key: 'TSC' }, { team: 'H1', key: 'GRO' },
            { team: 'H1', key: 'MBR' }, { team: 'H1', key: 'PSC' }, { team: 'H1', key: 'SFR' },
            { team: 'H1', key: 'DMA' }, { team: 'H1', key: 'VNA' }, { team: 'H1', key: 'RBU' },
            { team: 'Zn2C', key: 'JEI' }, { team: 'Zn2C', key: 'YHU' }, { team: 'Zn2C', key: 'PNI' },
            { team: 'Zn2C', key: 'VTS' }, { team: 'Zn2C', key: 'PSA' }, { team: 'Zn2C', key: 'MMA' },
            { team: 'Zn2C', key: 'LMA' }, { team: 'Zn2C', key: 'RSA' }, { team: 'Zn2C', key: 'NAC' },
            // New Teams
            { team: 'UI', key: 'KFI' }, { team: 'UI', key: 'SOL' },
            { team: 'TMGT', key: 'JDE' }, { team: 'TMGT', key: 'VSC' },
            { team: 'Admin', key: 'CIR' }, { team: 'Admin', key: 'MVA' }, { team: 'Admin', key: 'NRA' },
            { team: 'Admin', key: 'BAS' }, { team: 'Admin', key: 'DGR' }, { team: 'Admin', key: 'RBL' }, { team: 'Admin', key: 'LSO' }
        ];

        const NEW_KEYS = ['KFI', 'SOL', 'JDE', 'VSC', 'CIR', 'MVA', 'NRA', 'BAS', 'DGR', 'RBL', 'LSO'];

        let isInit = false;
        let isV2 = false;

        try {
            const docSnap = await getDoc(doc(db, "metadata", `${pi}_defaults_init`));
            isInit = docSnap.exists();
            if (isInit) {
                const v2Snap = await getDoc(doc(db, "metadata", `${pi}_defaults_v2`));
                isV2 = v2Snap.exists();
            }
        } catch (e) {
            console.warn("Error checking defaults init", e);
        }

        if (isInit && isV2) return;

        const currentDevs = await this.getDevelopers(pi);
        const currentMap = new Map(currentDevs.map(d => [d.key, d]));

        for (const def of DEFAULT_DEVELOPERS) {
            const key = def.key!;
            const isNewKey = NEW_KEYS.includes(key);
            const shouldAdd = (!isInit && !currentMap.has(key)) ||
                (!isV2 && isNewKey && !currentMap.has(key)) ||
                (key === 'YHU');

            if (shouldAdd) {
                const existing = currentMap.get(key) || {};
                const newDev: CapacityDeveloper = {
                    key: key,
                    team: def.team || 'Unknown',
                    name: key,
                    stack: 'Fullstack',
                    dailyHours: 8,
                    workRatio: 100,
                    internalCost: 100,
                    load: 90,
                    manageRatio: 0,
                    developRatio: 80,
                    maintainRatio: 20,
                    velocity: 1,
                    pi: pi,
                    ...(existing as any)
                };

                if (key === 'YHU') newDev.team = def.team!;

                await this.saveDeveloper(pi, newDev);
            }
        }

        try {
            if (!isInit) await setDoc(doc(db, "metadata", `${pi}_defaults_init`), { initialized: true });
            if (!isV2) await setDoc(doc(db, "metadata", `${pi}_defaults_v2`), { initialized: true });
        } catch (e) {
            console.warn("Error setting defaults init", e);
        }
    },

    // --- Improvements ---
    async getImprovements(): Promise<CapacityImprovement[]> {
        const q = query(collection(db, "improvements"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => d.data() as CapacityImprovement);
    },

    async saveImprovement(improvement: CapacityImprovement): Promise<void> {
        if (!improvement.idea) throw new Error("Idea is required");
        const docId = improvement.id || `imp_${Date.now()}`;
        improvement.id = docId;
        await setDoc(doc(db, "improvements", docId), improvement);
    },

    async deleteImprovement(id: string): Promise<void> {
        await deleteDoc(doc(db, "improvements", id));
    },

    // --- Capacity Metrics Helper ---
    async getTeamCapacityHours(pi: string): Promise<Record<string, number>> {
        const [devs, avails] = await Promise.all([
            this.getDevelopers(pi),
            this.getAvailabilities(pi)
        ]);

        const teamHours: Record<string, number> = {};

        // Group availabilities by sprint
        const sprintsMap = new Map<string, CapacityAvailability[]>();
        avails.forEach(row => {
            if (!sprintsMap.has(row.sprint)) {
                sprintsMap.set(row.sprint, []);
            }
            sprintsMap.get(row.sprint)!.push(row);
        });

        // Filter out IP sprints
        const validSprints = Array.from(sprintsMap.entries())
            .filter(([sprintName]) => !sprintName.includes('IP'));

        devs.forEach((dev: CapacityDeveloper) => {
            if (dev.specialCase) return;

            const dailyHours = Number(dev.dailyHours) || 8;
            const load = Number(dev.load) || 90;
            const developRatio = Number(dev.developRatio) || 0;
            const devH = (dailyHours * (load / 100) * (developRatio / 100));

            validSprints.forEach(([sprintName, rows]) => {
                const capacityDays = rows.reduce((sum, row) => {
                    const val = row[dev.key]; // Dynamic access
                    // If undefined or empty, assume 1 (Availability) unless logic says otherwise. 
                    // In Teams.tsx logic: (val === undefined || val === null || val === '') ? 1 : Number(val);
                    const numericVal = (val === undefined || val === null || val === '') ? 1 : Number(val);
                    return sum + (isNaN(numericVal) ? 0 : numericVal);
                }, 0);

                const hours = capacityDays * devH;
                const teamInSprint = dev.sprintTeams?.[sprintName] || dev.team;

                if (teamInSprint) {
                    teamHours[teamInSprint] = (teamHours[teamInSprint] || 0) + hours;
                    if (teamInSprint === 'Hydrogen 1') {
                        teamHours['H1'] = (teamHours['H1'] || 0) + hours;
                    }
                }
            });
        });

        return teamHours;
    }
};
