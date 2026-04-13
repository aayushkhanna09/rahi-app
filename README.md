# RAही (Rahi) - AI Travel Companion 🗺️

RAही is a modern, React Native-based travel companion app that helps users explore, plan, and organize their trips. Powered by AI and real-time mapping, RAही acts as your personal guide to discovering incredible destinations.

## ✨ Features

- **🤖 AI Trip Planner**: Generate customized, multi-day itineraries using the power of LLaMA 3 (via Groq API) based on budget, vibe, and duration.
- **🗺️ Interactive Maps**: Built-in detailed maps (via React Native Maps) with Turf.js for location processing and GeoJSON data handling.
- **🔐 Secure Authentication**: Full user signup/login flows powered by Firebase Authentication.
- **☁️ Cloud Syncing**: Save trips, profiles, and data seamlessly with Firebase Firestore.
- **🔔 Push Notifications**: Stay updated on the go with Expo Notifications.
- **📱 Cross-Platform**: Runs beautifully on both Android and iOS (built with Expo).

## 🛠️ Tech Stack

- **Framework:** [React Native](https://reactnative.dev/) & [Expo](https://expo.dev/)
- **Language:** TypeScript
- **Navigation:** React Navigation (Stack & Bottom Tabs)
- **Backend/BaaS:** [Firebase](https://firebase.google.com/) (Auth, Firestore)
- **AI Integration:** [Groq AI (LLaMA 3)](https://console.groq.com/)
- **Mapping:** `react-native-maps` & `@turf/turf`
- **Storage:** Expo Secure Store & React Native Async Storage

## 🚀 Getting Started

### Prerequisites
Make sure you have the following installed:
- Node.js (v18 or newer)
- npm or yarn
- Expo Go app on your physical device, or an iOS Simulator / Android Emulator.

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/aayushkhanna09/rahi-app.git
   cd rahi-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Environment Variables**
   Create a `.env` file in the root directory and add your secret keys. **Do not commit this file!**
   ```env
   # .env
   EXPO_PUBLIC_GROQ_API_KEY=your_groq_api_key_here
   ```
   *(Note: Ensure your Firebase config is also properly set up in `src/config/firebase.ts`)*

4. **Run the app**
   ```bash
   npx expo start --clear
   ```

   - Press `a` to run on an Android emulator.
   - Press `i` to run on an iOS simulator.
   - Scan the QR code using the **Expo Go** app on your physical phone to test locally.

## 📂 Project Structure

```text
rahi-app/
├── src/
│   ├── config/       # Firebase and other third-party configurations
│   ├── navigation/   # Stack and Tab Navigators
│   ├── screens/      # Main UI screens (Home, Planner, Profile, etc.)
│   ├── data/         # Offline data mockups (e.g. GeoJSON for borders)
│   └── components/   # Reusable UI components
├── App.tsx           # Application entry point
├── .env              # Local environment variables (Ignored in Git)
├── package.json      # Dependencies and scripts
└── app.json          # Expo configuration
```
