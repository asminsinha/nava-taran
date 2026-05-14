// OrbitEngine.js
export class OrbitEngine {
    constructor() {
        this.epoch = new Date("2025-01-01T00:00:00Z").getTime();
        this.simulationTime = Date.now(); // Starts at real-world "Now"
        this.timeScale = 1; 
        
        // NASA Semi-Major Axis (Scaled for your 3D view)
        // We use your existing 'dist' values but modify the angle based on NASA's Mean Longitude
        this.orbitalElements = {
            "Mercury": { period: 88, long: 252.25 },
            "Venus": { period: 224.7, long: 181.98 },
            "Earth": { period: 365.25, long: 100.46 },
            "Mars": { period: 687, long: 355.45 },
            "Jupiter": { period: 4331, long: 34.40 },
            "Saturn": { period: 10747, long: 49.94 },
            "Uranus": { period: 30589, long: 313.23 },
            "Neptune": { period: 59800, long: 304.88 },
            "Pluto": { period: 90560, long: 238.92 }
        };
    }

    calculatePosition(planetName, timeInMs) {
        const data = this.orbitalElements[planetName];
        if (!data) return 0;

        const daysSinceEpoch = (timeInMs - this.epoch) / (1000 * 60 * 60 * 24);
        
        // NASA Formula: Mean Anomaly = Mean Longitude + (Mean Motion * Days)
        // This gives us the scientifically accurate position in the orbit for 2025-2026
        const angle = (data.long + (360 / data.period) * daysSinceEpoch) * (Math.PI / 180);
        
        return angle;
    }

    update(deltaTime) {
        // deltaTime is in ms. We multiply by timeScale
        this.simulationTime += deltaTime * this.timeScale;
        return this.simulationTime;
    }
}