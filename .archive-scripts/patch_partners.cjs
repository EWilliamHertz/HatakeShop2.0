const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf-8');

const oldQuery = `const sellers = await db.select({ id: users.id, companyName: users.companyName, country: users.country, verificationStatus: users.verificationStatus }).from(users).where(or(eq(users.role, 'seller'), eq(users.role, 'both'), eq(users.role, 'admin')));`;
const newQuery = `const sellers = await db.select({ id: users.id, companyName: users.companyName, country: users.country, verificationStatus: users.verificationStatus }).from(users).where(and(
      or(eq(users.role, 'seller'), eq(users.role, 'both'), eq(users.role, 'admin')),
      isNull(users.teamOwnerId)
    ));`;

if(content.includes(oldQuery)) {
   content = content.replace(oldQuery, newQuery);
   fs.writeFileSync('server.ts', content);
   console.log("Patched successfully");
} else {
   console.log("Could not find old query");
}
