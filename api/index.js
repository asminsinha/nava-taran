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
let latestExoplanetData = [];
let latestTerraData = [];
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
        if (Array.isArray(response.data)) {
            latestExoplanetData = response.data;
        }
        res.json(response.data);
    } catch (error) {
        console.error("Exoplanet Archive Error:", error.message);
        res.status(500).json({ message: "Deep Space Uplink Failure" });
    }
});
app.post('/api/cache/terra-hazards', (req, res) => {
    if (req.body && Array.isArray(req.body.hazards)) {
        latestTerraData = req.body.hazards;
        return res.sendStatus(200);
    }
    res.status(400).json({ error: "Invalid hazard stream format" });
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

        if (latestSatelliteData && latestSatelliteData.length > 0) {
            latestSatelliteData.forEach(sat => {
                const altitude = parseFloat(sat.alt);

                if (altitude === 0 || isNaN(altitude)) {
                    droppedPacketsCount++;
                } else {
                    orbitalAssetsStream.push(altitude);
                }
            });

            if (latestSatelliteData.length < 5) {
                droppedPacketsCount += (5 - latestSatelliteData.length);
            }
        } else {
            // Trigger fallback if satellite scan has never run yet or failed completely
            completeNetworkFailure = true;
            orbitalAssetsStream = [420.2, 418.5, 421.9, 419.1, 422.4];
        }


        if (orbitalAssetsStream.length === 0) {
            completeNetworkFailure = true;
            orbitalAssetsStream = [420.2, 418.5, 421.9, 419.1, 422.4];
        }

        const streamLen = orbitalAssetsStream.length;


        const signalMean = orbitalAssetsStream.reduce((acc, v) => acc + v, 0) / streamLen;
        const variance = orbitalAssetsStream.reduce((acc, v) => acc + Math.pow(v - signalMean, 2), 0) / streamLen;
        const stdDeviation = variance > 0 ? Math.sqrt(variance) : 0.001;

        let flaggedOutliersCount = 0;
        
        orbitalAssetsStream.forEach(assetReading => {
            const zScore = Math.abs(assetReading - signalMean) / stdDeviation;
            
            if (zScore > 1.5) { 
                flaggedOutliersCount++;
            }
        });

        let calculatedPurity = 100.0 - (flaggedOutliersCount * 15.0) - (droppedPacketsCount * 20.0);
        
        
        if (completeNetworkFailure) {
            calculatedPurity = 0.0;
        }
        
        const truePurity = Math.max(0.0, calculatedPurity);


  
        let nasaIntegrityPercent = 100.0;
        let corruptedNasaRecords = 0;

        if (latestExoplanetData && latestExoplanetData.length > 0) {
            const scanLimit = Math.min(latestExoplanetData.length, 50);
            let evaluatedFieldsCount = 0;

            for (let i = 0; i < scanLimit; i++) {
                const planet = latestExoplanetData[i];
                // Confirm critical TAP fields exist and haven't dropped out as null or empty strings
                if (!planet.pl_name || !planet.hostname || planet.pl_orbper === null || isNaN(parseFloat(planet.pl_orbper))) {
                    corruptedNasaRecords++;
                }
                evaluatedFieldsCount++;
            }
            if (evaluatedFieldsCount > 0) {
                nasaIntegrityPercent = 100.0 - ((corruptedNasaRecords / evaluatedFieldsCount) * 100.0);
            }
        } else {
            nasaIntegrityPercent = 0.0; // Threat state: No dataset currently pulled through memory pipeline
        }


        let terraIntegrityPercent = 100.0;
        let structuralTerraErrors = 0;

        if (latestTerraData && latestTerraData.length > 0) {
            const scanLimit = Math.min(latestTerraData.length, 20);
            let checkCount = 0;

            for (let i = 0; i < scanLimit; i++) {
                const event = latestTerraData[i];
                try {
                    // Dive directly into the unique nested geometry structure used by NASA EONET
                    const lon = parseFloat(event.geometry[0].coordinates[0]);
                    const lat = parseFloat(event.geometry[0].coordinates[1]);

                    // Test for data corruption or coordinate layout boundary errors
                    if (isNaN(lon) || isNaN(lat) || Math.abs(lat) > 90 || Math.abs(lon) > 180 || !event.categories[0].title) {
                        structuralTerraErrors++;
                    }
                } catch (structureError) {
                    structuralTerraErrors++; // Catches cases where nested structures are broken or missing
                }
                checkCount++;
            }
            if (checkCount > 0) {
                terraIntegrityPercent = 100.0 - ((structuralTerraErrors / checkCount) * 100.0);
            }
        } else {
            terraIntegrityPercent = 0.0; 
        }



        
        const statusString = (truePurity >= 85.0 && droppedPacketsCount < 2) ? "NOMINAL" : "ABERRATION_DETECTED";
        const satTrackerStatus = statusString === "NOMINAL" ? "STABLE" : "CORRUPTED_STREAM_ISOLATED";
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