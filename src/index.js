const express = require('express');
const http = require('http');
const axios = require('axios');

const app = express();
const port = 3000;

// Test route
app.get('/', (_req, res) => {
  res.send('Hello from Raspberry Pi');
});

// Simulate button press
app.get('/trigger', async (_req, res) => {
  try {
    // Turn relay ON
    await axios.get('http://192.168.1.26/relay/0?turn=on');

    // Wait 500 ms
    await new Promise(resolve => setTimeout(resolve, 500));

    // Turn relay OFF
    await axios.get('http://192.168.1.26/relay/0?turn=off');

    res.send('Relay triggered (ON → OFF)');
  } catch (error) {
    console.error('Error triggering relay:', error.message);
    res.status(500).send('Failed to trigger relay');
  }
});

const server = http.createServer(app);

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
