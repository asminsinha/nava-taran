import ReactMarkdown from 'react-markdown';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import NeuralLinkTelemetry from './NeuralLinkTelemetry';
import AtmosphericFlux from './AtmosphericFlux';
let DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

const calculateLifeScore = (p) => {
    if (!p.st_teff && !p.pl_rade) return null; 
    let score = 100;
    if (p.pl_rade) score -= Math.abs(p.pl_rade - 1) * 20;
    if (p.st_teff) score -= Math.abs(p.st_teff - 5778) / 80;
    if (p.pl_orbsmax) score -= Math.abs(p.pl_orbsmax - 1) * 30;
    return Math.max(5, Math.min(99, Math.round(score)));
};
const getScoreColor = (score) => {
    if (score === null) return '#808080';
    if (score > 75) return '#00ff88'; 
    if (score > 50) return '#ccff00'; 
    if (score > 25) return '#ff9900'; 
    return '#ff4b2b'; 
};
const SolarNexus = () => {
  return (
    <div className="solar-nexus-iframe-wrapper" style={{ width: '100%', height: 'calc(100vh - 60px)', overflow: 'hidden' }}>
      <iframe
        title="Solar System View"
        src="/solar_system.html" 
        style={{ width: '100%', height: '100%', border: 'none' }}
      />
    </div>
  );
};
const TerraScan = () => {
	const [telemetry, setTelemetry] = useState([]);
	const [error, setError] = useState(null);
	const [hazards, setHazards] = useState([]);
	const [news, setNews] = useState([]);

	useEffect(() => {
		const fetchTelemetry = async () => {
			try {
				const res = await axios.get('/api/satellite-scan');
				setTelemetry(res.data);
				setError(null);
			} catch (err) {
				console.error("Telemetry link failed:", err);
				setError("COMMS FAILURE: ENSURE BACKEND IS RUNNING WITHOUT ERROR");
			}
		};
		fetchTelemetry();
		const interval = setInterval(fetchTelemetry, 35000); 
		return () => clearInterval(interval);
	}, []);

	useEffect(() => {
		const fetchGlobalData = async () => {
			try {
		
				const newsFeed = await axios.get("https://api.spaceflightnewsapi.net/v4/articles/?limit=20");
				const filteredNews = newsFeed.data.results.filter(item => 
					!item.title.toLowerCase().includes('nasa') && 
					!item.title.toLowerCase().includes('space command') &&
					!item.title.toLowerCase().includes('headquarters')
				).slice(0, 10);
				setNews(filteredNews);

				
				const eonet = await axios.get("https://eonet.gsfc.nasa.gov/api/v3/events?limit=10&status=open");
				const nasaEvents = eonet.data.events
					.filter(e => e.geometry && e.geometry.length > 0)
					.slice(0, 5);

				
				const usgs = await axios.get("https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minmagnitude=4.5&limit=5");
				
				
				const seismicEvents = usgs.data.features.map(f => ({
					id: f.id.substring(0, 8),
					title: f.properties.place,
					categories: [{ title: "Seismic Activity" }],
					geometry: [{ coordinates: [f.geometry.coordinates[0], f.geometry.coordinates[1]] }]
				}));

				setHazards([...nasaEvents, ...seismicEvents]);
                const combinedHazards = [...nasaEvents, ...seismicEvents];
                await axios.post("http://localhost:5000/api/cache/terra-hazards", { 
                    hazards: combinedHazards 
                }, {
                    headers: { 'Content-Type': 'application/json' }
                });
			} catch (e) { console.error("Data Uplink Failed", e); }
		};
		fetchGlobalData();
	}, []);

	return (
		<>
			<div className="mission-control-hud" style={{ marginBottom: '40px' }}>
				<div className="telemetry-table-container">
					{error && <p style={{color: '#ff4b2b', textAlign: 'center', fontWeight: 'bold'}}>{error}</p>}
					<table className="telemetry-table">
						<thead>
							<tr>
								<th>SATELLITE</th>
								<th>STATUS</th>
								<th>LATITUDE</th>
								<th>LONGITUDE</th>
								<th>ALTITUDE (KM)</th>
								<th>SENSOR PAYLOAD (WEATHER)</th>
								<th>AZIMUTH</th>
								<th>ELEVATION</th>
							</tr>
						</thead>
						<tbody>
							{telemetry.length > 0 ? telemetry.map((sat) => (
								<tr key={sat.id}>
									<td className="sat-name" style={{fontWeight: 'bold'}}>{sat.name}</td>
									<td className="status-cell"><span className="blink-dot"></span> ACTIVE</td>
									<td>{sat.lat.toFixed(4)}°</td>
									<td>{sat.lng.toFixed(4)}°</td>
									<td>{sat.alt.toFixed(2)}</td>
									<td>
										<span style={{ color: '#00f2ff', fontSize: '0.75rem' }}>
											{sat.id === 41752 || sat.id === 51656 ? " MET-SCAN: ACTIVE" : " OPTICAL: CLEAR"}
										</span>
									</td>
									<td>{sat.azimuth.toFixed(2)}°</td>
									<td style={{color: sat.elevation > 0 ? '#00ff88' : '#ff4b2b'}}>
										{sat.elevation.toFixed(2)}°
									</td>
								</tr>
							)) : (
								<tr><td colSpan="8" style={{textAlign: 'center', padding: '20px'}}>INITIALIZING UPLINK...</td></tr>
							)}
						</tbody>
					</table>
				</div>

				<div className="uplink-bar">
					<button className="launch-btn wide" onClick={() => window.open("https://bhuvan.nrsc.gov.in/home/index.php", "_blank")}>
						ESTABLISH SECURE BHUVAN-ISRO UPLINK ↗
					</button>
				</div>

				<div className="map-wrapper" style={{ border: '1px solid #00ff88', borderRadius: '5px', overflow: 'hidden', marginTop: '20px' }}>
					<MapContainer center={[20.59, 78.96]} zoom={3} style={{ height: '450px', width: '100%', background: '#000' }}>
						<TileLayer
							url="https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief_Bathymetry/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpg"
							attribution="NASA GIBS"
						/>
						<TileLayer 
							url={`https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=8cd562d84eaabd242faff60cb54eee56`}
						/>
						{telemetry.map(sat => (
							<Marker key={sat.id} position={[sat.lat, sat.lng]}>
								<Popup>
									<strong style={{color: '#001a1a'}}>{sat.name}</strong><br/>
									Telemetry Locked.
								</Popup>
							</Marker>
						))}
					</MapContainer>
				</div>
			</div>
            
            <AtmosphericFlux />

			<div className="external-intel-feed" style={{ background: 'transparent', padding: '40px 20px' }}>
				<div className="archive-separator" style={{ textAlign: 'center', margin: '40px 0 100px', borderBottom: '1px solid rgba(0, 255, 136, 0.3)', lineHeight: '0.1em' }}>
					<span style={{ background: 'transparent', padding: '0 20px', color: '#00ff88', fontSize: '1.2rem', letterSpacing: '8px', textShadow: '0 0 10px #00ff88' }}>
						ORBITAL INTELLIGENCE ARCHIVE
					</span>
				</div>

				<div className="dynamic-archive-container">
					{news.map((item, index) => (
						<div 
							key={item.id} 
							className={`zigzag-item ${index % 2 === 0 ? '' : 'reverse'}`} 
							onClick={() => window.open(item.url, '_blank')}
							style={{ 
								display: 'flex', 
								flexDirection: index % 2 === 0 ? 'row' : 'row-reverse', 
								alignItems: 'center', 
								gap: '60px', 
								marginBottom: '120px', 
								cursor: 'pointer' 
							}}
						>
							<div className="zigzag-image-wrapper" style={{ position: 'relative', width: '45%', overflow: 'hidden', borderRadius: '15px' }}>
								<div className="scan-line"></div>
								<img 
									src={item.image_url} 
									alt="Space Intel" 
									className="intel-image"
									style={{ width: '100%', height: '300px', objectFit: 'cover', display: 'block' }} 
								/>
							</div>

							<div className="zigzag-text">
								<h3 className="intel-headline" style={{ color: '#FFF3D6', marginBottom: '15px', fontSize: '1.5rem' }}>
									{item.title}
								</h3>
								<p style={{ color: '#ccc', fontSize: '0.95rem', lineHeight: '1.7' }}>
									{item.summary ? item.summary.substring(0, 220) + '...' : "Establishing secure data link for full brief..."}
								</p>
								<div style={{ marginTop: '20px', fontSize: '0.75rem', color: '#00f2ff', letterSpacing: '1px' }}>
									| AUTH_DATE: {new Date(item.published_at).toLocaleDateString()}
								</div>
							</div>
						</div>
					))}

					<div className="hazards-report-section" style={{ marginTop: '100px' }}>
						<h2 style={{ color: '#ff4b2b', textAlign: 'center', letterSpacing: '5px', marginBottom: '40px' }}>TERRA-HAZARD TELEMETRY</h2>
						<div className="telemetry-table-container" style={{ background: 'rgba(255, 75, 43, 0.05)', border: '1px solid rgba(255, 75, 43, 0.2)' }}>
							<table className="telemetry-table">
								<thead>
									<tr style={{ borderBottom: '2px solid #ff4b2b' }}>
										<th style={{ color: '#ff4b2b' }}>EVENT ID</th>
										<th style={{ color: '#ff4b2b' }}>CATEGORY</th>
										<th style={{ color: '#ff4b2b' }}>DESIGNATION</th>
										<th style={{ color: '#ff4b2b' }}>COORDINATES</th>
									</tr>
								</thead>
								<tbody>
									{hazards.map((event) => (
										<tr key={event.id} style={{ borderBottom: '1px solid rgba(255,75,43,0.1)' }}>
											<td>{event.id}</td>
											<td style={{ fontWeight: 'bold', color: '#ff4b2b' }}>{event.categories[0].title.toUpperCase()}</td>
											<td>{event.title}</td>
											<td style={{ fontFamily: 'monospace' }}>
												{event.geometry[0].coordinates[1].toFixed(2)}N, {event.geometry[0].coordinates[0].toFixed(2)}E
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				</div>
			</div>
		</>
	);
};

function App() {
    const [user, setUser] = useState(JSON.parse(sessionStorage.getItem('activeUser')) || null);
    const [savedPlanets, setSavedPlanets] = useState([]);
    const [isAuthOpen, setIsAuthOpen] = useState(false);
    const [authMode, setAuthMode] = useState('login');
    const [view, setView] = useState('earth'); 
    const [planets, setPlanets] = useState([]);
    const [selectedPlanet, setSelectedPlanet] = useState(null);
    const [chatInput, setChatInput] = useState("");
    const [chatHistory, setChatHistory] = useState([{ role: 'ai', message: "Greetings, Commander. I am your Stellar Intel interface. Ask me anything about the cosmos." }]);
    const [formData, setFormData] = useState({ name: '', email: '', phone: '', password: '' });

    useEffect(() => {
        if (view === 'space') {
            axios.get('/api/exoplanets')
                .then(res => setPlanets(res.data))
                .catch(err => console.error("Signal lost with NASA", err));
        }
    }, [view]);

    useEffect(() => {
        if (user) {
            const storedVault = localStorage.getItem(`vault_${user.email}`);
            setSavedPlanets(storedVault ? JSON.parse(storedVault) : []);
        } else {
            setSavedPlanets([]);
        }
    }, [user]);

    const handleAuth = async () => {
        const endpoint = authMode === 'login' ? 'login' : 'signup';
        try {
            const res = await axios.post(`/api/auth/${endpoint}`, formData);
            const userData = res.data.user;
            setUser(userData);
            sessionStorage.setItem('activeUser', JSON.stringify(userData));
            setIsAuthOpen(false);
            alert(res.data.message);
        } catch (err) {
            alert(err.response?.data?.message || "Authentication Failed");
        }
    };

    const handleLogout = () => {
        setUser(null);
        sessionStorage.removeItem('activeUser');
        setView('earth');
    };

  
    const handleRetireProfile = async () => {
        const confirmation = window.confirm("WARNING: Decommissioning your dossier is permanent. All logbook data will be lost from our cloud vaults. Proceed?");
        if (!confirmation) return;

        try {
            const res = await axios.delete('/api/auth/retire-profile', { 
                data: { email: user.email } 
            });
            alert(res.data.message);
            
            localStorage.removeItem(`vault_${user.email}`);
            handleLogout();
        } catch (err) {
            alert("Retirement sequence failed. Comms error.");
        }
    };

    const saveToVault = (planet) => {
        if (!user) { setIsAuthOpen(true); return; }
        if (savedPlanets.find(p => p.pl_name === planet.pl_name)) return alert("Already in logs.");
        const newVault = [...savedPlanets, planet];
        setSavedPlanets(newVault);
        localStorage.setItem(`vault_${user.email}`, JSON.stringify(newVault));
    };

    const removeFromVault = (name) => {
        const newVault = savedPlanets.filter(p => p.pl_name !== name);
        setSavedPlanets(newVault);
        localStorage.setItem(`vault_${user.email}`, JSON.stringify(newVault));
    };

const sendMessage = async () => {
        if (!chatInput.trim()) return;

        const userMsg = { role: 'user', message: chatInput };
        
       
        setChatHistory(prev => [...prev, userMsg]);
        setChatInput("");

        try {
           
            const res = await axios.post('/api/space-chat', { 
                message: userMsg.message 
            });

            
            if (res.data && res.data.response) {
                setChatHistory(prev => [...prev, { role: 'ai', message: res.data.response }]);
            }
        } catch (err) {
            console.error("Comm-Link Failure:", err);
            setChatHistory(prev => [...prev, { 
                role: 'ai', 
                message: "⚠️ *SYSTEM ALERT:* Communications with the Deep Space Network interrupted. Ensure backend is running without error." 
            }]);
        }
    };


    return (
        <div className="App">
            {isAuthOpen && (
                <div className="modal-overlay">
                    <div className="login-box">
                        <h2>{authMode.toUpperCase()}</h2>
                        {authMode === 'signup' && (
                            <>
                                <input type="text" placeholder="Full Name" onChange={(e) => setFormData({...formData, name: e.target.value})} />
                                <input type="text" placeholder="Phone" onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                            </>
                        )}
                        <input type="email" placeholder="Email" onChange={(e) => setFormData({...formData, email: e.target.value})} />
                        <input type="password" placeholder="Password" onChange={(e) => setFormData({...formData, password: e.target.value})} />
                        <div className="login-actions">
                            <button onClick={handleAuth}>{authMode === 'login' ? 'LOGIN' : 'SIGN UP'}</button>
                            <button className="abort-btn" onClick={() => setIsAuthOpen(false)}>CANCEL</button>
                        </div>
                        <p style={{fontSize:'0.8rem', marginTop:'15px', cursor:'pointer'}} onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}>
                            {authMode === 'login' ? "New Pilot? Register Here" : "Existing Pilot? Login Here"}
                        </p>
                    </div>
                </div>
            )}

            {selectedPlanet && (
                <div className="modal-overlay">
                    <div className="login-box" style={{ border: '1px solid #00f2ff', maxWidth: '450px' }}>
                        <h2 style={{ color: '#00f2ff', marginBottom: '10px' }}>{selectedPlanet.pl_name}</h2>
<div className="planet-details" style={{ textAlign: 'left', marginBottom: '20px', lineHeight: '1.4', fontSize: '0.9rem' }}>

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', borderBottom: '1px solid #333', paddingBottom: '10px' }}>
        <p><strong style={{color: '#00f2ff'}}>Host Star:</strong><br/>{selectedPlanet.hostname}</p>
        <p><strong style={{color: '#00f2ff'}}>Distance:</strong><br/>{selectedPlanet.sy_dist ? `${selectedPlanet.sy_dist} pc` : 'Unknown'}</p>
        <p><strong style={{color: '#00f2ff'}}>Discovery Year:</strong><br/>{selectedPlanet.disc_year || 'Unknown'}</p>
        <p><strong style={{color: '#00f2ff'}}>Discovery Method:</strong><br/>{selectedPlanet.discoverymethod || 'Unknown'}</p>
    </div>
    
    <h4 style={{ margin: '15px 0 5px', color: '#00ff88', fontSize: '0.8rem' }}>HABITABILITY TELEMETRY:</h4>
    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '5px' }}>
        <p><strong>Planetary Radius:</strong> {selectedPlanet.pl_rade ? `${selectedPlanet.pl_rade} Earth Radii` : <span style={{color: '#808080'}}>Unknown</span>}</p>
        <p><strong>Semi-Major Axis:</strong> {selectedPlanet.pl_orbsmax ? `${selectedPlanet.pl_orbsmax} AU` : <span style={{color: '#808080'}}>Unknown</span>}</p>
        <p><strong>Star Temp:</strong> {selectedPlanet.st_teff ? `${selectedPlanet.st_teff} K` : <span style={{color: '#808080'}}>Unknown</span>}</p>
        <p><strong>Orbital Period:</strong> {selectedPlanet.pl_orbper ? `${Math.round(selectedPlanet.pl_orbper)} Earth Days` : <span style={{color: '#808080'}}>Unknown</span>}</p>
    </div>

    <div style={{ 
        marginTop: '15px', 
        textAlign: 'center', 
        padding: '10px', 
        border: `1px solid ${getScoreColor(calculateLifeScore(selectedPlanet))}`,
        background: `${getScoreColor(calculateLifeScore(selectedPlanet))}11` 
    }}>
        <span style={{ fontSize: '0.8rem', color: '#ccc' }}>PROBABILISTIC LIFE SCORE:</span>
        <h2 style={{ color: getScoreColor(calculateLifeScore(selectedPlanet)), margin: 0 }}>
            {calculateLifeScore(selectedPlanet) !== null ? `${calculateLifeScore(selectedPlanet)}%` : "UNKNOWN"}
        </h2>
    </div>
</div>
                        <div className="login-actions" style={{ flexDirection: 'column', gap: '10px' }}>
                            <button onClick={() => { saveToVault(selectedPlanet); setSelectedPlanet(null); }}>ADD TO LOGBOOK</button>
                            <button className="abort-btn" onClick={() => setSelectedPlanet(null)}>CLOSE DATA</button>
                        </div>
                    </div>
                </div>
            )}

            <nav className="navbar">
                <div className="nav-left">
                    {user ? (
                        <div className="user-profile-nav">
                            <span className="user-tag" onClick={() => setView('profile')}>CMD. {user.name.toUpperCase()}</span>
                            <button className="abort-btn" onClick={handleLogout} style={{padding: '5px 10px', fontSize: '0.6rem', marginLeft: '10px'}}>LOGOUT</button>
                        </div>
                    ) : (
                        <button className="auth-btn" onClick={() => { setAuthMode('login'); setIsAuthOpen(true); }}>LOGIN</button>
                    )}
                    <button onClick={() => setView('logbook')}>LOGBOOK ({savedPlanets.length})</button>
                </div>
                <h1 className="logo" onClick={() => setView('earth')} style={{cursor:'pointer'}}>NAVA-TARAN</h1>
                <div className="nav-right">
                    <button className={view === 'earth' ? 'active' : ''} onClick={() => setView('earth')}>EARTH</button>
                    
                    <button className={view === 'sol' ? 'active' : ''} onClick={() => setView('sol')}>SOL MAP</button>
                    <button className={view === 'space' ? 'active' : ''} onClick={() => setView('space')}>DEEP SPACE</button>
                </div>
            </nav>

            <div className="main-stage">
{view === 'earth' && (
    <div className="earth-view">

        <div className="earth-banner" style={{ padding: '0 20px', position: 'relative' }}>
            <NeuralLinkTelemetry />
            <div className="banner-overlay" style={{ padding: '0 20px', position: 'relative' }}>
                <h1>TERRA-SCAN: MISSION CONTROL</h1>
            </div>
        </div>


        <div className="mission-control-wrapper" style={{ padding: '0 20px', position: 'relative' }}>
            <div className="hud-header" style={{ textAlign: 'center', marginBottom: '10px' }}>
                <h2 style={{ 
                    color: '#00ff88', 
                    textShadow: '0 0 15px rgba(0, 255, 136, 0.5)',
                    letterSpacing: '3px',
                    fontSize: '1.8rem'
                }}>
                    INDIAN ORBITAL ASSETS TELEMETRY
                </h2>
                <p style={{ color: '#888', fontSize: '0.8rem' }}>
                    SECURE NODE | DATA SOURCE: CELESTRAK & NASA GIBS
                </p>
            </div>


            <TerraScan /> 
        </div>
    </div>
)}
                
                {view === 'sol' && <SolarNexus />}

                {view === 'space' && (
    <div className="space-view">
        <h2 style={{ letterSpacing: '5px', color: '#00f2ff' }}>DEEP SPACE: HABITABILITY SCAN</h2>
        <p style={{ color: '#888', marginBottom: '20px' }}>Analyzing 50 Major Exoplanets via NASA Archive</p>
        <div className="planet-grid">
            {planets.map((p, i) => {
                const score = calculateLifeScore(p);
                const color = getScoreColor(score);
                return (
                    <div key={i} className="planet-card" onClick={() => setSelectedPlanet(p)} style={{ borderLeft: `4px solid ${color}` }}>
                        <h3 style={{ color: '#fff' }}>{p.pl_name}</h3>
                        <p style={{ fontSize: '0.7rem', color: '#aaa' }}>{p.hostname}</p>
                        <div className="life-score-container" style={{ marginTop: '10px' }}>
                            <span style={{ fontSize: '0.6rem', display: 'block', color: '#888' }}>LIFE PROBABILITY:</span>
                            <span style={{ 
                                color: color, 
                                fontWeight: 'bold', 
                                fontSize: '1.2rem',
                                textShadow: `0 0 10px ${color}55`
                            }}>
                                {score !== null ? `${score}%` : "UNKNOWN"}
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
    </div>
                )}

                {view === 'logbook' && (
                    <div className="logbook-view">
                        <h2>Mission Logs</h2>
                        <div className="planet-grid">
                            {savedPlanets.map((p, i) => (
                                <div key={i} className="planet-card saved">
                                    <h3>{p.pl_name}</h3>
                                    <p>{p.hostname}</p>
                                    <button className="abort-btn" style={{width:'100%', marginTop:'10px'}} onClick={() => removeFromVault(p.pl_name)}>PURGE DATA</button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {view === 'chat' && (
                    <div className="chat-interface">
                        <div className="chat-window">
                            {chatHistory.map((msg, i) => (
                                <div key={i} className={`chat-bubble ${msg.role}`}>
                                    <small>{msg.role.toUpperCase()}</small>
                                    <div className="markdown-body"><ReactMarkdown>{msg.message}</ReactMarkdown></div>
                                </div>
                            ))}
                        </div>
                        <div className="chat-input-area">
                            <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Query the cosmos..." onKeyPress={(e) => e.key === 'Enter' && sendMessage()} />
                            <button onClick={sendMessage}>SEND</button>
                        </div>
                    </div>
                )}

                {view === 'profile' && user && (
                    <div className="profile-view">
                        <div className="mission-card">
                            <h2>PILOT DOSSIER</h2>
                            <div className="coordinates">
                                <p>NAME: {user.name}</p>
                                <p>EMAIL: {user.email}</p>
                                <p>COMM-LINK: {user.phone}</p>
                                <p>RANK: COMMANDER</p>
                            </div>
                            

                            <div className="danger-zone">
                                <p className="delete-text">Requesting dossier decommissioning will erase your status and logbooks from the cloud vault.</p>
                                <div className="login-actions">
                                    <button className="logout-btn" onClick={handleLogout}>LOGOUT ONLY</button>
                                    <button className="abort-btn" onClick={handleRetireProfile}>DECOMMISSION PROFILE</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <button 
                className={`ai-fab ${view === 'chat' ? 'active' : ''}`} 
                onClick={() => setView('chat')}
                title="Consult Stellar Intel"
            >
                AI
            </button>
        </div>
    );
}
export default App;
