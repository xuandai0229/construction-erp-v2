import http from 'http';

const data = JSON.stringify({
  email: 'qa_freeze_admin@construction.local',
  password: '123456',
});

const req = http.request(
  {
    hostname: 'localhost',
    port: 3000,
    path: '/api/v1/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length,
    },
  },
  (res) => {
    let body = '';
    res.on('data', (chunk) => (body += chunk));
    res.on('end', () => {
      console.log('STATUS:', res.statusCode);
      console.log('RESPONSE:', body);
    });
  }
);

req.on('error', (err) => {
  console.error('ERROR:', err.message);
});

req.write(data);
req.end();
