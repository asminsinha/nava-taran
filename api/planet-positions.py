from skyfield.api import load
from datetime import datetime
from http.server import BaseHTTPRequestHandler
import json
from urllib.parse import urlparse, parse_qs

# Load resources once (Vercel keeps the instance warm)
ts = load.timescale()
eph = load('de440s.bsp')
sun, earth = eph['sun'], eph['earth']

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
        query = parse_qs(urlparse(self.path).query)
        date_str = query.get("date", [None])[0]

        try:
            if date_str:
                # Handle datetime-local format (YYYY-MM-DDTHH:mm)
                dt = datetime.fromisoformat(date_str.replace('Z', ''))
            else:
                dt = datetime.utcnow()
            
            t = ts.utc(dt.year, dt.month, dt.day, dt.hour, dt.minute)
            positions = {}

            for name, sky_key in planets_map.items():
                astrometric = sun.at(t).observe(eph[sky_key])
                # We use AU coordinates
                x, y, z = astrometric.position.au
                # We return x and y (mapping to Three.js X and Z)
                positions[name] = {"x": float(x), "y": float(y)}

            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(positions).encode())

        except Exception as e:
            self.send_response(500)
            self.end_headers()
            self.wfile.write(str(e).encode())