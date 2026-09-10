async function run() {
  try {
    const res = await fetch('http://localhost:3000/api/admin/test-email', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer mock-admin-token'
      }
    });
    console.log(res.status);
    console.log(await res.text());
  } catch (e) {
    console.error(e);
  }
}
run();
