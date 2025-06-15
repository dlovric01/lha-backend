require('dotenv').config();
const express = require('express');
const mqtt = require('mqtt');

const app = express();
app.use(express.json());

// MQTT connection
const mqttClient = mqtt.connect(`mqtt://${process.env.MQTT_HOST}`, {
  username: process.env.MQTT_USER,
  password: process.env.MQTT_PASS,
  port: parseInt(process.env.MQTT_PORT)
});

mqttClient.on('connect', () => {
  console.log('✅ MQTT connected');
});

function publishRelayCommand(target) {
  const topic = `lha/garage/${target}/rpc`;
  const payload = JSON.stringify({
    id: 1,
    src: "nodejs-backend",
    method: "Switch.Toggle",
    params: { id: 0 }
  });

  mqttClient.publish(topic, payload, (err) => {
    if (err) console.error("MQTT publish error:", err);
  });
}

// Endpoints
app.post('/garage/:side', (req, res) => {
  const { side } = req.params;

  if (!['left', 'right'].includes(side)) {
    return res.status(400).json({ error: 'Invalid garage side' });
  }

  publishRelayCommand(side);
  res.json({ status: 'ok', action: 'toggle', side });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
