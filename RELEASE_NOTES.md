# Release Notes - BlackBunny v2.0.0

Welcome to **BlackBunny v2.0.0**! This release introduces massive feature additions, native module upgrades, and user interface refinements to provide a top-tier music listening experience.

---

## Key Highlights

### 1. Native Equalizer & Bass Boost
* **System-level Audio Processing:** A native Android Equalizer module is integrated to manage multi-band gains and bass boost settings directly.
* **Audio Presets:** Quickly select from built-in audio signatures including *Flat, Signature, Acoustic, Bass Boost, Dolby Open/Rich/Focused, Dirac Music/Movie/Game, Pop, Rock, Electronic, Jazz,* and *Voice*.
* **Interactive SVG Visualizer:** A fully responsive SVG equalizer curve interface that lets you view and drag band gains in real time.
* **Simple & Advanced Modes:** Switch between clean UI presets/sliders and a detailed custom audio frequency graph.

### 2. 👥 Music Party (Local Playback Sync & Spatial Audio)
* **Local Peer Discovery (NSD):** Discover and connect with other devices on the same Wi-Fi network using Android Network Service Discovery.
* **Synchronized Playback:** Host or join a party to sync track playing, pausing, and seeking with other listeners.
* **Spatial Audio Canvas:** A 2D grid allows dragging listener nodes relative to the source. The system dynamically updates client volume/panning offsets based on coordinates on the grid.

### 3. Sleep Timer
* **Flexible Durations:** Set playback to pause after 5, 15, 30, 45, or 60 minutes.
* **End of Track Mode:** Stop music playback automatically when the currently playing track finishes.
* **Active Status HUD:** Keep track of the remaining time with an active status header in the sleep timer panel.

### 4. ⚡ Speed Dial & Home Screen Refinements
* **Pinned Quick Access Grid:** A paginated 2x3 grid (Speed Dial) on the home screen allowing you to pin, reorder, and quickly launch your favorite tracks, albums, playlists, or artists.
* **Dynamic Feed Sections:** Native YouTube Music home feed integration with horizontal carousels (`HomeSectionCarousel`) and customized content rendering.

### 5.  Upgraded Downloads & Queue Manager
* **Concurrent Download Queue:** Optimized management of background downloads with real-time download status hooks, notifications, and storage persistence.
* **Native Blob Utils:** Integrated `react-native-blob-util` with dedicated patches to resolve file path write/read issues on newer Android SDK levels.

### 6. User Interface & Community Standard
* **Modern Icon System:** Standardized the application UI using `lucide-react-native` icons for consistency.
* **Open Source Readiness:** Added standard developer guidelines including `CODE_OF_CONDUCT.md` and `CONTRIBUTING.md`.

---

## 🛠️ Technical Details & Refactoring
* Native Android libraries added to `modules/equalizer` and `modules/nsd` for hardware-accelerated processing and peer discovery.
* Custom Expo configuration plugins in `plugins/withAppConfiguration.js` to automate native Android Gradle and package builds.
* Refactored `contexts/app-theme-context.tsx` to persist and synchronize Equalizer values.
* Added `PlaybackService.ts` hooks for client network clock offsets and sleep timer triggers.
