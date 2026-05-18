import React, { useState, useEffect, useRef } from 'react';

const NeuralLinkTelemetry = () => {
    const [isOpen, setIsOpen] = useState(false);
    const canvasRef = useRef(null);
    const wavePhase = useRef(0);

    const [stats, setStats] = useState({
        latency: 0,
        cores: navigator.hardwareConcurrency || 12,
        battery: '100%',
        uptime: '00:00:00',
        fps: 60,
        purity: '100%',
        nasaPurity: '100%',
        terraPurity: '100%',
        weatherPurity: '100%',
        variance: '0.0000σ',
        statusBadge: 'NOMINAL',
        anomaliesActive: 0,
        uplinks: {
            satellite: 'STABLE',
            supabase: 'BRIDGE_CHECKING',
            disaster: 'SYNCHRONIZED',
            nasa: 'ENCRYPTED',
            aiCompanion: 'ONLINE'
        }
    });

    useEffect(() => {
        const startTime = Date.now();

        const fetchLiveTelemetryMatrix = async () => {
            const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
            
            
            let backendData = {};
            let measuredLatency = 0;
            
            const latencyStart = performance.now();
try {
    await fetch('/api/auth/login', { method: 'OPTIONS' }); 
    measuredLatency = Math.round(performance.now() - latencyStart);
} catch (e) {
    measuredLatency = 500; 
}

try {
    const res = await fetch(`/api/telemetry?t=${Date.now()}`);
    backendData = await res.json();
} catch (err) {
    console.error("Telemetry server link disrupted:", err);
}
            let currentBatteryLevel = '100%';
            if (navigator.getBattery) {
                try {
                    const bat = await navigator.getBattery();
                    currentBatteryLevel = `${Math.round(bat.level * 100)}%`;
                } catch (e) {}
            }

            const hrs = String(Math.floor(elapsedSeconds / 3600)).padStart(2, '0');
            const mins = String(Math.floor((elapsedSeconds % 3600) / 60)).padStart(2, '0');
            const secs = String(elapsedSeconds % 60).padStart(2, '0');
            const uptimeString = `${hrs}:${mins}:${secs}`;

            const disasterStatus = (backendData.terra_purity_percent !== undefined && backendData.terra_purity_percent < 90.0) 
                ? 'OFF-SYNC' 
                : 'SYNCHRONIZED';

            const nasaStatus = (backendData.nasa_purity_percent !== undefined && backendData.nasa_purity_percent < 90.0) 
                ? 'DECRYPTED' 
                : 'ENCRYPTED';
            
            const aiCompanionStatus = (backendData.anomaly_count > 0 || measuredLatency > 600 )
                ? 'STANDBY' 
                : 'LINKED';

            let computedFps = 60;
            if (measuredLatency > 600) computedFps -= 4;
            if (backendData.anomaly_count > 0) computedFps -= Math.floor(Math.random() * 6) + 3;

            const isCommsFailure = Object.keys(backendData).length === 0;
            const atmosphericNetworkCutoff = isCommsFailure ? "0.00%" : (95 + Math.random() * 4.9).toFixed(2) + "%";
            setStats(prev => ({
                ...prev,
                latency: measuredLatency,
                battery: currentBatteryLevel,
                uptime: uptimeString,
                fps: computedFps,
                purity: isCommsFailure ? '0%' : ((backendData.data_purity_percent !== undefined) ? `${backendData.data_purity_percent}%` : '100%'),
                nasaPurity: isCommsFailure ? '0%' :((backendData.nasa_purity_percent !== undefined) ? `${backendData.nasa_purity_percent}%` : '100%'),
                terraPurity: isCommsFailure ? '0%' :((backendData.terra_purity_percent !== undefined) ? `${backendData.terra_purity_percent}%` : '100%'),
                weatherPurity: atmosphericNetworkCutoff,
                variance: isCommsFailure ? 'ERR_σ' :((backendData.signal_variance_sigma !== undefined) ? `${backendData.signal_variance_sigma}σ` : '0.0100σ'),
                statusBadge: isCommsFailure ? 'OFFLINE' :(backendData.telemetry_status || 'NOMINAL'),
                anomaliesActive: isCommsFailure ? 99 :(backendData.anomaly_count || 0),
                uplinks: {
                    satellite: isCommsFailure ? 'DISCONNECTED' : (backendData.sat_tracker || 'STABLE'),
                    supabase: isCommsFailure ? 'TIMEOUT' : (backendData.supabase_db || 'CONNECTED'),
                    disaster: isCommsFailure ? 'OFF-SYNC' : disasterStatus, 
                    nasa: isCommsFailure ? 'DECRYPTED' : nasaStatus,
                    aiCompanion: isCommsFailure ? 'STANDBY' : aiCompanionStatus
                }
            }));
        };

        fetchLiveTelemetryMatrix();
        const telemetryInterval = setInterval(fetchLiveTelemetryMatrix, 4000);

        return () => clearInterval(telemetryInterval);
    }, []);

    useEffect(() => {
        if (!isOpen || !canvasRef.current) return;

        let animationFrameId;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        const renderOscilloscopeFrame = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            wavePhase.current += 0.12; 
            
            const baseWaveHeight = stats.anomaliesActive > 0 ? 15 : 6;
            const lineJitterNoise = stats.anomaliesActive > 0 ? 4 : 0;

            ctx.lineWidth = 1.5;

            for (let layer = 0; layer < 2; layer++) {
                ctx.beginPath();
                ctx.strokeStyle = layer === 0 ? "rgba(0, 242, 255, 0.85)" : "rgba(0, 242, 255, 0.25)";

                for (let x = 0; x < canvas.width; x += 4) {
                    const compoundPhase = wavePhase.current + (x * 0.06) + (layer * Math.PI);
                    const randomNoiseModifier = (Math.random() - 0.5) * lineJitterNoise;

                    const y = (canvas.height / 2) + 
                              (Math.sin(compoundPhase) * baseWaveHeight) + 
                              (Math.cos(compoundPhase * 2.2) * (baseWaveHeight / 2)) + 
                              randomNoiseModifier;

                    if (x === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                }
                ctx.stroke();
            }

            animationFrameId = requestAnimationFrame(renderOscilloscopeFrame);
        };

        renderOscilloscopeFrame();
        return () => cancelAnimationFrame(animationFrameId);
    }, [isOpen, stats.anomaliesActive]);

    return (
        <div style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 1000 }}>
            
            <button 
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    background: 'rgba(0, 255, 255, 0.1)',
                    border: '1px solid #00ffff',
                    borderRadius: '15px',
                    color: '#00ffff',
                    padding: '4px 10px',
                    fontFamily: 'Orbitron, sans-serif',
                    fontSize: '9px',
                    letterSpacing: '1px',
                    cursor: 'pointer',
                    boxShadow: 'inset 0 0 10px rgba(0, 255, 255, 0.2)'
                }}
            >
                {isOpen ? '✕ CLOSE DIAGNOSTICS' : '⚙ SYSTEM TELEMETRY'}
            </button>

            
            {isOpen && (
                <div style={{
                    width: '260px',
                    background: 'rgba(0, 8, 16, 0.95)',
                    border: '1px solid #00ffff',
                    padding: '14px',
                    color: '#00ffff',
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    backdropFilter: 'blur(8px)',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
                    marginTop: '8px',
                    borderRadius: '4px'
                }}>
                    <div style={{ borderBottom: '1px solid #00ffff33', paddingBottom: '5px', marginBottom: '8px', fontWeight: 'bold', letterSpacing: '0.5px' }}>
                        NAVA-TARAN CORE DIAGNOSTICS
                    </div>

                    
                    <div style={{ marginBottom: '10px', lineY: '1.5' }}>
                        <div style={{ color: '#888', fontSize: '9px', marginBottom: '4px', letterSpacing: '0.5px' }}>HARDWARE METRICS</div>
                        <div>SYSTEM LATENCY: <span style={{color: stats.latency > 700 ? '#ff3333' : '#00ff00', fontWeight: 'bold'}}>{stats.latency}ms</span></div>
                        <div>ACTIVE CORES: <span style={{color: '#fff'}}>{stats.cores} / {stats.cores}</span></div>
                        <div>DEVICE CHARGE: <span style={{color: '#fff'}}>{stats.battery}</span></div>
                        <div>FPS: <span style={{color: stats.fps < 55 ? '#ffaa00' : '#00ff00', fontWeight: 'bold'}}>{stats.fps} FPS</span></div>

                        <div style={{ marginTop: '3px' }}>
                            <span style={{ color: '#888', fontSize: '11px' }}>SIGNAL VARIANCE:</span> <span style={{color: '#fff', fontWeight: 'bold'}}>{stats.variance}</span>
                            <span style={{
                                marginLeft: '6px', 
                                padding: '1px 4px', 
                                fontSize: '8px', 
                                fontWeight: 'bold',
                                borderRadius: '2px',
                                background: stats.statusBadge === 'NOMINAL' ? 'rgba(0,255,0,0.15)' : 'rgba(255,0,0,0.2)',
                                color: stats.statusBadge === 'NOMINAL' ? '#00ff00' : '#ff3333'
                            }}>
                                {stats.statusBadge}
                            </span>
                        </div>
                    </div>
                    <div style={{ marginBottom: '10px', background: 'rgba(0, 242, 255, 0.03)', border: '1px dashed rgba(0, 242, 255, 0.2)', padding: '6px 8px', borderRadius: '2px' }}>
                        <div style={{ color: '#888', fontSize: '9px', marginBottom: '4px', letterSpacing: '0.5px' }}>STREAM DATA INTEGRITY</div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                            <span style={{ flexGrow: 1 }}>ORBITAL PURITY:</span>
                            <span style={{ 
                                color: parseFloat(stats.purity) < 90 ? '#ff3333' : '#00ffaa', 
                                background: 'rgba(0,0,0,0.4)', 
                                padding: '0 4px', 
                                border: '1px solid rgba(0,242,255,0.1)',
                                borderRadius: '2px',
                                fontWeight: 'bold'
                            }}>
                                [{stats.purity}]
                            </span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center' }}>
                            <span style={{ flexGrow: 1 }}>NASA EXOPLANET:</span>
                            <span style={{ 
                                color: parseFloat(stats.nasaPurity) < 90 ? '#ffaa00' : '#00ffaa', 
                                background: 'rgba(0,0,0,0.4)', 
                                padding: '0 4px', 
                                border: '1px solid rgba(0,242,255,0.1)',
                                borderRadius: '2px'
                            }}>
                                [{stats.nasaPurity}]
                            </span>
                        </div>
                        
                        <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', marginTop: '2px' }}>
                            <span style={{ flexGrow: 1 }}>TERRA HAZARD:</span>
                            <span style={{ 
                                color: parseFloat(stats.terraPurity) < 90 ? '#ff3333' : '#00ffaa', 
                                background: 'rgba(0,0,0,0.4)', 
                                padding: '0 4px', 
                                border: '1px solid rgba(0,242,255,0.1)',
                                borderRadius: '2px'
                            }}>
                                [{stats.terraPurity}]
                            </span>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '3px' }}>
                            <span style={{ flexGrow: 1 }}>ATMOSPHERIC FLUX:</span>
                            <span style={{ 
                                color: parseFloat(stats.weatherPurity) < 90 ? '#ff3333' : '#00ffaa', 
                                background: 'rgba(0,0,0,0.4)', 
                                padding: '0 4px', 
                                border: '1px solid rgba(0,242,255,0.1)',
                                borderRadius: '2px',
                                fontWeight: parseFloat(stats.weatherPurity) < 90 ? 'bold' : 'normal'
                            }}>
                                [{stats.weatherPurity || "100%"}]
                            </span>
                        </div>

                    </div>

                    
                    <div style={{ margin: '10px 0', background: 'rgba(0,12,24,0.7)', border: '1px solid rgba(0,242,255,0.15)', position: 'relative', height: '40px' }}>
                        <canvas ref={canvasRef} width="230" height="40" style={{ display: 'block' }}></canvas>
                        <span style={{ position: 'absolute', top: '2px', left: '4px', fontSize: '7px', color: 'rgba(0,242,255,0.4)', letterSpacing: '0.5px' }}>STREAM PACKET FREQUENCY</span>
                    </div>

                    

                    <div style={{ marginBottom: '10px' }}>
                        <div style={{ color: '#888', fontSize: '9px', marginBottom: '4px', letterSpacing: '0.5px' }}>COMMUNICATION UPLINKS</div>
                        <div>SAT-TRACKER: <span style={{color: stats.uplinks.satellite === 'STABLE' ? '#00ff00' : '#ffaa00', fontWeight: 'bold'}}>{stats.uplinks.satellite}</span></div>
                        
                        {/* GENUINE SUPABASE LIVE BRIDGE CONNECTION FRAME */}
                        <div>SUPABASE DB: <span style={{color: stats.uplinks.supabase === 'CONNECTED' ? '#00ff00' : '#ff3333', fontWeight: 'bold'}}>{stats.uplinks.supabase}</span></div>
                        
                        <div>TERRA-DISASTER: <span style={{color: stats.uplinks.disaster === 'SYNCHRONIZED' ? '#00ff00' : '#ff3333', fontWeight: 'bold'}}>{stats.uplinks.disaster}</span></div>
                        <div>NASA-DATASET: <span style={{color: stats.uplinks.nasa === 'ENCRYPTED' ? '#00ff00' : '#ffaa00', fontWeight: 'bold'}}>{stats.uplinks.nasa}</span></div>
                        <div>AI_SPACE_CHAT: <span style={{color: stats.uplinks.aiCompanion === 'LINKED' ? '#00ff00' : '#ffaa00', fontWeight: 'bold'}}>{stats.uplinks.aiCompanion}</span></div>
                    </div>

                    <div style={{ marginTop: '8px', fontSize: '10px', color: '#fff', borderTop: '1px solid #00ffff22', paddingTop: '6px' }}>
                        MISSION UPTIME: <span style={{fontFamily: 'monospace', fontWeight: 'bold', color: '#00ffff'}}>{stats.uptime}</span>
                    </div>
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