const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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
            } catch (e) { console.warn(e.message); }
        }
        res.json(missionData);
    } catch (error) {
        res.status(500).json({ error: "Uplink to N2YO lost." });
    }
});


module.exports = app;