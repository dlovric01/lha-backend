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
const MQTT_PORT = parseInt(process.env.MQTT_PORT);
const PORT = process.env.PORT || 3000;

// === Global Rate Limiter ===
app.use(rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
}));

// === JWT Auth Middleware ===
function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Missing Authorization header' });

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Missing token' });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = decoded;
    next();
  });
}

// === MQTT Setup ===
const mqttClient = mqtt.connect(`mqtt://${MQTT_HOST}`, { port: MQTT_PORT });

mqttClient.on('connect', () => {
  console.log('✅ MQTT connected');
});

mqttClient.on('error', (err) => {
  console.error('❌ MQTT error:', err.message);
});

mqttClient.on('close', () => {
  console.warn('⚠️ MQTT connection closed');
});

// === MQTT Command Publisher ===
function publishRelayCommand(target) {
  const topic = `lha/garage/${target}/rpc`;
  const payload = JSON.stringify({
    id: 1,
    src: 'nodejs-backend',
    method: 'Switch.Toggle',
    params: { id: 0 },
  });

  console.log(`📤 Publishing to topic: ${topic}`);

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('MQTT publish timed out'));
    }, 3000);

    mqttClient.publish(topic, payload, (err) => {
      clearTimeout(timeout);
      if (err) {
        console.error('❌ MQTT publish error:', err);
        return reject(err);
      }
      console.log(`✅ MQTT message sent to ${topic}`);
      resolve();
    });
  });
}

// === Local IP Utility ===
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
const garageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many garage toggle requests, please wait a bit.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// === Garage Toggle Route ===
app.post('/garage/:side', authenticateJWT, garageLimiter, async (req, res) => {
  const { side } = req.params;

  if (!['left', 'right'].includes(side)) {
    return res.status(400).json({ error: 'Invalid garage side' });
  }

  try {
    console.log(`🔁 Toggling garage door: ${side}`);
    await publishRelayCommand(side);
    console.log('✅ Toggle command complete');
    res.json({ status: 'ok', action: 'toggle', side });
  } catch (err) {
    console.error('❌ MQTT publish failed:', err.message);
    res.status(500).json({ error: 'MQTT publish failed', message: err.message });
  }
});

// === Start Server ===
app.listen(PORT, () => {
  const ip = getLocalIp();
  console.log(`🚀 Server running at http://${ip}:${PORT}`);
});
