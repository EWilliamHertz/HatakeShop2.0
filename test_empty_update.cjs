async function run() {
  const loginAdmin = await fetch('http://localhost:3000/api/auth/custom-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'ernst@hatake.eu', password: 'Yb07tw44!' })
  });
  const adminData = await loginAdmin.json();
  const adminToken = adminData.token;

  // Let's create a custom token for a non-existent user
  const userToken = 'custom-token-non-existent-123';

  const patchRes = await fetch('http://localhost:3000/api/users/me', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userToken}` },
    body: JSON.stringify({ 
      companyName: 'Test'
    })
  });
  console.log('Patch status:', patchRes.status);
  try {
    const patchData = await patchRes.json();
    console.log(patchData);
  } catch(e) {
    console.log("JSON error", e.message);
  }
}
run();
