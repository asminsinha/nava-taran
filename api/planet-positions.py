from skyfield.api import load
from datetime import datetime
from http.server import BaseHTTPRequestHandler
import json
from urllib.parse import urlparse, parse_qs

# Pre-load to avoid timeout
ts = load.timescale()
eph = load('de440s.bsp')
sun = eph['sun']

planets_map = {
    "Mercury": "mercury barycenter",
    "Venus": "venus barycenter",
    "Earth": "earth barycenter",
    "Mars": "mars barycenter",
    "Jupiter": "jupiter barycenter",
    "Saturn": "saturn barycenter",
    "Uranus": "uranus barycenter",
    "Neptune": "neptune barycenter",
    "Pluto": "pluto barycenter"
}

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        # Ignore favicon requests which can cause 500 errors
        if self.path == '/favicon.ico':
            self.send_response(204)
            self.end_headers()
            return

        query = parse_qs(urlparse(self.path).query)
        date_str = query.get("date", [None])[0]

        try:
            dt = datetime.fromisoformat(date_str.replace('Z', '')) if date_str else datetime.utcnow()
            t = ts.utc(dt.year, dt.month, dt.day, dt.hour, dt.minute)
            
            positions = {}
            for name, sky_key in planets_map.items():
                astrometric = sun.at(t).observe(eph[sky_key])
                x, y, z = astrometric.position.au
                positions[name] = {"x": float(x), "y": float(y)}

            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            # Fix for local testing if needed
            self.send_header('Access-Control-Allow-Origin', '*') 
            self.end_headers()
            self.wfile.write(json.dumps(positions).encode())

        except Exception as e:
            self.send_response(500)
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())