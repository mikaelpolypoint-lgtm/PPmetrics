
const admin = require('firebase-admin');

// Initialize Source App (metrics-96e88)
const sourceApp = admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'metrics-96e88'
}, 'source');

// Initialize Dest App (mikael-vibe-apps)
const destApp = admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'mikael-vibe-apps'
}, 'dest');

const sourceDb = sourceApp.firestore();
const destDb = destApp.firestore();

const COLLECTIONS = [
    'teams',
    'topics',
    'features',
    'stories',
    'everhourEntries',
    'sprintMetrics'
];

async function migrate() {
    console.log('Starting migration...');

    for (const colName of COLLECTIONS) {
        console.log(`Migrating collection: ${colName}...`);
        const snapshot = await sourceDb.collection(colName).get();

        if (snapshot.empty) {
            console.log(`  No documents in ${colName}.`);
            continue;
        }

        const batchSize = 400; // Batch limit is 500
        let batch = destDb.batch();
        let count = 0;
        let total = 0;

        for (const doc of snapshot.docs) {
            const data = doc.data();
            const ref = destDb.collection(colName).doc(doc.id);
            batch.set(ref, data);
            count++;
            total++;

            if (count >= batchSize) {
                await batch.commit();
                console.log(`  Committed batch of ${count} docs.`);
                batch = destDb.batch();
                count = 0;
            }
        }

        if (count > 0) {
            await batch.commit();
            console.log(`  Committed final batch of ${count} docs.`);
        }

        console.log(`  Finished ${colName}: ${total} docs migrated.`);
    }

    console.log('Migration complete!');
    process.exit(0);
}

migrate().catch(console.error);
