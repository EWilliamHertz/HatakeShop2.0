const fs = require('fs');
let content = fs.readFileSync('src/routes/admin.ts', 'utf-8');

const oldUpdate = `// First fetch the target user to see if they are in a team
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

const newUpdate = `
      // Update the user
      await db.update(users).set(updateData).where(eq(users.id, userId));

      // Re-fetch the user to see their current team
      const targetUser = await db.select().from(users).where(eq(users.id, userId)).limit(1);

      // Sync company profile fields if applicable
      if (targetUser.length > 0) {
        // If the admin is actively changing the teamOwnerId, we shouldn't overwrite the entire team's data with this user's data!
        // Instead, the new team member should inherit the parent's data. 
        if (teamOwnerId !== undefined && teamOwnerId !== (targetUser[0].teamOwnerId)) {
             // Handle joining team logic (admin changing teamOwnerId explicitly)
             const parent = await db.select().from(users).where(eq(users.id, targetUser[0].teamOwnerId || targetUser[0].id)).limit(1);
             if (parent.length > 0) {
                await db.update(users).set({
                    companyName: parent[0].companyName,
                    orgNumber: parent[0].orgNumber,
                    website: parent[0].website,
                    aboutUs: parent[0].aboutUs,
                    country: parent[0].country,
                    region: parent[0].region,
                    companyFocus: parent[0].companyFocus,
                    vatNumber: parent[0].vatNumber,
                    profilePictureUrl: parent[0].profilePictureUrl,
                    bannerUrl: parent[0].bannerUrl
                }).where(eq(users.id, userId));
             }
        } else {
            // Normal sync: propagate company field edits to the rest of the team
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
              await db.update(users).set(companyFields).where(eq(users.id, parentId));
              await db.update(users).set(companyFields).where(eq(users.teamOwnerId, parentId));
            }
        }
      }`;

if (content.includes(oldUpdate)) {
  content = content.replace(oldUpdate, newUpdate);
  fs.writeFileSync('src/routes/admin.ts', content);
  console.log("Patched Admin API to sync company fields safely");
} else {
  console.log("Could not find Admin API update block");
}
