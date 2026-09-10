const fs = require('fs');

const csvData = `"Business Name",Address,City,State,Phone,Website,Rating,Reviews,Status,"Pipeline Stage",Notes,"Email 1","Email 2","Email 3","Email 4","Email 5",Facebook,Instagram,Twitter,LinkedIn,YouTube,TikTok,"Other Socials"
"Aqua Treasures TCG Collectibles","Aqua Treasures TCG Collectibles, 2099 E 17th St, Idaho Falls, ID 83404",Ahsahka,Idaho,+12082010358,http://aquatreasurestcg.com/,5.00,2,cold,new,,jps@aquatreasurestcg.com,,,,,,,,,,,
"The Door TCG Superstores","The Door TCG Superstores, 1760 W Cherry Ln #130, Meridian, ID 83642",Ahsahka,Idaho,+12088992776,,4.90,336,cold,new,,,,,,,,,,,,,
`;

const Papa = require('papaparse');
const parsed = Papa.parse(csvData, { header: true });

async function upload() {
  const token = 'mock-admin-token';
  const res = await fetch('http://localhost:3000/api/admin/leads/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ leads: parsed.data })
  });
  console.log(await res.text());
}
upload();
