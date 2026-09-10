const Papa = require('papaparse');
const csv = `Business Name, City, State, Email 1, Website
Acme, NY, NY, test@test.com, acme.com`;
const res = Papa.parse(csv, { header: true });
console.log(res.data);
