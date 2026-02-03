# Firebase Roles Setup Guide

This guide explains how to set up the role-based security for your application using Firebase Authentication and Firestore.

## 1. Overview
We have implemented a role system with three levels:
1.  **admin**: Full access to everything (Read/Write).
2.  **agile**: Read access to everything. Write access ONLY to Availabilities.
3.  **developer**: Read access ONLY to Capacity Dashboard & Availabilities. Write access ONLY to Availabilities.

## 2. Deploy Security Rules
The rules are defined in `firestore.rules`. Deploy them to enforce security on the server:

```bash
firebase deploy --only firestore:rules
```

*These rules ensure that even if a user bypasses the UI config, they cannot read sensitive data or write where forbidden.*

## 3. Creating the "users" Collection
Since we moved to Firestore-based roles, you need to manually assign roles to users.

### Structure
- **Collection Name**: `users`
- **Document ID**: The User's Firebase UID (You can copy this from the Authentication tab in Firebase Console).
- **Fields**:
  - `role` (string): One of `"admin"`, `"agile"`, `"developer"`.

### How to set the first Admin (Bootstrap)
Since only Admins can write to the `users` collection, you need to manually create your own Admin record in the Firebase Console first.

1.  Go to **Firebase Console** -> **Firestore Database**.
2.  Click **Start Collection** (if users doesn't exist) or **Add Document**.
3.  **Collection ID**: `users`
4.  **Document ID**: *Paste your UID here* (e.g., `abc123xyz...`).
    - *To find your UID: Go to Authentication -> Users table -> Copy the "User UID" column.*
5.  **Field**: `role`
6.  **Type**: `string`
7.  **Value**: `admin`
8.  Click **Save**.

Once you are an Admin, you can (in the future) build a UI to manage other users, or simply continue adding them via the Console.

## 4. Verifying Access
- **Admin**: Log in. You should see all menu items and have edit buttons on Teams/Developers.
- **Agile**: Change your role to `agile` in the Console.
    - Refresh the app.
    - You should see all pages.
    - Go to **Teams**: Edit/Delete buttons should be GONE.
    - Go to **Capacity Availabilities**: You CAN edit.
- **Developer**: Change your role to `developer` in the Console.
    - Refresh the app.
    - You should be redirected to `Capacity Dashboard`.
    - You should NOT see Teams, Jira, etc. in the menu (or access them via URL).
    - You CAN edit **Capacity Availabilities**.

## Troubleshooting
- **"Missing or insufficient permissions"**: Check the Browser Console. This means the Firestore Rules rejected your request. Verify your user document exists and has the correct `role` string.
