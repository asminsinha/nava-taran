const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());


let latestSatelliteData = [];
// SUPABASE 
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

console.log(" Global Vault Initialized (Supabase Cloud)");

const genAI = new GoogleGenerativeAI(process.env.AI_API_KEY);

// AUTHENTICATION

app.post('/api/auth/signup', async (req, res) => {
    const { name, email, phone, password } = req.body;
    try {
        const { data: existingUser } = await supabase
            .from('pilots')
            .select('email')
            .eq('email', email)
            .single();

        if (existingUser) return res.status(400).json({ message: "Pilot already registered." });

        const { error } = await supabase
            .from('pilots')
            .insert([{ name, email, phone, password, logbook: [] }]);

        if (error) throw error;

        res.status(201).json({ message: "Registration Successful", user: { name, email } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Database Error during registration." });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const { data: user, error } = await supabase
            .from('pilots')
            .select('*')
            .eq('email', email)
            .eq('password', password)
            .single();

        if (error || !user) return res.status(401).json({ message: "Invalid credentials." });

        const { password: _, ...userData } = user;
        res.json({ message: "Clearance Granted", user: userData });
    } catch (error) {
        res.status(500).json({ message: "Login failed." });
    }
});

app.delete('/api/auth/retire-profile', async (req, res) => {
    const { email } = req.body;
    try {
        const { error } = await supabase
            .from('pilots')
            .delete()
            .eq('email', email);

        if (error) throw error;
        res.json({ message: "Profile successfully decommissioned from the vault." });
    } catch (error) {
        console.error("Retirement Error:", error);
        res.status(500).json({ message: "System error during profile retirement." });
    }
});

app.post('/api/space-chat', async (req, res) => {
    const { message } = req.body;
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
        
        const prompt = `You are the NAVA-TARAN Station AI. Provide detailed, professional, and scientific information about the cosmos. Query: ${message}`;
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        res.json({ response: text });
    } catch (error) {
        console.error("AI Error Details:", error);
        res.status(500).json({ response: "Comms failure with AI Nexus. Ensure your API key is active and model name is correct." });
    }
});

app.get('/api/exoplanets', async (req, res) => {
    try {

        const query = `
            SELECT TOP 50 
            pl_name, hostname, st_teff, pl_orbper, pl_rade, pl_orbsmax, sy_dist, discoverymethod, disc_year 
            FROM ps 
            WHERE default_flag = 1 
            AND pl_rade IS NOT NULL 
            AND pl_orbsmax IS NOT NULL
            ORDER BY sy_dist ASC
        `.replace(/\s+/g, '+');

        const url = `https://exoplanetarchive.ipac.caltech.edu/TAP/sync?query=${query}&format=json`;
        const response = await axios.get(url);
        res.json(response.data);
    } catch (error) {
        console.error("Exoplanet Archive Error:", error.message);
        res.status(500).json({ message: "Deep Space Uplink Failure" });
    }
});

app.get('/api/satellite-scan', async (req, res) => {
    const KEY = process.env.N2YO_API_KEY;
    const satIds = [44804, 51656, 54361, 41752, 45026];
    
    try {
        const missionData = [];


        for (const id of satIds) {
            try {
                const url = `https://api.n2yo.com/rest/v1/satellite/positions/${id}/20.59/78.96/0/1/&apiKey=${KEY}`;
                const r = await axios.get(url);

                if (r.data && r.data.positions) {
                    const pos = r.data.positions[0];
                    missionData.push({
                        name: r.data.info.satname,
                        id: r.data.info.satid,
                        lat: pos.satlatitude,
                        lng: pos.satlongitude,
                        alt: pos.sataltitude,
                        azimuth: pos.azimuth,
                        elevation: pos.elevation
                    });
                }
            } catch (innerError) {
                console.warn(`Could not track satellite ${id}:`, innerError.message);
               
            }
        }

        if (missionData.length === 0) throw new Error("No orbital data retrieved");
        latestSatelliteData = missionData;
        res.json(missionData);

    } catch (error) {
        console.error("Critical Tracking Failure:", error.message);
        res.status(500).json({ error: "Uplink to N2YO lost. Check API Key or Rate Limits." });
    }
});

app.get('/api/telemetry', async (req, res) => {
    let orbitalAssetsStream = [];
    let completeNetworkFailure = false;
    let droppedPacketsCount = 0;

    try {
        // ======================================================================
        // 1. EXTRACT DATA DIRECTLY FROM THE GLOBAL CACHE LAYER
        // ======================================================================
        if (latestSatelliteData && latestSatelliteData.length > 0) {
            latestSatelliteData.forEach(sat => {
                const altitude = parseFloat(sat.alt);
                
                // CATCH METADATA ANOMALIES (Dead data/Zeros passing through cache)
                if (altitude === 0 || isNaN(altitude)) {
                    droppedPacketsCount++;
                } else {
                    orbitalAssetsStream.push(altitude);
                }
            });

            // If some expected assets didn't make it into the last satellite scan payload,
            // count them as missing/dropped stream packets.
            if (latestSatelliteData.length < 5) {
                droppedPacketsCount += (5 - latestSatelliteData.length);
            }
        } else {
            // Trigger fallback if satellite scan has never run yet or failed completely
            completeNetworkFailure = true;
            orbitalAssetsStream = [420.2, 418.5, 421.9, 419.1, 422.4];
        }

        // ======================================================================
        // 2. NETWORK CONTEXT STATE VALIDATION
        // ======================================================================
        if (orbitalAssetsStream.length === 0) {
            completeNetworkFailure = true;
            orbitalAssetsStream = [420.2, 418.5, 421.9, 419.1, 422.4];
        }

        const streamLen = orbitalAssetsStream.length;

        // ======================================================================
        // 3. STATISTICAL Z-SCORE ANALYSIS PIPELINE
        // ======================================================================
        const signalMean = orbitalAssetsStream.reduce((acc, v) => acc + v, 0) / streamLen;
        const variance = orbitalAssetsStream.reduce((acc, v) => acc + Math.pow(v - signalMean, 2), 0) / streamLen;
        const stdDeviation = variance > 0 ? Math.sqrt(variance) : 0.001;

        let flaggedOutliersCount = 0;
        
        orbitalAssetsStream.forEach(assetReading => {
            const zScore = Math.abs(assetReading - signalMean) / stdDeviation;
            // A Z-score threshold of 1.5 is far more mathematically accurate for tiny samples (N=5)
            if (zScore > 1.5) { 
                flaggedOutliersCount++;
            }
        });

        // ======================================================================
        // 4. MULTI-FACTOR PURITY MATRIX CALCULATION
        // ======================================================================
        let calculatedPurity = 100.0 - (flaggedOutliersCount * 15.0) - (droppedPacketsCount * 20.0);
        
        // Force absolute zero purity if the entire telemetry system failed over to default states
        if (completeNetworkFailure) {
            calculatedPurity = 0.0;
        }
        
        const truePurity = Math.max(0.0, calculatedPurity);

        // ======================================================================
        // 5. EVALUATE FINAL STATUS STRINGS
        // ======================================================================
        const statusString = (truePurity >= 85.0 && droppedPacketsCount < 2) ? "NOMINAL" : "ABERRATION_DETECTED";
        const satTrackerStatus = statusString === "NOMINAL" ? "STABLE" : "CORRUPTED_STREAM_ISOLATED";

        // ======================================================================
        // 6. SUPABASE HANDSHAKE PING
        // ======================================================================
        let supabaseStatus = "BRIDGE_DISRUPTED";
        try {
            const dbPing = await axios.get(`${supabaseUrl}/rest/v1/`, {
                headers: { 'apikey': supabaseKey },
                timeout: 1500
            });
            if (dbPing.status === 200 || dbPing.status === 401) {
                supabaseStatus = "CONNECTED";
            }
        } catch (dbErr) {
            if (dbErr.response && dbErr.response.status === 401) {
                supabaseStatus = "CONNECTED";
            } else {
                supabaseStatus = "BRIDGE_DISRUPTED";
            }
        }

        // Return the fully secure parameters matrix directly back to React HUD
        res.status(200).json({
            signal_variance_sigma: parseFloat(stdDeviation.toFixed(4)),
            data_purity_percent: parseFloat(truePurity.toFixed(1)),
            telemetry_status: statusString,
            sat_tracker: satTrackerStatus,
            supabase_db: supabaseStatus,
            anomaly_count: flaggedOutliersCount + droppedPacketsCount 
        });

    } catch (criticalErr) {
        console.error("Telemetry Processing failure:", criticalErr.message);
        res.status(500).json({ error: "Internal System Anomaly Detected" });
    }
});

module.exports = app;