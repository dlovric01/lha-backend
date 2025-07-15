const https = require('https');

const options = {
  hostname: 'lha-devices.duckdns.org',
  path: '/garage/left',
  method: 'POST',
  headers: {
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoiZGFuaWplbCIsImlhdCI6MTc1MjE3MDUyMH0.Yl-JiajOwitIHgbB_JOy7TQM3hbE2R8PFMj8lP_HSNk',
  },
};

const req = https.request(options, (res) => {
  console.log(`Status code: ${res.statusCode}`);

  res.on('data', (chunk) => {
    process.stdout.write(chunk);
  });
});

req.on('error', (e) => {
  console.error('Request error:', e);
});

req.end();
