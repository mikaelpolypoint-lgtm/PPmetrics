# Firebase Migration Guide: Private to Company Account

This guide outlines the steps to migrate your web application from `metrics-96e88` (Private) to `mikael-vibe-apps` (Company).

**Prerequisites:**
- You must be logged in to both accounts or have permissions on both projects.
- `firebase-tools` and `gcloud` CLI installed (You have both).

---

## Phase 1: Data Migration (Firestore)

Since you want to keep all data, we will export it from the old project and import it into the new one.

### 1. Login to Google Cloud
Open your terminal:
```bash
gcloud auth login
```
*Follow the browser flow to log in with your account that has access to `metrics-96e88`.*

### 2. Set Active Project to Source
```bash
gcloud config set project metrics-96e88
```

### 3. Create a Storage Bucket for Transfer
Data must be exported to a Cloud Storage bucket.
```bash
gsutil mb -l europe-west6 gs://metrics-migration-transfer
# Note: 'europe-west6' is Zurich. You can use 'us-central1' if preferred.
# If the bucket name is taken, try adding random numbers: gs://metrics-migration-[random]
```

### 4. Export Data to Bucket
```bash
gcloud firestore export gs://metrics-migration-transfer/backup-2026
```

### 5. Switch to Destination Project
*If the company project is on a different Google Account, you might need to run `gcloud auth login` again with that email.*

```bash
gcloud config set project mikael-vibe-apps
```

### 6. Grant Access (Important)
The destination project needs permission to read from the source bucket.
```bash
# Get the project number of the NEW project (mikael-vibe-apps)
gcloud projects describe mikael-vibe-apps --format="value(projectNumber)"
# It will output a number, e.g., 123456789. Copy it.

# Grant Storage Admin to the new project's service account on the OLD bucket
gsutil iam ch serviceAccount:[NEW_PROJECT_NUMBER]@cloudservices.gserviceaccount.com:roles/storage.admin gs://metrics-migration-transfer
```

### 7. Import Data
```bash
gcloud firestore import gs://metrics-migration-transfer/backup-2026
```

---

## Phase 2: Authentication Migration (Users)

If you have users logging in, you need to migrate them.

1. **Export Users (from old)**:
   ```bash
   firebase use metrics-96e88
   firebase auth:export users_backup.csv --format=csv
   ```

2. **Import Users (to new)**:
   ```bash
   firebase use mikael-vibe-apps
   # Note: You need to enable 'Authentication' in the Firebase Console for the new project first!
   firebase auth:import users_backup.csv --hash-algo=SCRYPT --rounds=8 --mem-cost=14
   ```
   *(Note: The hash parameters might vary. If you used default Firebase Auth, simply exporting/importing JSON might be easier or check the specific algorithm used in the console).*

---

## Phase 3: Application Configuration

You need to tell the code to talk to the new backend.

1. **Go to Firebase Console** -> Project Settings (for `mikael-vibe-apps`).
2. **Create a Web App** (if not exists) and copy the `firebaseConfig` object.
3. **Update `src/lib/firebase.ts`**:
   Replace the `firebaseConfig` const with the new values.

4. **Update `.firebaserc`**:
   Change the default project alias:
   ```json
   {
     "projects": {
       "default": "mikael-vibe-apps"
     }
   }
   ```

---

## Phase 4: Deployment & CI/CD

1. **Test Locally**:
   ```bash
   npm run dev
   ```
   Check if data appears (it should show the imported data).

2. **Generate New Deployment Token**:
   Since the target project changed, you probably need a new token if the CI user changes, or just to be safe.
   ```bash
   firebase login:ci
   ```
   *Login with the account that has access to `mikael-vibe-apps`.*

3. **Update Azure DevOps**:
   - Go to Pipelines -> Library -> `FirebaseCredentials` variable group.
   - Update `FIREBASE_TOKEN` with the new one.

4. **Push to Deploy**:
   ```bash
   git add .
   git commit -m "chore: Migrate to mikael-vibe-apps"
   git push azure main
   ```

Your app will now be live at `https://mikael-vibe-apps.web.app` (or similar).
