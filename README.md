# 🇮🇳 RAही (Rahi) - The Traveler's Social Network

![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Expo](https://img.shields.io/badge/Expo-1B1F23?style=for-the-badge&logo=expo&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)

**RAही** is a niche, aesthetic mobile social network designed exclusively for Indian travelers. It allows users to document their journeys, track geographic milestones (like counting unique Indian States visited), and interact with a community of explorers through an Instagram-style follow and activity system.

Developed as a 6th-semester B.Tech minor project.

## ✨ Core Features

* **🌍 Smart Check-in & State Tracker:** Automatically reverse-geocodes your GPS location to tag the exact Indian State or UT. The profile automatically calculates and displays the total number of unique states you've covered.
* **📸 Hybrid Content Feed:** A dynamic, responsive home feed that intelligently adjusts its layout based on the content. Photo posts prioritize visuals, while text-only posts adapt to highlight storytelling.
* **🤝 Instagram-Style Social Ecosystem:** * Send, accept, and decline follow requests.
  * Keep your travel map and photos private to followers only.
  * Real-time "Clock" activity feed for incoming requests and post likes.
* **🗺️ Interactive Travel Map:** Every GPS-tagged memory is plotted on a personalized, interactive profile map.
* **🔍 Discover & Search:** A dual-tab search engine to find specific places, landmarks, or fellow travelers.

## 🛠️ Tech Stack Architecture

**Frontend:**
* **React Native & Expo:** Cross-platform mobile framework.
* **React Navigation:** Seamless stack and tab-based routing.
* **React Native Maps:** Interactive mapping and geographic plotting.
* **Expo Location & Image Picker:** Device hardware integration for GPS and media.
* **React Native Safe Area Context:** Notch-compliant, modern UI rendering.

**Backend:**
* **Firebase Authentication:** Secure email/password user management.
* **Cloud Firestore (NoSQL):** Real-time database utilizing `onSnapshot` listeners for zero-latency feed updates.
* **Atomic Operations:** Utilizes Firestore Write Batches and increments to ensure data integrity for social counters (likes, followers).

## 🚀 Run Locally

To get this project up and running on your local machine:

1. **Clone the repository**
   ```bash
   git clone [https://github.com/aayushkhanna09/rahi-app.git](https://github.com/aayushkhanna09/rahi-app.git)
   cd rahi-app

2. Install dependencies
npm install
or if you use yarn:
yarn install

3. Firebase Configuration
Create a Firebase project and enable Authentication and Firestore.
Add your Firebase config keys to src/config/firebase.ts.
Ensure Firestore Rules are set up to allow authenticated reads/writes.

4. Start the Expo server
npx expo start
Scan the QR code with the Expo Go app on your physical device, or press a for Android emulator / i for iOS simulator.
