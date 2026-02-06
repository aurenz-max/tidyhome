# Firebase Setup Instructions

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or "Create a project"
3. Enter a project name (e.g., "tidyhome-ai")
4. (Optional) Enable Google Analytics
5. Click "Create project"

## Step 2: Set up Firestore Database

1. In your Firebase project, go to **Build > Firestore Database**
2. Click "Create database"
3. Choose **Start in test mode** (for development)
   - Note: You'll want to update security rules later for production
4. Select a Firestore location (choose one close to your users)
5. Click "Enable"

## Step 3: Register Your Web App

1. In the Firebase Console, click the **gear icon** (⚙️) next to "Project Overview"
2. Select "Project settings"
3. Scroll down to "Your apps"
4. Click the **Web icon** (`</>`)
5. Register your app with a nickname (e.g., "TidyHome Web")
6. **Do NOT** check "Set up Firebase Hosting" (unless you want it)
7. Click "Register app"

## Step 4: Get Your Configuration

You'll see a code snippet like this:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.firebasestorage.app",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

## Step 5: Configure Your App

1. Copy `.env.local.template` to `.env.local`:
   ```bash
   cp .env.local.template .env.local
   ```

2. Open `.env.local` and fill in your Firebase configuration values:
   ```
   VITE_FIREBASE_API_KEY=AIza...
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
   VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
   ```

3. Save the file

## Step 6: Start Your App

```bash
npm run dev
```

The app will automatically:
- Connect to Firestore
- Initialize with default tasks (first time only)
- Enable real-time sync across devices

## Security Rules (Important for Production!)

Before deploying to production, update your Firestore security rules:

1. Go to **Firestore Database > Rules**
2. Replace the rules with something like:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // For now, allow all reads/writes (development only)
    match /{document=**} {
      allow read, write: if true;
    }

    // TODO: Add authentication and proper security rules
    // Example with auth:
    // match /users/{userId}/{document=**} {
    //   allow read, write: if request.auth != null && request.auth.uid == userId;
    // }
  }
}
```

## Next Steps

- [ ] Add Firebase Authentication (recommended)
- [ ] Update Firestore security rules
- [ ] Set up Cloud Functions (optional)
- [ ] Enable offline persistence
- [ ] Add backup/export functionality

## Troubleshooting

**Issue: "Property 'env' does not exist on type 'ImportMeta'"**
- Make sure `vite-env.d.ts` is in your project root
- Restart your TypeScript server in VS Code

**Issue: Firebase connection errors**
- Check that all environment variables are set correctly in `.env.local`
- Make sure `.env.local` is in your project root
- Restart your dev server after changing `.env.local`

**Issue: Permission denied errors**
- Check your Firestore security rules
- Make sure you're in test mode during development
