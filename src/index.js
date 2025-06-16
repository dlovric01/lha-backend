require('dotenv').config();
const express = require('express');
const mqtt = require('mqtt');
const os = require('os');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());

// JWT secret
const JWT_SECRET = process.env.JWT_SECRET;

// JWT middleware
function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Missing Authorization header' });

  const token = authHeader.split(' ')[1]; // Bearer <token>
  if (!token) return res.status(401).json({ error: 'Missing token' });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = decoded;
    next();
  });
}

// MQTT connection
const mqttClient = mqtt.connect(`mqtt://${process.env.MQTT_HOST}`, {
  username: process.env.MQTT_USER,
  password: process.env.MQTT_PASS,
  port: parseInt(process.env.MQTT_PORT)
});

mqttClient.on('connect', () => {
  console.log('✅ MQTT connected');
});

mqttClient.on('error', (err) => {
  console.error('❌ MQTT connection error:', err.message);
});

mqttClient.on('close', () => {
  console.warn('⚠️ MQTT connection closed');
});

// MQTT command publisher with timeout
function publishRelayCommand(target) {
  return new Promise((resolve, reject) => {
    const topic = `lha/garage/${target}/rpc`;
    const payload = JSON.stringify({
      id: 1,
      src: "nodejs-backend",
      method: "Switch.Toggle",
      params: { id: 0 }
    });

    console.log(`📤 Publishing to topic: ${topic}`);
    let timeout = setTimeout(() => {
      reject(new Error("MQTT publish timed out"));
    }, 3000);

    mqttClient.publish(topic, payload, (err) => {
      clearTimeout(timeout);
      if (err) {
        console.error("❌ MQTT publish error:", err);
        reject(err);
      } else {
        console.log(`✅ MQTT message sent to ${topic}`);
        resolve();
      }
    });
  });
}

// Helper to get local IP address
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const ifaceName of Object.keys(interfaces)) {
    for (const iface of interfaces[ifaceName]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

// Secured endpoint
app.post('/garage/:side', authenticateJWT, async (req, res) => {
  const { side } = req.params;

  if (!['left', 'right'].includes(side)) {
    return res.status(400).json({ error: 'Invalid garage side' });
  }

  try {
    console.log(`🔁 Toggling garage door: ${side}`);
    await publishRelayCommand(side);
    console.log(`✅ Toggle command complete`);
    res.json({ status: 'ok', action: 'toggle', side });
  } catch (err) {
    console.error("❌ Failed to publish MQTT message:", err.message);
    res.status(500).json({ error: 'MQTT publish failed', message: err.message });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  const ip = getLocalIp();
  console.log(`🚀 Server running on http://${ip}:${PORT}`);
});
