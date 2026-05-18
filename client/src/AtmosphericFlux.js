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
                fetchMeteorologicalArray(22.5726, 88.3639); // Regional Capital Backup Vectors
                return;
            }

            // High accuracy flag prevents coordinate jitter on page loads
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    fetchMeteorologicalArray(pos.coords.latitude, pos.coords.longitude);
                },
                (err) => {
                    console.warn("Geolocation access delayed or denied. Utilizing regional backup matrix.");
                    fetchMeteorologicalArray(22.5726, 88.3639);
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        };

        const fetchMeteorologicalArray = async (lat, lon) => {
            try {
                setLocalMeta(prev => ({ ...prev, coords: `${lat.toFixed(4)}°N, ${lon.toFixed(4)}°E` }));
                
                const apiURL = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,relative_humidity_2m_mean,surface_pressure_mean,shortwave_radiation_sum,et0_fao_evapotranspiration&timezone=auto&forecast_days=14`;
                
                const response = await fetch(apiURL);
                const data = await response.json();

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
                        thermalFlux: Math.round(data.daily.shortwave_radiation_sum[index]), 
                        evapoTrans: data.daily.et0_fao_evapotranspiration[index].toFixed(2)  
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

        const padding = 30;
        const width = canvas.width - padding * 2;
        const height = canvas.height - padding * 2;
        
        const temps = weatherData.map(d => d.maxTemp);
        const minVal = Math.min(...temps);
        const maxVal = Math.max(...temps);
        const range = maxVal - minVal || 1;

        ctx.beginPath();
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 3;
        ctx.shadowBlur = 12;
        ctx.shadowColor = 'rgba(0, 242, 255, 0.8)';

        weatherData.forEach((d, i) => {
            const x = padding + (i * (width / (weatherData.length - 1)));
            const y = padding + height - ((d.maxTemp - minVal) / range) * height;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        ctx.shadowBlur = 0; 
        weatherData.forEach((d, i) => {
            const x = padding + (i * (width / (weatherData.length - 1)));
            const y = padding + height - ((d.maxTemp - minVal) / range) * height;
            ctx.fillStyle = '#00ffaa';
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, 2 * Math.PI);
            ctx.fill();
        });

    }, [loading, weatherData]);

    return (
        <div style={{ margin: '30px 0', width: '100%', fontFamily: "'Courier New', Courier, monospace" }}>
            
            {/* INTENSIFIED HIGH-VISIBILITY HUD ACTIVATION TRIGGER BUTTON */}
            <div 
                onClick={() => setIsOpen(true)}
                style={{
                    width: '100%',
                    background: 'linear-gradient(90deg, rgba(0, 242, 255, 0.12), rgba(0, 12, 24, 0.9))',
                    border: '2px solid #00ffff',
                    padding: '20px 24px',
                    color: '#00ffff',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderRadius: '4px',
                    boxShadow: '0 0 25px rgba(0, 242, 255, 0.4), inset 0 0 15px rgba(0, 242, 255, 0.1)',
                    transition: 'all 0.3s ease-in-out',
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 0 40px rgba(0, 242, 255, 0.7), inset 0 0 20px rgba(0, 242, 255, 0.3)';
                    e.currentTarget.style.background = 'rgba(0, 242, 255, 0.2)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0 0 25px rgba(0, 242, 255, 0.4), inset 0 0 15px rgba(0, 242, 255, 0.1)';
                    e.currentTarget.style.background = 'linear-gradient(90deg, rgba(0, 242, 255, 0.12), rgba(0, 12, 24, 0.9))';
                }}
            >
                <div>
                    <span style={{ display: 'inline-block', marginRight: '12px', fontSize: '18px' }}>🌐</span>
                    <span style={{ fontFamily: "'Orbitron', sans-serif", fontWeight: 'bold', letterSpacing: '2px', fontSize: '14px' }}>INITIALIZE ATMOSPHERIC WEATHER FLUX DECK</span>
                    <div style={{ color: '#aaa', fontSize: '10px', marginTop: '6px', letterSpacing: '1px' }}>TARGET METRICS: 14-DAY RADIAL PROJECTIONS // GEOLOCATION VECTOR STREAMING</div>
                </div>
                <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: '14px', fontWeight: 'bold', letterSpacing: '1.5px', textShadow: '0 0 10px #00ffff' }}>[ OPEN OVERLAY ]</div>
            </div>

            {/* ENHANCED AND ELONGATED HIGH-RESOLUTION HUD MODAL */}
            {isOpen && (
                <div style={{
                    position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
                    background: 'rgba(0,4,8,0.92)', backdropFilter: 'blur(8px)',
                    display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
                }}>
                    <div style={{
                        width: '95%', maxWidth: '1100px', height: '82vh',
                        background: '#000b14', border: '2px solid #00ffff',
                        borderRadius: '4px', boxShadow: '0 0 60px rgba(0, 242, 255, 0.4)',
                        display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative'
                    }}>
                        
                        {/* TERMINAL HEADER ROW */}
                        <div style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            background: 'rgba(0, 242, 255, 0.12)', borderBottom: '2px solid rgba(0, 242, 255, 0.3)',
                            padding: '14px 20px', color: '#00ffff', fontWeight: 'bold', fontSize: '13px', letterSpacing: '1.5px',
                            fontFamily: "'Orbitron', sans-serif"
                        }}>
                            <div>ATMOSPHERIC METEOROLOGICAL TELEMETRY OVERLAY</div>
                            <button 
                                onClick={() => setIsOpen(false)}
                                style={{
                                    background: 'rgba(255, 51, 51, 0.12)', border: '1px solid #ff3333',
                                    color: '#ff3333', cursor: 'pointer', padding: '4px 12px',
                                    fontFamily: "'Orbitron', sans-serif", fontWeight: 'bold', fontSize: '11px', borderRadius: '3px',
                                    letterSpacing: '1px', transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 51, 51, 0.3)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 51, 51, 0.12)'}
                            >✕ CLOSE ARCHIVE</button>
                        </div>

                        {/* SUBHEADER GEOLOCATION RADAR STATS */}
                        <div style={{
                            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                            gap: '12px', background: 'rgba(0,0,0,0.6)', padding: '12px 20px',
                            borderBottom: '1px solid rgba(0, 242, 255, 0.2)', fontSize: '11px', color: '#aaa', letterSpacing: '1px'
                        }}>
                            <div>COORDINATE VECTOR: <span style={{ color: '#fff', fontWeight: 'bold' }}>{localMeta.coords || 'LOCKING TELEMETRY...'}</span></div>
                            <div>LOCAL TIME: <span style={{ color: '#00ffaa', fontWeight: 'bold' }}>{localMeta.time}</span></div>
                            <div>DATE INDEX: <span style={{ color: '#fff', fontWeight: 'bold' }}>{localMeta.date}</span></div>
                            <div>TIME ZONE LAYER: <span style={{ color: '#fff', fontWeight: 'bold' }}>{localMeta.zone}</span></div>
                        </div>

                        {/* CORE VISUAL CONTENT HOLDER */}
                        <div style={{ flexGrow: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {loading ? (
                                <div style={{ color: '#00ffff', textAlign: 'center', marginTop: '120px', fontSize: '13px', letterSpacing: '2px', fontFamily: "'Orbitron', sans-serif" }}>
                                    ESTABLISHING GEOGRAPHIC DATA-STREAM UPLINK... PLEASE VERIFY SENSOR ACCESS
                                </div>
                            ) : (
                                <>
                                    {/* DATA VISUALIZATION WAVEFORM GRAPH */}
                                    <div style={{ background: 'rgba(0,16,32,0.8)', border: '1px solid rgba(0,242,255,0.25)', padding: '14px', borderRadius: '2px' }}>
                                        <div style={{ fontFamily: "'Orbitron', sans-serif", color: '#aaa', fontSize: '10px', marginBottom: '8px', letterSpacing: '1px' }}>14-DAY THERMAL FLUX PEAK VARIANCE ANCHOR GRAPH</div>
                                        <canvas ref={canvasRef} width="1000" height="140" style={{ width: '100%', display: 'block' }}></canvas>
                                    </div>

                                    {/* SCROLLABLE 14-DAY CARDS PLATFORM */}
                                    <div style={{
                                        display: 'grid', gridTemplateColumns: 'repeat(14, 210px)', 
                                        gap: '14px', overflowX: 'scroll', paddingBottom: '14px'
                                    }}>
                                        {weatherData.map((day, idx) => (
                                            <div key={idx} style={{
                                                background: 'rgba(0, 20, 40, 0.6)', border: '1px solid rgba(0, 242, 255, 0.2)',
                                                padding: '14px', borderRadius: '4px', position: 'relative'
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(0,242,255,0.25)', paddingBottom: '6px', marginBottom: '8px', fontSize: '11px' }}>
                                                    <span style={{ color: '#00ffff', fontWeight: 'bold', letterSpacing: '1px', fontFamily: "'Orbitron', sans-serif" }}>{day.day}</span>
                                                    <span style={{ color: '#aaa' }}>{day.date}</span>
                                                </div>
                                                <div style={{ fontSize: '15px', color: '#fff', fontWeight: 'bold', marginBottom: '8px', letterSpacing: '0.5px', fontFamily: "'Orbitron', sans-serif" }}>
                                                    Max: {day.maxTemp}°C <span style={{ color: '#00f2ff', fontSize: '12px', fontWeight: 'normal' }}>/ Min: {day.minTemp}°C</span>
                                                </div>
                                                <div style={{ fontSize: '12px', color: '#ccc', display: 'flex', flexDirection: 'column', gap: '4px', letterSpacing: '0.5px' }}>
                                                    <div>Humidity: <span style={{ color: '#00ffaa' }}>{day.humidity}%</span></div>
                                                    <div>Velocity: <span style={{ color: '#fff' }}>{day.wind} km/h</span></div>
                                                    <div>Pressure: <span style={{ color: '#fff' }}>{day.pressure} hPa</span></div>
                                                    <div>Precip: <span style={{ color: '#ffaa00' }}>{day.rainChance}%</span></div>
                                                    
                                                    {/* ADAPTIVE CRITICAL METRICS */}
                                                    <div style={{ borderTop: '1px dashed rgba(0,242,255,0.2)', marginTop: '6px', paddingTop: '6px', color: '#00ffaa', fontSize: '11px' }}>
                                                        Thermal Flux: <span style={{ color: '#fff' }}>{day.thermalFlux} MJ/m²</span>
                                                    </div>
                                                    <div style={{ color: '#aaa', fontSize: '11px' }}>
                                                        Evapo-Esc: <span style={{ color: '#fff' }}>{day.evapoTrans} mm</span>
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