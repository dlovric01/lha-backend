const express = require('express');
const http = require('http');

const app = express();
const port = 3000;

app.get('/', (_req, res) => {
  res.send('Hello from Raspberry Pi');
});

const server = http.createServer(app);

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
