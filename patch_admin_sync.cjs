const fs = require('fs');
let content = fs.readFileSync('src/routes/admin.ts', 'utf-8');

const oldUpdate = `await db.update(users).set(updateData).where(eq(users.id, userId));`;

const newUpdate = `
      // First fetch the target user to see if they are in a team
      const targetUser = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      
      await db.update(users).set(updateData).where(eq(users.id, userId));

      // Sync company profile fields if applicable
      if (targetUser.length > 0) {
        const parentId = targetUser[0].teamOwnerId || targetUser[0].id;
        
        const companyFields: any = {};
        if (companyName !== undefined) companyFields.companyName = companyName;
        if (orgNumber !== undefined) companyFields.orgNumber = orgNumber;
        if (website !== undefined) companyFields.website = website;
        if (aboutUs !== undefined) companyFields.aboutUs = aboutUs;
        if (country !== undefined) companyFields.country = country;
        if (region !== undefined) companyFields.region = region;
        if (companyFocus !== undefined) companyFields.companyFocus = companyFocus;
        if (vatNumber !== undefined) companyFields.vatNumber = vatNumber;
        if (profilePictureUrl !== undefined) companyFields.profilePictureUrl = profilePictureUrl;
        if (bannerUrl !== undefined) companyFields.bannerUrl = bannerUrl;
        
        if (Object.keys(companyFields).length > 0) {
          // Update parent
          await db.update(users).set(companyFields).where(eq(users.id, parentId));
          // Update all team members
          await db.update(users).set(companyFields).where(eq(users.teamOwnerId, parentId));
        }
      }`;

if (content.includes(oldUpdate)) {
  content = content.replace(oldUpdate, newUpdate);
  fs.writeFileSync('src/routes/admin.ts', content);
  console.log("Patched Admin API to sync company fields");
} else {
  console.log("Could not find Admin API update block");
}
