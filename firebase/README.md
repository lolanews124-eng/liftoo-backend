# Firebase service account (backend push)

1. [Firebase Console](https://console.firebase.google.com) → project **liftoo-6672b**
2. **Project settings** → **Service accounts** → **Generate new private key**
3. Save JSON here as `liftoo-6672b-service-account.json` (do not commit)
4. In `backend/.env`:

```env
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase/liftoo-6672b-service-account.json
```

Restart the API after adding the file.
