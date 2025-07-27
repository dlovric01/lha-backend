require('dotenv').config();
const express = require('express');
const mqtt = require('mqtt');
const os = require('os');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

const app = express();
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET;
const MQTT_HOST = process.env.MQTT_HOST;
const MQTT_PORT = parseInt(process.env.MQTT_PORT, 10);
const PORT = process.env.PORT || 3000;

// === MQTT Topic Map ===
const topicMap = {
  left: 'lha/garage/left/rpc',
  right: 'lha/garage/right/rpc',
  gate: 'lha/gate/rpc',
};

// === Global Rate Limiter ===
app.use(rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  message: { error: 'Previše zahtjeva s ove IP adrese, pokušajte kasnije.' },
  standardHeaders: true,
  legacyHeaders: false,
}));

// === JWT Auth Middleware ===
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

// === MQTT Setup ===
const mqttClient = mqtt.connect(`mqtt://${MQTT_HOST}`, { port: MQTT_PORT });

mqttClient.on('connect', () => {
  console.log('✅ MQTT povezan');
});

mqttClient.on('error', (err) => {
  console.error('❌ MQTT greška:', err.message);
});

mqttClient.on('close', () => {
  console.warn('⚠️ MQTT veza zatvorena');
});

// === MQTT Command Publisher ===
function publishRelayCommand(target) {
  const topic = topicMap[target];
  if (!topic) {
    return Promise.reject(new Error(`Nepoznat MQTT cilj: ${target}`));
  }

  const payload = JSON.stringify({
    id: 1,
    src: 'nodejs-backend',
    method: 'Switch.Toggle',
    params: { id: 0 },
  });

  console.log(`📤 Slanje MQTT poruke na temu: ${topic}`);

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('MQTT objava je istekla'));
    }, 3000);

    mqttClient.publish(topic, payload, (err) => {
      clearTimeout(timeout);
      if (err) {
        console.error('❌ MQTT objava nije uspjela:', err);
        return reject(err);
      }
      console.log(`✅ MQTT poruka poslana na ${topic}`);
      resolve();
    });
  });
}

// === Utility: Get Local IP ===
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

// === Per-Route Rate Limiter ===
const toggleLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Previše zahtjeva za upravljanje, pokušajte kasnije.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// === Shared Toggle Handler ===
async function handleToggle(req, res, target) {
  try {
    console.log(`🔁 Aktivacija: ${target}`);
    await publishRelayCommand(target);
    console.log('✅ Naredba za aktivaciju poslana');
    res.json({ status: 'ok', akcija: 'toggle', cilj: target });
  } catch (err) {
    console.error(`❌ Greška pri slanju MQTT naredbe (${target}):`, err.message);
    res.status(500).json({ error: 'Slanje MQTT poruke nije uspjelo', message: err.message });
  }
}

// === Routes ===

// Garage toggle
app.post('/garage/:side', authenticateJWT, toggleLimiter, (req, res) => {
  const { side } = req.params;
  if (!['left', 'right'].includes(side)) {
    return res.status(400).json({ error: 'Nevažeća strana garaže' });
  }
  handleToggle(req, res, side);
});

// Gate toggle
app.post('/gate', authenticateJWT, toggleLimiter, (req, res) => {
  handleToggle(req, res, 'gate');
});

// === Start Server ===
app.listen(PORT, () => {
  const ip = getLocalIp();
  console.log(`🚀 Server pokrenut na http://${ip}:${PORT}`);
});
