async function run() {
  const loginAdmin = await fetch('http://localhost:3000/api/auth/custom-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'ernst@hatake.eu', password: 'Yb07tw44!' })
  });
  const adminData = await loginAdmin.json();
  const adminToken = adminData.token;
  
  const createUser = await fetch('http://localhost:3000/api/admin/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
    body: JSON.stringify({ email: 'Phoebe@topbestpkg.com', password: '123', companyName: 'Phoebe Co', role: 'seller' })
  });
  console.log('create user status', createUser.status);
  const t = await createUser.text();
  console.log('create user text', t);
}
run();
