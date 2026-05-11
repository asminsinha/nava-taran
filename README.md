# NAVA-TARAN: Space Intelligence & Exploration Dashboard

**NAVA-TARAN** (Sanskrit for *"The New Crossing"*) is a high-fidelity, multi-modal Space Intelligence Interface. It is engineered to bridge the gap between complex astrophysical datasets and intuitive human-machine interaction, transforming raw astronomical data into a responsive, tactical Heads-Up Display (HUD).

---

## Overview
Unlike standard static data-visualizers, NAVA-TARAN simulates the operational environment of a deep-space pilot or planetary scientist. It prioritizes "Intelligence-at-a-glance" through a unified, AI-powered command center.

## Core Technical Stack
* **Frontend:** React.js with a component-based architecture for high-frequency UI updates.
* **Intelligence Layer:** Gemini 1.5 Flash API acting as a "Neural Link" for context-aware conversational retrieval.
* **Backend & Auth:** Supabase (PostgreSQL) for secure session storage and Row Level Security (RLS).
* **Visual Engine:** Hybrid implementation using CSS3 Advanced Animations and Three.js/Canvas for interactive 3D spatial depth.
* **Architecture:** Migrated to a **Serverless Function architecture** on Vercel for zero-downtime scalability.

---

## The Three-Sector Paradigm
The system is partitioned into three specialized operational sectors:

### Sector I: Terrestrial (Earth Core)
* **Focus:** High-resolution Earth observation and localized telemetry.
* **Features:** Live Geospatial visualization, Bhuvan Uplink integration, and Terra Hazard monitoring.

### Sector II: Planetary (Sol-Nexus)
* **Focus:** Mathematically synchronized visualization of the Solar System.
* **Algorithm:** Implements a **Logarithmic Scaling Algorithm (AU-to-Pixel)** to maintain legibility across vast distances.
* **Physics:** Physics-driven animations based on actual orbital period ratios.

### Sector III: Galactic (Deep Space)
* **Focus:** Exploration of exoplanetary systems using a curated catalog of 50 confirmed NASA exoplanets.
* **Analytics:** Includes a proprietary **Habitability Indexing** formula to evaluate potential colonization candidates.

---

## Operational Manual (How to Use)

### 1. Authentication & Pilot Login
* **Accessing the Vault:** Click on the **Login/Sign-up** module in the header.
* **Data Persistence:** Once signed in, your mission state and "Pilot Profile" are stored in the Supabase Global Vault. 
* **Decommissioning:** You can safely log out or "Retire Profile" (Delete Account) to remove your data from the cloud instance.

### 2. Navigating the Sol-Nexus (Planetary Map)
* **Interactive HUD:** Use the sidebar to toggle between planets.
* **Orbital Data:** Hovering over a planet triggers a real-time data dump including mass, gravity, and distance from the Sun.
* **Visual Controls:** The Sol-Nexus uses procedural rendering; you can zoom and rotate the 3D planetary models to inspect surface textures.

### 3. Deep Space Telemetry (Exoplanets)
* **NASA Uplink:** This sector pulls live data from the NASA Exoplanet Archive.
* **Habitability Check:** Select a planet to see its **Habitability Index**. The system calculates this based on effective temperature, planetary radius, and orbital distance.
* **Filtering:** Use the telemetry panel to view specific discovery methods (e.g., Transit or Radial Velocity).

### 4. Terrestrial Scanning (Earth/Bhuvan)
* **Geospatial Integration:** Access the "Earth Core" to view live satellite imagery and hazard alerts.
* **Satellite Tracking:** The HUD tracks 5 key Indian Satellites in real-time. If the telemetry shows "Comms Failure," ensure the backend serverless functions are active.

### 5. AI Station Commander (Gemini Chat)
* **Neural Link:** Click the AI icon to open the command console.
* **Commands:** You can ask the AI about specific planetary data or general cosmos queries. It is grounded in scientific data to prevent hallucinations.

---

## Engineering Excellence
* **GPU-Accelerated Compositing:** Utilizes 3D Transforms (`translate3d`) to offload rendering from the CPU to the GPU, maintaining a smooth 60 FPS.
* **Hallucination Mitigation:** Implements a "Data-First" injection method for the Gemini API, ensuring the AI remains grounded in raw numerical data.
* **Heuristic UI Adaptation:** The interface dynamically shifts its "color temperature" and layout variables based on the active mission sector.

---

## Installation & Setup

1.  **Clone the Repository:**
    ```bash
    git clone [https://github.com/your-username/nava-taran.git](https://github.com/your-username/nava-taran.git)
    cd nava-taran
    ```

2.  **Install Dependencies:**
    ```bash
    npm install
    ```

3.  **Environment Variables:**
    Create a `.env` file in the root and add your keys:
    ```env
    GEMINI_API_KEY=your_key_here
    SUPABASE_URL=your_supabase_url
    SUPABASE_ANON_KEY=your_anon_key
    N2YO_API_KEY=your_n2yo_key_for_satellites
    ```

4.  **Run Locally:**
    ```bash
    npm start
    ```

---

**Project Developed by:** Asmin Sinha (24BAI0181)   
**Institution:** Vellore Institute of Technology (VIT)
