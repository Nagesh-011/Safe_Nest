# 🛡️ SafeNest - Senior Safety & Emergency App

**Product overview:** SafeNest helps seniors stay safe at home by detecting falls, guiding them through SOS flows, and keeping medicine schedules reliable—even without internet—while caregivers get timely alerts and context to act. Built for senior simplicity and caregiver trust, the app remains usable offline and syncs when connectivity returns.

## 📥 Download / Build

- Latest dev build: generate locally via `npm run android:build` (output: `android/app/build/outputs/apk/debug/app-debug.apk`).
- Release build: `npm run build && npx cap sync && cd android && gradlew.bat assembleRelease` then sign `app-release-unsigned.apk` with your keystore.
- Install on device: enable “Install from unknown sources”, copy the APK, install, and grant permissions (location, notifications, exact alarms on Android 12+).

## ✨ Features (current)

- Offline-first actions: local cache + queued writes for medicines, vitals, health logs, and appointments; auto-flush on reconnect.
- Medicine reminders: exact-alarm permission banner, background reminders, snooze/skip/taken flows, refill tracking, caregiver alerts for missed doses.
- Fall detection: native monitoring with cooldown, countdown UX, and caregiver notifications.
- Emergency system: SOS countdown, lock-screen shortcut/widget handling, voice emergency trigger, direct call handoff.
- Caregiver dashboard: multi-household support, medicine logs, vitals, location/status, alerts, and notifications.
- Geofence & water reminders: background geofence initialization and hydration nudges for seniors.
- Multi-language: English, Hindi, Marathi with runtime switching.

## 🧭 How to Use the App (first run)

1) Install the APK, open the app, and complete the brief onboarding.
2) Add a caregiver contact (name and phone) so alerts have a destination.
3) Grant permissions when prompted: notifications, exact alarms (Android 12+), and location (for geofence/help context).
4) Set or confirm medicines and reminder times; background reminders will schedule automatically.
5) If a fall is detected or SOS is triggered, the senior sees a countdown; caregivers get notifications and can view status/med logs. Offline actions are queued and sync when back online.

## 🎥 Demo Assets

- Screenshot 1: Home/Senior dashboard (placeholder: add image link here)
- Screenshot 2: SOS countdown and alert state (placeholder: add image link here)
- Screenshot 3: Medicine reminder banner with exact-alarm prompt (placeholder: add image link here)
- Optional video demo (Loom/YouTube): add link here

## 👥 User Roles

- Senior: Runs the app on-device, receives reminders, can trigger SOS/voice emergency, and views simple status.
- Caregiver: Receives alerts/notifications, reviews medicine logs, vitals, and household status; can switch households if caring for multiple seniors.
- Household switching (caregiver): Multi-household listeners surface status, meds, and logs per household.

## 🌟 Core Differentiators

- Offline-first reliability: cached reads + queued writes for meds, vitals, and logs, with auto-flush on reconnect.
- Exact-alarm aware reminders: in-app banner to open system settings for reliable medication alarms on Android 12+.
- Real-time escalation chain: SOS/fall countdown with caregiver notifications and background missed-dose alerts.
- Multi-language accessibility: English, Hindi, Marathi with runtime switching.
- Background helpers: geofence monitoring, hydration nudges, and lock-screen/widget SOS handling.

## ⚠️ Risks / Limitations

- Fall detection can produce false positives/negatives depending on device sensors and OEM power policies.
- iOS sensor access and background execution are more limited; Android has the best experience.
- No HIPAA/GDPR guarantees; intended for personal/caregiver use with standard Firebase rules.
- Reminders on heavily restricted OEMs may be “best effort” without granting exact alarms/battery exemptions.
- Connectivity is required to sync logs/alerts; offline actions queue but caregivers only see updates after sync.

## 🔒 Safety & Data Considerations

- Data store: Firebase Realtime Database and Auth; offline cache lives on-device (localStorage).
- Access: Caregivers see only households they’re linked to; seniors operate their own device profile.
- Permissions: Exact alarms for reliable meds; notifications for alerts; location for geofence/help context.
- Connectivity loss: Actions queue locally; reminders continue if scheduled; sync resumes on reconnect.

## 🛠️ Tech Stack

| Component | Version |
|-----------|---------|
| React + TS | React 19.2.3, TypeScript 5.8.2 |
| Build Tool | Vite 6.2.0 |
| Mobile Bridge | Capacitor 8.0.0 (Android/iOS) |
| Backend | Firebase 12.6.0 (Realtime DB, Auth, Messaging) |
| Notifications | @capacitor/local-notifications 8.0.0 |
| Android | Gradle 8.14.x, Target 36, Min 24 |

## 📦 Installation & Setup

### Prerequisites
- Node.js 18+
- Android SDK (for APK builds)
- Git

### Local Development
```bash
git clone https://github.com/yourusername/safenest.git
cd safenest
npm install
npm run dev
# visit http://localhost:5173
```

### Android builds
```bash
# Sync web -> native
npm run sync

# Debug APK
npm run android:build
# or open in Android Studio
npm run android

# Release (unsigned)

cd android && gradlew.bat assembleRelease
# then sign app-release-unsigned.apk with apksigner/jarsigner
```

## 📂 Project Structure

```
safenest/
├── App.tsx                 # Main app wiring, offline queue, banners
├── components/             # UI components
├── views/                  # Screens (Senior, Caregiver, SOS, etc.)
├── services/               # Firebase, reminders, fall detection, offline store, network
├── hooks/                  # Sensors and app utilities
├── i18n/                   # Language context and translations
├── utils/                  # Helpers (sanitize, etc.)
├── public/                 # Static assets
├── android/                # Capacitor Android project
├── ios/                    # Capacitor iOS project
└── package.json
```

## 🔑 Key Components

- Offline queue & cache: `services/offlineStore.ts` with `processQueue` flush on reconnect in [App.tsx](App.tsx#L252-L279).
- Network awareness: `services/network.ts` lightweight online/offline detection.
- Medicine reminders: `services/backgroundReminders.ts` plus exact-alarm permission banner in [App.tsx](App.tsx#L120-L152) and medicine handlers offline-enabled in [App.tsx](App.tsx#L2532-L2744).
- Fall detection: `services/fallDetection.ts` native integration with alerts and cooldown.
- Emergency flows: `views/FallCountdown.tsx`, `views/SOSCountdown.tsx`, `views/EmergencyActive.tsx`, and widget/lock-screen handlers.
- Geofence + water reminders: initialized for seniors in [App.tsx](App.tsx#L2259-L2285).

## ⚙️ Configuration

### Firebase (Realtime DB)
1. Create a Firebase project and add an Android app.
2. Download `google-services.json` into `android/app/`.
3. Enable Realtime Database, Auth, and Cloud Messaging; set appropriate DB rules.

### Environment variables
Create `.env.local` in the root:
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

## 🔒 Permissions Notes

- Exact alarms (Android 12+): the in-app banner opens system settings; grant to ensure reliable medicine reminders.
- Notifications: required for caregiver alerts, reminders, and emergencies.
- Location: used for geofence and caregiver visibility.

## 🔧 Troubleshooting

- Exact alarms banner does nothing: reopen the app and tap the banner; some OEMs require the “Allow exact alarms” toggle under App Info → Alarms & reminders.
- Reminders not firing offline: ensure the medicine was scheduled once online; background reminders persist but syncing logs needs connectivity to flush the queue.
- Build errors: run `npm install`, `npm run sync`, then `cd android && gradlew.bat clean assembleDebug`.

## 📄 License

MIT License (see LICENSE).

## 📅 Status

- Last updated: January 2026
- Current focus: offline-first sync for medicines, vitals, and caregiver alerts
- ⏱️ Implements 5-second cooldown to prevent false triggers

## 🗺️ Roadmap

**Completed**
- Offline queue/cache for medicines, vitals, logs, appointments with auto-flush on reconnect
- Exact-alarm permission banner and background medicine reminders
- SOS/fall countdown flows with caregiver notifications
- Multi-language (English/Hindi/Marathi) and caregiver multi-household support

**In-progress / Stretch**
- Broader offline caching (contacts, reminders, appointments media)
- Additional device/OEM hardening for alarms on restrictive power modes
- Expanded safety reporting and caregiver audit/history views
