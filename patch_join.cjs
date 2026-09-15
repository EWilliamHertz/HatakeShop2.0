const fs = require('fs');

// 1. patch profile.ts for /users/team/join
let profile = fs.readFileSync('src/routes/profile.ts', 'utf-8');
profile = profile.replace(
  'role: owner.role,\n       country: owner.country\n    }).where(eq(users.id, userProfile.id)).returning();',
  'role: owner.role,\n       country: owner.country,\n       verificationStatus: owner.verificationStatus,\n       teamRole: \'sales_rep\'\n    }).where(eq(users.id, userProfile.id)).returning();'
);
fs.writeFileSync('src/routes/profile.ts', profile);

// 2. patch auth.ts for /auth/sync
let auth = fs.readFileSync('src/routes/auth.ts', 'utf-8');
const syncTarget = `      let finalCompanyName = "";
      if (inviteToken) {
         const tokenHash = crypto.createHash('sha256').update(inviteToken).digest('hex');`;
const syncReplacement = `      let finalCompanyName = "";
      if (inviteToken) {
         if (inviteToken.startsWith("SEC-")) {
            const ownerQuery = await db.select().from(users).where(eq(users.inviteCode, inviteToken)).limit(1);
            if (ownerQuery.length > 0) {
               const owner = ownerQuery[0];
               const user = await getOrCreateUser(req.user.uid, req.user.email || "", req.user.name);
               if (user.id !== owner.id) {
                  await db.update(users).set({
                     teamOwnerId: owner.id,
                     companyName: owner.companyName,
                     role: owner.role,
                     country: owner.country,
                     verificationStatus: owner.verificationStatus,
                     teamRole: 'sales_rep'
                  }).where(eq(users.id, user.id));
                  user.companyName = owner.companyName;
                  user.teamOwnerId = owner.id;
                  user.role = owner.role;
                  user.verificationStatus = owner.verificationStatus;
                  user.teamRole = 'sales_rep';
                  return res.json({ user });
               }
            }
         }
         
         const tokenHash = crypto.createHash('sha256').update(inviteToken).digest('hex');`;
auth = auth.replace(syncTarget, syncReplacement);
fs.writeFileSync('src/routes/auth.ts', auth);

console.log("Patched profile.ts and auth.ts!");
