import React, { useState, useEffect } from 'react';

const NeuralLinkTelemetry = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [stats, setStats] = useState({
        latency: 0,
        fps: 60,
        battery: 'N/A',
        cores: navigator.hardwareConcurrency || '??',
        uptime: '00:00:00'
    });

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
                    color: '#00ffff',
                    padding: '5px 10px',
                    fontFamily: 'Orbitron, sans-serif',
                    fontSize: '10px',
                    cursor: 'pointer',
                    boxShadow: '0 0 10px rgba(0, 255, 255, 0.3)'
                }}
            >
                {isOpen ? '✕ CLOSE DIAGNOSTICS' : '⚙ SYSTEM TELEMETRY'}
            </button>

            {/* The Telemetry Pop-down Window */}
            {isOpen && (
                <div style={{
                    marginTop: '5px',
                    width: '200px',
                    background: 'rgba(0, 10, 20, 0.9)',
                    border: '1px solid #00ffff',
                    padding: '10px',
                    color: '#00ffff',
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    backdropFilter: 'blur(5px)'
                }}>
                    <div style={{ borderBottom: '1px solid #00ffff33', paddingBottom: '5px', marginBottom: '5px' }}>
                        NEURAL LINK: ACTIVE
                    </div>
                    <div>UPLINK LATENCY: <span style={{color: stats.latency > 200 ? 'red' : '#00ff00'}}>{stats.latency}ms</span></div>
                    <div>SYSTEM CORES: {stats.cores}</div>
                    <div>DEVICE CHARGE: {stats.battery}</div>
                    <div>MISSION UPTIME: {stats.uptime}</div>
                    
                    {/* The "Loading Line" Aesthetic */}
                    <div style={{ height: '2px', background: '#333', marginTop: '10px', position: 'relative' }}>
                        <div style={{ 
                            position: 'absolute', 
                            height: '100%', 
                            width: '30%', 
                            background: '#00ffff', 
                            animation: 'scan-line 2s infinite linear' 
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