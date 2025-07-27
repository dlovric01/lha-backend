require('dotenv').config();
const express = require('express');
const axios = require('axios');
const os = require('os');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

const app = express();
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET;
const PORT = process.env.PORT || 3000;

// Shelly devices IPs on your LAN
const shellyDevices = {
  left: 'http://192.168.1.202',   // update IP accordingly
  right: 'http://192.168.1.201',  // update IP accordingly
  gate: 'http://192.168.1.203',   // update IP accordingly
};

// Global rate limiter (20 req/min per IP)
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'Previše zahtjeva s ove IP adrese, pokušajte kasnije.' },
  standardHeaders: true,
  legacyHeaders: false,
}));

// JWT auth middleware
function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Nedostaje Authorization zaglavlje' });

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Nedostaje JWT token' });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Nevažeći token' });
    req.user = decoded;
    next();
  });
}

// Utility: get local IP of backend server
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const ifaceList of Object.values(interfaces)) {
    for (const iface of ifaceList) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

// Per-route rate limiter for toggling (10 req/min)
const toggleLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Previše zahtjeva za upravljanje, pokušajte kasnije.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Send HTTP POST to Shelly device to toggle relay
async function toggleShellyRelay(target) {
  const baseUrl = shellyDevices[target];
  if (!baseUrl) throw new Error(`Nepoznat cilj: ${target}`);

  const url = `${baseUrl}/rpc/Switch.Toggle`;
  console.log(`📤 Slanje HTTP POST na: ${url}`);

  const response = await axios.post(url, { id: 0 }, { timeout: 3000 });
  console.log(`✅ Odgovor od Shelly:`, response.data);
  return response.data;
}

// Shared toggle handler
async function handleToggle(req, res, target) {
  try {
    console.log(`🔁 Aktivacija (HTTP): ${target}`);
    await toggleShellyRelay(target);
    console.log('✅ HTTP naredba uspješno poslana');
    res.json({ status: 'ok', akcija: 'toggle', cilj: target });
  } catch (err) {
    console.error(`❌ Greška (${target}):`, err.message);
    res.status(500).json({ error: 'Slanje HTTP zahtjeva nije uspjelo', message: err.message });
  }
}

// Routes

// Toggle garage door left or right
app.post('/garage/:side', authenticateJWT, toggleLimiter, (req, res) => {
  const { side } = req.params;
  if (!['left', 'right'].includes(side)) {
    return res.status(400).json({ error: 'Nevažeća strana garaže' });
  }
  handleToggle(req, res, side);
});

// Toggle gate
app.post('/gate', authenticateJWT, toggleLimiter, (req, res) => {
  handleToggle(req, res, 'gate');
});

// Start server
app.listen(PORT, () => {
  const ip = getLocalIp();
  console.log(`🚀 Server pokrenut na http://${ip}:${PORT}`);
});
