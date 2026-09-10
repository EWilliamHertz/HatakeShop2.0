import Papa from 'papaparse';
import * as fs from 'fs';

const csv = `"Business Name",Address,City,State,Phone,Website,Rating,Reviews,Status,"Pipeline Stage",Notes,"Email 1","Email 2","Email 3","Email 4","Email 5",Facebook,Instagram,Twitter,LinkedIn,YouTube,TikTok,"Other Socials"
"Aqua Treasures TCG Collectibles","Aqua Treasures TCG Collectibles, 2099 E 17th St, Idaho Falls, ID 83404",Ahsahka,Idaho,+12082010358,http://aquatreasurestcg.com/,5.00,2,cold,new,,jps@aquatreasurestcg.com,,,,,,,,,,,`;
const res = Papa.parse(csv, { header: true, transformHeader: (h) => h.trim() });
const lead = res.data[0];

const keys = Object.keys(lead);
const findKey = (searchStrs: string[]) => keys.find(k => searchStrs.some(s => k.toLowerCase().includes(s)));
const emailKey = findKey(['email']);
let email = emailKey ? (lead as any)[emailKey] : null;
console.log({ emailKey, email });
