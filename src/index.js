import express from 'express'
import axios from 'axios'
import http from 'http'

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
    await axios.get('http://raspberrypi.local/relay/0?turn=on');

    // Wait 500 ms
    await new Promise(resolve => setTimeout(resolve, 500));

    // Turn relay OFF
    await axios.get('http://raspberrypi.local/relay/0?turn=off');

    res.send('Relay triggered (ON → OFF)');
  } catch (error) {
    console.error('Error triggering relay:', error.message);
    res.status(500).send('Failed to trigger relay');
  }
});

const server = http.createServer(app);

server.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});

