import React, { useState, useEffect } from 'react';

const NeuralLinkTelemetry = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [stats, setStats] = useState({
        latency: 0,
        fps: 60,
        battery: 'N/A',
        cores: navigator.hardwareConcurrency || '??',
        uptime: '00:00:00',
        uplinks: {
            satellite: 'CONNECTING...',
            disaster: 'STABLE',
            nasa: 'ACTIVE'
        }
    });
    useEffect(() => {
    const startTime = Date.now();
    let frameCount = 0;
    let lastTime = performance.now();

    // FPS Calculation Loop
    const checkFPS = () => {
        frameCount++;
        const now = performance.now();
        if (now >= lastTime + 1000) {
            setStats(prev => ({ ...prev, fps: frameCount }));
            frameCount = 0;
            lastTime = now;
        }
        requestAnimationFrame(checkFPS);
    };
    const fpsId = requestAnimationFrame(checkFPS);

    // Standard Telemetry Loop (every 2 seconds)
    const interval = setInterval(() => {
        // Latency
        const t0 = performance.now();
        fetch('https://www.google.com/favicon.ico', { mode: 'no-cors' })
            .then(() => setStats(prev => ({ ...prev, latency: Math.round(performance.now() - t0) })));

        // Battery
        if (navigator.getBattery) {
            navigator.getBattery().then(bat => setStats(prev => ({ ...prev, battery: `${Math.round(bat.level * 100)}%` })));
        }

        // Mission Uptime
        const diff = Math.floor((Date.now() - startTime) / 1000);
        const hrs = String(Math.floor(diff / 3600)).padStart(2, '0');
        const mins = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
        const secs = String(diff % 60).padStart(2, '0');
        setStats(prev => ({ ...prev, uptime: `${hrs}:${mins}:${secs}` }));
    }, 2000);

    return () => {
        clearInterval(interval);
        cancelAnimationFrame(fpsId);
    };
    }, []);
    useEffect(() => {
        const startTime = Date.now();
        
        // Tracking Real-time Stats
        const interval = setInterval(() => {
            // 1. Calculate Latency (Ping simulate)
            const t0 = performance.now();
            fetch('https://www.google.com/favicon.ico', { mode: 'no-cors' }).then(() => {
                setStats(prev => ({ ...prev, latency: Math.round(performance.now() - t0) }));
            });

            // 2. Battery Status
            if (navigator.getBattery) {
                navigator.getBattery().then(bat => {
                    setStats(prev => ({ ...prev, battery: `${Math.round(bat.level * 100)}%` }));
                });
            }

            // 3. Mission Uptime
            const diff = Math.floor((Date.now() - startTime) / 1000);
            const hrs = String(Math.floor(diff / 3600)).padStart(2, '0');
            const mins = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
            const secs = String(diff % 60).padStart(2, '0');
            setStats(prev => ({ ...prev, uptime: `${hrs}:${mins}:${secs}` }));

            setStats(prev => ({
            ...prev,
                uplinks: {
                    satellite: prev.latency > 500 ? 'DEGRADED' : 'STABLE',
                    disaster: prev.latency > 500 ? 'OFF-SYNC':'SYNCHRONIZED',
                    nasa: prev.latency > 500 ? 'DECRYPTED':'ENCRYPTED'
                }
            }));
        }, 2000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 1000 }}>
            {/* The Tactical Toggle Button */}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    background: 'rgba(0, 255, 255, 0.1)',
                    border: '1px solid #00ffff',
                    borderRadius: '10px',
                    color: '#00ffff',
                    padding: '4px 10px', // Increased from 5px 10px
                    fontFamily: 'Orbitron, sans-serif',
                    fontSize: '9px',      // Increased from 10px
                    letterSpacing: '1px',  // Added for tactical look
                    cursor: 'pointer',
                    boxShadow: 'inset 0 0 10px rgba(0, 255, 255, 0.2)'
                }}
            >
                {isOpen ? '✕ CLOSE DIAGNOSTICS' : '⚙ SYSTEM TELEMETRY'}
            </button>

            {/* The Telemetry Pop-down Window */}
            {isOpen && (
                <div style={{
                    width: '240px', // Slightly wider for more data
                    background: 'rgba(0, 10, 20, 0.95)',
                    border: '1px solid #00ffff',
                    padding: '12px',
                    color: '#00ffff',
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    backdropFilter: 'blur(8px)',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                }}>
                    <div style={{ borderBottom: '1px solid #00ffff33', paddingBottom: '5px', marginBottom: '8px', fontWeight: 'bold' }}>
                        NAVATARAN CORE DIAGNOSTICS
                    </div>
<div style={{ marginBottom: '10px' }}>
        <div style={{ color: '#888', fontSize: '9px', marginBottom: '2px' }}>HARDWARE TELEMETRY</div>
        <div>UPLINK LATENCY: <span style={{color: stats.latency > 200 ? '#ff3333' : '#00ff00'}}>{stats.latency}ms</span></div>
        <div>FRAME RENDERING: <span style={{color: stats.fps < 30 ? '#ff3333' : '#00ff00'}}>{stats.fps} FPS</span></div>
        <div>ACTIVE CORES: {stats.cores}</div>
        <div>DEVICE CHARGE: {stats.battery}</div>
    </div>

    {/* Communication Uplinks Section */}
    <div style={{ marginBottom: '10px' }}>
        <div style={{ color: '#888', fontSize: '9px', marginBottom: '2px' }}>COMMUNICATION UPLINKS</div>
        <div>SAT-TRACKER: <span style={{color: '#00ff00'}}>{stats.uplinks.satellite}</span></div>
        <div>TERRA-DISASTER: <span style={{color: '#00ff00'}}>{stats.uplinks.disaster}</span></div>
        <div>NASA-DATASET: <span style={{color: '#00ff00'}}>{stats.uplinks.nasa}</span></div>
    </div>

    <div style={{ marginTop: '5px', fontSize: '10px' }}>MISSION UPTIME: {stats.uptime}</div>
    
    {/* Animated Loading Bar */}
    <div style={{ height: '2px', background: '#111', marginTop: '10px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ 
            position: 'absolute', 
            height: '100%', 
            width: '40%', 
            background: 'linear-gradient(90deg, transparent, #00ffff, transparent)', 
            animation: 'scan-line 1.5s infinite linear' 
        }}></div>
    </div>
                    <style>{`
                        @keyframes scan-line {
                            0% { left: 0; }
                            100% { left: 100%; }
                        }
                    `}</style>
                </div>
            )}
        </div>
    );
};

export default NeuralLinkTelemetry;