const fs = require('fs');
let content = fs.readFileSync('src/routes/auth.ts', 'utf-8');

const oldSync = `      if (finalCompanyName && !user.companyName) {
         await db.update(users).set({ companyName: finalCompanyName }).where(eq(users.id, user.id));
         user.companyName = finalCompanyName;
      }`;

const newSync = `      if (finalCompanyName && !user.companyName) {
         const existingCompany = await db.select().from(users).where(and(eq(users.companyName, finalCompanyName), isNull(users.teamOwnerId))).limit(1);
         if (existingCompany.length > 0) {
            await db.update(users).set({ companyName: finalCompanyName, teamOwnerId: existingCompany[0].id }).where(eq(users.id, user.id));
            user.companyName = finalCompanyName;
            user.teamOwnerId = existingCompany[0].id;
         } else {
            await db.update(users).set({ companyName: finalCompanyName }).where(eq(users.id, user.id));
            user.companyName = finalCompanyName;
         }
      }`;

if(content.includes(oldSync)) {
   content = content.replace(oldSync, newSync);
   fs.writeFileSync('src/routes/auth.ts', content);
   console.log("Patched successfully");
} else {
   console.log("Could not find old sync block");
}
