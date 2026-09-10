async function run() {
  // 1. login as admin
  const loginAdmin = await fetch('http://localhost:3000/api/auth/custom-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'ernst@hatake.eu', password: 'Yb07tw44!' })
  });
  const adminData = await loginAdmin.json();
  const adminToken = adminData.token;

  // 2. create user
  const createUser = await fetch('http://localhost:3000/api/admin/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
    body: JSON.stringify({ email: 'phoebe@test.com', password: '123', companyName: 'Phoebe Co', role: 'seller' })
  });
  const userData = await createUser.json();
  console.log('User created:', userData);

  // 3. login as phoebe
  const loginUser = await fetch('http://localhost:3000/api/auth/custom-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'phoebe@test.com', password: '123' })
  });
  const userTokenData = await loginUser.json();
  console.log('User logged in:', userTokenData);
  const userToken = userTokenData.token;

  // 4. patch
  const patchRes = await fetch('http://localhost:3000/api/users/me', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userToken}` },
    body: JSON.stringify({ 
      companyName: 'New Phoebe Co', orgNumber: '5678'
    })
  });
  const patchData = await patchRes.json();
  console.log('Patch result:', patchRes.status, patchData);
}
run();
