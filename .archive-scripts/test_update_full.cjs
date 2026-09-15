async function run() {
  const loginUser = await fetch('http://localhost:3000/api/auth/custom-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'Phoebe@topbestpkg.com', password: '123' })
  });
  const userTokenData = await loginUser.json();
  const userToken = userTokenData.token;

  const patchRes = await fetch('http://localhost:3000/api/users/me', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userToken}` },
    body: JSON.stringify({
    companyName: 'Topbestpkg',
    orgNumber: '1234',
    website: '',
    aboutUs: '',
    socialLinks: [],
    portfolio: [],
    profilePictureUrl: '',
    bannerUrl: '',
    country: '',
    vatNumber: '',
    role: 'seller',
    autoTranslate: false,
    preferredLanguage: 'English',
    teamRole: 'owner',
    shippingAddress: '',
    shippingCity: '',
    shippingZip: '',
    stripeAccountId: '',
    kybDocuments: [],
    verificationStatus: 'verified'
    })
  });
  console.log('Patch result:', patchRes.status);
  const patchData = await patchRes.json();
  console.log(patchData);
}
run();
