import { db } from '../lib/firebase';
import { collection, getDocs, setDoc, doc, query, where, deleteDoc, getDoc } from 'firebase/firestore';
import type { CapacityDeveloper, CapacityAvailability, CapacityImprovement, PIConfiguration } from '../types/capacity';

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

    async deleteAllDevelopers(pi: string): Promise<void> {
        const devs = await this.getDevelopers(pi);
        const promises = devs.map(d => deleteDoc(doc(db, "developers", `${pi}_${d.key}`)));
        await Promise.all(promises);
    },

    // --- PI Config ---
    async getPIConfig(pi: string): Promise<PIConfiguration | null> {
        const docSnap = await getDoc(doc(db, "pi_configs", pi));
        return docSnap.exists() ? (docSnap.data() as PIConfiguration) : null;
    },

    async savePIConfig(config: PIConfiguration): Promise<void> {
        await setDoc(doc(db, "pi_configs", config.pi), config);
    },

    async applyPIConfiguration(config: PIConfiguration): Promise<void> {
        // 1. Save Config
        await this.savePIConfig(config);

        // 2. Generate new structure
        const newRows: CapacityAvailability[] = [];

        // Ensure UTC Midnight to match toISOString/split logic safely
        // config.startDate is "YYYY-MM-DD"
        const [startYear, startMonth, startDay] = config.startDate.split('-').map(Number);
        let currentDate = new Date(Date.UTC(startYear, startMonth - 1, startDay));

        // Regular Sprints
        for (let i = 1; i <= config.sprintCount; i++) {
            const sprintName = `${config.pi}-S${i}`;
            // Use specific length or default to 2
            const weeks = config.sprintLengths?.[i - 1] ?? 2;
            const durationDays = weeks * 7;

            for (let d = 0; d < durationDays; d++) {
                const day = currentDate.getUTCDay(); // 0=Sun, 6=Sat
                if (day !== 0 && day !== 6) { // Skip weekends
                    newRows.push({
                        date: currentDate.toISOString().split('T')[0],
                        sprint: sprintName,
                        pi: config.pi
                    });
                }
                currentDate.setUTCDate(currentDate.getUTCDate() + 1);
            }
        }

        // IP Sprint
        if (config.ipSprint) {
            const sprintName = `${config.pi}-IP`;
            const durationDays = config.ipSprintLengthWeeks * 7;
            for (let d = 0; d < durationDays; d++) {
                const day = currentDate.getUTCDay();
                if (day !== 0 && day !== 6) {
                    newRows.push({
                        date: currentDate.toISOString().split('T')[0],
                        sprint: sprintName,
                        pi: config.pi
                    });
                }
                currentDate.setUTCDate(currentDate.getUTCDate() + 1);
            }
        }

        // 3. Merge with existing data
        const existingRows = await this.getAvailabilities(config.pi);
        const existingMap = new Map(existingRows.map(r => [r.date, r]));

        const finalRows = newRows.map(newRow => {
            if (existingMap.has(newRow.date)) {
                // Keep existing values, update sprint name
                return { ...existingMap.get(newRow.date), sprint: newRow.sprint, pi: config.pi } as CapacityAvailability;
            }
            return newRow;
        });

        // 4. Delete orphaned rows
        const newDates = new Set(finalRows.map(r => r.date));
        const toDelete = existingRows.filter(r => !newDates.has(r.date));

        const deletePromises = toDelete.map(r => deleteDoc(doc(db, "availabilities", `${config.pi}_${r.date}`)));
        await Promise.all(deletePromises);

        await this.saveAvailability(config.pi, finalRows);
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

    async ensureDefaults(_pi: string): Promise<void> {
        // Disabled by user request - defaults should not be created automatically
        // Instead, valid developers must be imported via CSV or added manually
        return;
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
