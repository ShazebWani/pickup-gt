# Setup guide

For someone who has never seen this repo before. You'll need a physical phone (iOS or Android) with the **Expo Go** app installed from the App Store / Play Store, and a computer on macOS or Windows.

## 1. Prerequisites

- [Node.js](https://nodejs.org) 20 or later
- [git](https://git-scm.com/)
- A phone and computer on the **same Wi-Fi network**

Check Node is installed:

```bash
node -v
```

## 2. Clone and install

```bash
git clone https://github.com/ShazebWani/pickup-gt.git
cd pickup-gt
cd app && npm install
cd ../server && npm install
```

## 3. Get Firebase credentials

This app needs its own Firebase project (it is not shared publicly for security reasons). Ask the project owner for access to the Firebase project, or create your own for local testing:

1. Go to the [Firebase Console](https://console.firebase.google.com/) and create a project.
2. Enable **Authentication > Sign-in method > Email/Password**.
3. Enable **Firestore Database** (start in production mode; the code writes/reads directly).
4. Under **Project settings > General**, add a Web app and copy the config values (`apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`).
5. Under **Project settings > Service accounts**, click **Generate new private key**. This downloads a JSON file — keep it secret, never commit it.

## 4. Configure environment variables

**App** (`app/.env`, copy from `app/.env.example`):

```bash
cd app
cp .env.example .env
```

Fill in the `EXPO_PUBLIC_FIREBASE_*` values from step 3.4. Leave `EXPO_PUBLIC_API_BASE_URL` empty for now — you'll set it in step 6.

**Server** (`server/.env`, copy from `server/.env.example`):

```bash
cd ../server
cp .env.example .env
```

Set `FIREBASE_SERVICE_ACCOUNT` to the **entire contents of the downloaded service account JSON, minified to one line**. On macOS/Linux:

```bash
node -e "console.log(JSON.stringify(require('/path/to/downloaded-key.json')))"
```

Paste the output as the value of `FIREBASE_SERVICE_ACCOUNT` in `server/.env`. On Windows (PowerShell), the same command works if Node is installed.

## 5. Run the server locally

```bash
cd server
npm run dev
```

You should see `Pickup GT API listening on port 3000`. Verify it in a browser: `http://localhost:3000/health` should show `{"ok":true}`.

## 6. Point the app at the server

The app needs a URL it can reach **from your phone**, not `localhost` (your phone isn't your computer).

- **Local server, phone on same Wi-Fi:** find your computer's LAN IP:
  - macOS: `ipconfig getifaddr en0`
  - Windows: `ipconfig` (look for "IPv4 Address")

  Set in `app/.env`:
  ```
  EXPO_PUBLIC_API_BASE_URL=http://<your-lan-ip>:3000
  ```

- **Deployed server on Render:**
  ```
  EXPO_PUBLIC_API_BASE_URL=https://<your-render-service>.onrender.com
  ```
  (See the main `README.md` for how to deploy the server to Render.)

## 7. Run the app

```bash
cd app
npx expo start
```

Scan the QR code with your phone:
- **iOS**: use the Camera app
- **Android**: use the Expo Go app's built-in scanner

The app should load with no native build step. Sign up with an email, password, and display name to get started.

## Troubleshooting

- **"Network request failed" when creating a game**: your phone and computer are probably not on the same Wi-Fi, or a firewall is blocking the port. Try the deployed Render URL instead.
- **First request after idle is slow**: Render's free tier spins down after inactivity. The app has a >60s timeout to accommodate this — just wait.
- **Android map looks watermarked or won't load**: you need your own Google Maps API key. See `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` in `app/.env.example`.
- **`expo start` can't be reached by your phone**: try `npx expo start --tunnel` (slower, but works across networks/VPNs).
