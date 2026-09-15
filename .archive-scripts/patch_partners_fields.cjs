const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf-8');

const oldSellers = "const sellers = await db.select({ id: users.id, companyName: users.companyName, country: users.country, verificationStatus: users.verificationStatus }).from(users).where(and(";
const newSellers = "const sellers = await db.select({ id: users.id, companyName: users.companyName, country: users.country, verificationStatus: users.verificationStatus, profilePictureUrl: users.profilePictureUrl, region: users.region, companyFocus: users.companyFocus }).from(users).where(and(";

content = content.replace(oldSellers, newSellers);
fs.writeFileSync('server.ts', content);
