import http from 'http';

async function diag2() {
  const req = http.request('http://localhost:3000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => console.log('WRONG PASS STATUS:', res.statusCode, 'BODY:', data));
  });
  req.write(JSON.stringify({ email: 'qa_freeze_admin@construction.local', password: 'wrong_password_xyz' }));
  req.end();
}

diag2();
