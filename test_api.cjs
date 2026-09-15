const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api-v2/public/partners',
  method: 'GET'
};

const req = http.request(options, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Status:', res.statusCode, 'Body:', data.substring(0, 200)));
});

req.on('error', e => console.error(e));
req.end();
