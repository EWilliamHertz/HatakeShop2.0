async function run() {
  const res = await fetch('http://localhost:3000/api/users/me', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer mock-admin-token' },
    body: JSON.stringify({ 
      companyName: 'Test Company', orgNumber: '1234', website: '', aboutUs: '', 
      socialLinks: [], portfolio: [], profilePictureUrl: '', bannerUrl: '', 
      country: '', vatNumber: '', role: 'buyer', autoTranslate: false, 
      preferredLanguage: 'English', teamRole: 'owner', shippingAddress: '', 
      shippingCity: '', shippingZip: '', stripeAccountId: '', kybDocuments: [],
      verificationStatus: 'verified' 
    })
  });
  console.log('Patch status:', res.status);
  const data = await res.json();
  console.log(data);
}
run();
