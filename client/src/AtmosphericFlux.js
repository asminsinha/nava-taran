import React, { useState, useEffect, useRef } from 'react';

const AtmosphericFlux = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [localMeta, setLocalMeta] = useState({ time: '', date: '', zone: '', coords: '' });
    const [weatherData, setWeatherData] = useState([]);
    const canvasRef = useRef(null);

    // --- SUB-ROUTINE A: TIME & POSITION MATRIX ---
    useEffect(() => {
        const updateClock = () => {
            const now = new Date();
            setLocalMeta(prev => ({
                ...prev,
                time: now.toTimeString().split(' ')[0],
                date: now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
                zone: Intl.DateTimeFormat().resolvedOptions().timeZone
            }));
        };
        
        updateClock();
        const clockTicker = setInterval(updateClock, 1000);
        return () => clearInterval(clockTicker);
    }, []);

    // --- SUB-ROUTINE B: HIGH-ACCURACY DATA METRIC INGESTION ---
    useEffect(() => {
        if (!isOpen) return;
        setLoading(true);

        const acquireGeographicTelemetry = () => {
            if (!navigator.geolocation) {
                fallbackToDefaultCoordinates(22.5726, 88.3639); // Regional Capital Backup Vectors
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (pos) => fetchMeteorologicalArray(pos.coords.latitude, pos.coords.longitude),
                () => fallbackToDefaultCoordinates(22.5726, 88.3639)
            );
        };

        const fallbackToDefaultCoordinates = (lat, lon) => {
            console.warn("Geolocation denied. Defaulting to regional telemetry vectors.");
            fetchMeteorologicalArray(lat, lon);
        };

        const fetchMeteorologicalArray = async (lat, lon) => {
            try {
                setLocalMeta(prev => ({ ...prev, coords: `${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E` }));
                
                // Compiles high-resolution atmospheric data models (ECMWF & NOAA seamless integration)
                const apiURL = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,relative_humidity_2m_mean,surface_pressure_mean,shortwave_radiation_sum,et0_fao_evapotranspiration&timezone=auto&forecast_days=14`;
                
                const response = await fetch(apiURL);
                const data = await response.json();

                // Format structure map into an elegant 14-day iterable matrix
                const formattedDays = data.daily.time.map((dateStr, index) => {
                    const parsedDate = new Date(dateStr);
                    return {
                        date: parsedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                        day: parsedDate.toLocaleDateString('en-US', { weekday: 'short' }),
                        maxTemp: Math.round(data.daily.temperature_2m_max[index]),
                        minTemp: Math.round(data.daily.temperature_2m_min[index]),
                        rainChance: data.daily.precipitation_probability_max[index] || 0,
                        wind: data.daily.wind_speed_10m_max[index].toFixed(1),
                        humidity: Math.round(data.daily.relative_humidity_2m_mean[index]),
                        pressure: Math.round(data.daily.surface_pressure_mean[index]),
                        thermalFlux: Math.round(data.daily.shortwave_radiation_sum[index]), // MJ/m² thermal energy payload
                        evapoTrans: data.daily.et0_fao_evapotranspiration[index].toFixed(2)  // mm/day moisture escape vector
                    };
                });

                setWeatherData(formattedDays);
                setLoading(false);
            } catch (err) {
                console.error("Meteorological data link failed:", err);
                setLoading(false);
            }
        };

        acquireGeographicTelemetry();
    }, [isOpen]);

    // --- SUB-ROUTINE C: SPARK-CHART CANVAS VISUALIZATION RENDER ---
    useEffect(() => {
        if (loading || weatherData.length === 0 || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const padding = 20;
        const width = canvas.width - padding * 2;
        const height = canvas.height - padding * 2;
        
        const temps = weatherData.map(d => d.maxTemp);
        const minVal = Math.min(...temps);
        const maxVal = Math.max(...temps);
        const range = maxVal - minVal || 1;

        // Render Neon Data Flow Path
        ctx.beginPath();
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'rgba(0, 242, 255, 0.6)';

        weatherData.forEach((d, i) => {
            const x = padding + (i * (width / (weatherData.length - 1)));
            const y = padding + height - ((d.maxTemp - minVal) / range) * height;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Render Data Nodes
        ctx.shadowBlur = 0; // Reset canvas filter bloat
        weatherData.forEach((d, i) => {
            const x = padding + (i * (width / (weatherData.length - 1)));
            const y = padding + height - ((d.maxTemp - minVal) / range) * height;
            ctx.fillStyle = '#00ffaa';
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, 2 * Math.PI);
            ctx.fill();
        });

    }, [loading, weatherData]);

    return (
        <div style={{ margin: '20px 0', width: '100%', fontFamily: 'monospace' }}>
            {/* INTERACTIVE HUD ACTIVATION LINKROW */}
            <div 
                onClick={() => setIsOpen(true)}
                style={{
                    width: '100%',
                    background: 'linear-gradient(90deg, rgba(0, 242, 255, 0.05), transparent)',
                    borderLeft: '4px solid #00ffff',
                    borderRight: '1px solid rgba(0, 242, 255, 0.1)',
                    borderTop: '1px solid rgba(0, 242, 255, 0.1)',
                    borderBottom: '1px solid rgba(0, 242, 255, 0.1)',
                    padding: '16px 20px',
                    color: '#00ffff',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderRadius: '0 4px 4px 0',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                    transition: 'all 0.3s ease',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 242, 255, 0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'linear-gradient(90deg, rgba(0, 242, 255, 0.05), transparent)'}
            >
                <div>
                    <span style={{ animation: 'pulse 2s infinite', marginRight: '10px' }}>🌐</span>
                    <span style={{ fontWeight: 'bold', letterSpacing: '1px' }}>INITIALIZE ATMOSPHERIC WEATHER FLUX DECK</span>
                    <div style={{ color: '#888', fontSize: '9px', marginTop: '4px' }}>TARGET METRICS: 14-DAY RADIAL PROJECTIONS // GEOLOCATION VECTOR STREAMING</div>
                </div>
                <div style={{ fontSize: '14px', fontWeight: 'bold' }}>[ OPEN OVERLAY ]</div>
            </div>

            {/* LIGHTWEIGHT SMALL TERMINAL WINDOW MODAL */}
            {isOpen && (
                <div style={{
                    position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
                    background: 'rgba(0,4,8,0.85)', backdropFilter: 'blur(6px)',
                    display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
                }}>
                    <div style={{
                        width: '90%', maxWidth: '850px', height: '80vh',
                        background: '#000b14', border: '1px solid #00ffff',
                        borderRadius: '4px', boxShadow: '0 0 40px rgba(0, 242, 255, 0.25)',
                        display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative'
                    }}>
                        
                        {/* TERMINAL HEADER HEADER ROW */}
                        <div style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            background: 'rgba(0, 242, 255, 0.08)', borderBottom: '1px solid rgba(0, 242, 255, 0.2)',
                            padding: '10px 16px', color: '#00ffff', fontWeight: 'bold', fontSize: '12px'
                        }}>
                            <div>🛰️ ATMOSPHERIC METEOROLOGICAL TELEMETRY OVERLAY</div>
                            <button 
                                onClick={() => setIsOpen(false)}
                                style={{
                                    background: 'rgba(255, 51, 51, 0.1)', border: '1px solid #ff3333',
                                    color: '#ff3333', cursor: 'pointer', padding: '2px 8px',
                                    fontFamily: 'monospace', fontWeight: 'bold', fontSize: '11px', borderRadius: '3px'
                                }}
                            >✕ CLOSE ARCHIVE</button>
                        </div>

                        {/* SUBHEADER GEOLOCATION RADAR STATS */}
                        <div style={{
                            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                            gap: '10px', background: 'rgba(0,0,0,0.4)', padding: '10px 16px',
                            borderBottom: '1px solid rgba(0, 242, 255, 0.1)', fontSize: '10px', color: '#888'
                        }}>
                            <div>COORDINATE VECTOR: <span style={{ color: '#fff' }}>{localMeta.coords || 'ACQUIRING...'}</span></div>
                            <div>LOCAL TIME: <span style={{ color: '#00ffaa' }}>{localMeta.time}</span></div>
                            <div>DATE INDEX: <span style={{ color: '#fff' }}>{localMeta.date}</span></div>
                            <div>TIME ZONE LAYER: <span style={{ color: '#fff' }}>{localMeta.zone}</span></div>
                        </div>

                        {/* WINDOW CORE CONTAINER MAIN PANEL */}
                        <div style={{ flexGrow: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {loading ? (
                                <div style={{ color: '#00ffff', textAlign: 'center', marginTop: '100px', fontSize: '12px' }}>
                                    📡 ESTABLISHING GEOGRAPHIC DATA-STREAM UPLINK... PLEASE VERIFY SENSOR ACCESS
                                </div>
                            ) : (
                                <>
                                    {/* WAVE-RENDER INTERACTIVE PREDICTION DATA CANVAS */}
                                    <div style={{ background: 'rgba(0,16,32,0.6)', border: '1px solid rgba(0,242,255,0.15)', padding: '10px', borderRadius: '2px' }}>
                                        <div style={{ color: '#888', fontSize: '9px', marginBottom: '6px', letterSpacing: '0.5px' }}>14-DAY THERMAL FLUX PEAK VARIANCE ANCHOR GRAPH</div>
                                        <canvas ref={canvasRef} width="800" height="120" style={{ width: '100%', display: 'block' }}></canvas>
                                    </div>

                                    {/* HORIZONTAL GRID SCROLL DECK */}
                                    <div style={{
                                        display: 'grid', gridTemplateColumns: 'repeat(14, 180px)', 
                                        gap: '10px', overflowX: 'scroll', paddingBottom: '10px'
                                    }}>
                                        {weatherData.map((day, idx) => (
                                            <div key={idx} style={{
                                                background: 'rgba(0, 20, 40, 0.4)', border: '1px solid rgba(0, 242, 255, 0.15)',
                                                padding: '10px', borderRadius: '3px', position: 'relative'
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(0,242,255,0.15)', paddingBottom: '4px', marginBottom: '6px' }}>
                                                    <span style={{ color: '#00ffff', fontWeight: 'bold' }}>{day.day}</span>
                                                    <span style={{ color: '#888' }}>{day.date}</span>
                                                </div>
                                                <div style={{ fontSize: '13px', color: '#fff', fontWeight: 'bold', marginBottom: '6px' }}>
                                                    🔥 {day.maxTemp}°C <span style={{ color: '#00f2ff', fontSize: '11px', fontWeight: 'normal' }}>/ {day.minTemp}°C</span>
                                                </div>
                                                <div style={{ fontSize: '10px', color: '#aaa', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                    <div>💧 Humidity: <span style={{ color: '#00ffaa' }}>{day.humidity}%</span></div>
                                                    <div>🌀 Velocity: <span style={{ color: '#fff' }}>{day.wind} km/h</span></div>
                                                    <div>📉 Pressure: <span style={{ color: '#fff' }}>{day.pressure} hPa</span></div>
                                                    <div>🌧️ Precip: <span style={{ color: '#ffaa00' }}>{day.rainChance}%</span></div>
                                                    
                                                    {/* SYSTEM SPECIALTY FIELDS */}
                                                    <div style={{ borderTop: '1px dashed rgba(0,242,255,0.1)', marginTop: '4px', paddingTop: '4px', color: '#00ffaa' }}>
                                                        ⚡ Thermal Flux: <span style={{ color: '#fff' }}>{day.thermalFlux} MJ/m²</span>
                                                    </div>
                                                    <div style={{ color: '#888' }}>
                                                        🍃 Evapo-Esc: <span style={{ color: '#fff' }}>{day.evapoTrans} mm</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AtmosphericFlux;