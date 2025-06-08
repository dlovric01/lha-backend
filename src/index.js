const express = require('express');
const axios = require('axios');
const http = require('http');
const os = require('os');


const app = express();
const port = 3000;

// Test route
app.get('/', (_req, res) => {
  res.send('Hello from Raspberry Pi');
});

// Simulate button press
app.get('/trigger', async (_req, res) => {
  const shellyIp = '192.168.1.8';

  try {
    await axios.get(`http://${shellyIp}/relay/0?turn=on`);
    await new Promise(resolve => setTimeout(resolve, 100));
    await axios.get(`http://${shellyIp}/relay/0?turn=off`);

    res.send('Relay triggered (ON → OFF)');
  } catch (error) {
    console.error('Error triggering relay:', error.message);
    res.status(500).send('Failed to trigger relay');
  }
});

const server = http.createServer(app);

server.listen(port, () => {
  const interfaces = os.networkInterfaces();
  Object.values(interfaces).forEach(iface =>
    iface.forEach(addr => {
      if (addr.family === 'IPv4' && !addr.internal) {
        console.log(`Server running at http://${addr.address}:${port}`);
      }
    })
  );
});