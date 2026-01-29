import { db } from '../lib/firebase';
import { collection, getDocs, setDoc, doc, query, where, deleteDoc, getDoc } from 'firebase/firestore';
import type { CapacityDeveloper, CapacityAvailability, CapacityImprovement, PIConfiguration, EverhourTeamData } from '../types/capacity';
import type { Story } from '../types';

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
    },

    async getSprintCapacityMetrics(pi: string): Promise<Record<string, Record<string, { dev: number, maintain: number, manage: number, absence: number, sp: number }>>> {
        const [devs, avails] = await Promise.all([
            this.getDevelopers(pi),
            this.getAvailabilities(pi)
        ]);

        // Structure: TeamName -> SprintName -> Metrics
        const metrics: Record<string, Record<string, any>> = {};
        const initMetrics = () => ({ dev: 0, maintain: 0, manage: 0, absence: 0, sp: 0 });

        const sprintsMap = new Map<string, CapacityAvailability[]>();
        avails.forEach(row => {
            if (!sprintsMap.has(row.sprint)) sprintsMap.set(row.sprint, []);
            sprintsMap.get(row.sprint)!.push(row);
        });

        for (const [sprintName, rows] of sprintsMap.entries()) {
            // Include all sprints found in availability (including IP if present in rows, though usually filtered in UI)
            const sprintTotalDays = rows.length;

            devs.forEach(dev => {
                if (dev.specialCase) return;

                const team = dev.sprintTeams?.[sprintName] || dev.team;
                if (!team) return;

                if (!metrics[team]) metrics[team] = {};
                if (!metrics[team][sprintName]) metrics[team][sprintName] = initMetrics();

                const m = metrics[team][sprintName];

                // Also accumulate for H1 if Hydrogen 1
                const mH1 = (team === 'Hydrogen 1') ? (
                    (!metrics['H1'] ? (metrics['H1'] = {}) : metrics['H1']),
                    (!metrics['H1'][sprintName] ? (metrics['H1'][sprintName] = initMetrics()) : metrics['H1'][sprintName])
                ) : null;

                const dailyHours = Number(dev.dailyHours) || 8;
                const workRatio = Number(dev.workRatio) || 0;
                const load = Number(dev.load) || 90;
                const developRatio = Number(dev.developRatio) || 0;
                const maintainRatio = Number(dev.maintainRatio) || 0;
                const manageRatio = Number(dev.manageRatio) || 0;
                const velocity = Number(dev.velocity) || 0;

                const dailyDevH = (dailyHours * (load / 100) * (developRatio / 100));
                const dailyMaintainH = (dailyHours * (load / 100) * (maintainRatio / 100));
                const dailyManageH = (dailyHours * (load / 100) * (manageRatio / 100));
                const dailySP = (dailyDevH / 8) * velocity;
                const totalH = dailyDevH + dailyMaintainH + dailyManageH;

                let availDays = 0;
                rows.forEach(r => {
                    const val = r[dev.key];
                    const num = (val === undefined || val === null || val === '') ? 1 : Number(val);
                    if (!isNaN(num)) availDays += num;
                });

                // Absence Logic matching CapacityDashboard
                const expectedDays = sprintTotalDays * (workRatio / 100);
                const deltaDays = expectedDays - availDays;
                const absenceHours = deltaDays * totalH;

                // Add to current team
                m.dev += availDays * dailyDevH;
                m.maintain += availDays * dailyMaintainH;
                m.manage += availDays * dailyManageH;
                m.sp += availDays * dailySP;
                m.absence += absenceHours;

                // Add to H1 alias if applicable
                if (mH1) {
                    mH1.dev += availDays * dailyDevH;
                    mH1.maintain += availDays * dailyMaintainH;
                    mH1.manage += availDays * dailyManageH;
                    mH1.sp += availDays * dailySP;
                    mH1.absence += absenceHours;
                }
            });
        }

        // Round all values to integers before returning
        Object.values(metrics).forEach(teamMetrics => {
            Object.values(teamMetrics).forEach(m => {
                m.dev = Math.round(m.dev);
                m.maintain = Math.round(m.maintain);
                m.manage = Math.round(m.manage);
                m.sp = Math.round(m.sp);
                m.absence = Math.round(m.absence);
            });
        });

        return metrics;
    },

    // --- Everhour Actuals ---
    async getEverhourData(pi: string): Promise<EverhourTeamData[]> {
        const q = query(collection(db, "everhour_capacities"), where("pi", "==", pi));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => d.data() as EverhourTeamData);
    },

    async saveEverhourData(data: EverhourTeamData): Promise<void> {
        await setDoc(doc(db, "everhour_capacities", `${data.pi}_${data.team}`), data);
    },

    async getSprintActualMetrics(pi: string, stories: Story[]): Promise<Record<string, Record<string, { dev: number, maintain: number, manage: number, sp: number }>>> {
        const [everhourData, avails] = await Promise.all([
            this.getEverhourData(pi),
            this.getAvailabilities(pi)
        ]);

        // Structure: Team -> SprintName -> Metrics
        const metrics: Record<string, Record<string, { dev: number, maintain: number, manage: number, sp: number }>> = {};
        const initMetrics = () => ({ dev: 0, maintain: 0, manage: 0, sp: 0 });

        // 1. Process Everhour (Hours)
        everhourData.forEach(teamData => {
            const team = teamData.team;
            if (!metrics[team]) metrics[team] = {};

            if (teamData.rows) {
                teamData.rows.forEach(row => {
                    Object.entries(row.sprints).forEach(([sprintKey, hours]) => {
                        // sprintKey is "S1", "S2"... "S6"
                        // Map "S6" to "IP" for consistence if needed, or stick to suffix
                        // The SprintMetrics UI expects full name "26.1-S1" to parse index
                        // OR we can produce "26.1-S1" here.

                        let suffix = sprintKey;
                        if (sprintKey === 'S6') suffix = 'IP';

                        const sprintName = `${pi}-${suffix}`;

                        if (!metrics[team][sprintName]) metrics[team][sprintName] = initMetrics();

                        if (row.category === 'Dev') metrics[team][sprintName].dev += hours;
                        if (row.category === 'Maintain') metrics[team][sprintName].maintain += hours;
                        if (row.category === 'Manage') metrics[team][sprintName].manage += hours;
                    });
                });
            }
        });

        // 2. Process Jira (SP)
        const dateToSprint = new Map<string, string>();
        avails.forEach(row => {
            dateToSprint.set(row.date, row.sprint);
        });

        const normalizeStatus = (status: string) => {
            const s = status.toLowerCase();
            if (s === 'done' || s === 'closed') return 'Done';
            return s;
        };

        stories.forEach(story => {
            if (story.pi !== pi) return;
            if (normalizeStatus(story.status) !== 'Done') return;

            if (!story.since) return;

            // Parse since "dd.mm.yy" -> "YYYY-MM-DD"
            // Format usually "18.09.25"
            const parts = story.since.split('.');
            if (parts.length !== 3) return;
            const isoDate = `20${parts[2]}-${parts[1]}-${parts[0]}`;

            const sprint = dateToSprint.get(isoDate);
            if (!sprint) return;

            // Check if mappings are correct for "Hydrogen 1" -> "H1"
            let team = story.team;
            if (team === 'Hydrogen 1') team = 'H1';

            if (!metrics[team]) metrics[team] = {};
            if (!metrics[team][sprint]) metrics[team][sprint] = initMetrics();

            metrics[team][sprint].sp += (story.sp || 0);
        });

        // Round all actuals to nearest integer
        Object.values(metrics).forEach(teamMetrics => {
            Object.values(teamMetrics).forEach(m => {
                m.dev = Math.round(m.dev);
                m.maintain = Math.round(m.maintain);
                m.manage = Math.round(m.manage);
                m.sp = Math.round(m.sp);
            });
        });

        return metrics;
    }
};
