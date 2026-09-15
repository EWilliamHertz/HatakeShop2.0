const fs = require('fs');
let content = fs.readFileSync('src/routes/admin.ts', 'utf-8');

const oldCode = `const { role, verificationStatus, companyName, teamOwnerId, email, displayName } = req.body;
      await db.update(users).set({ role, verificationStatus, companyName, teamOwnerId, email, displayName }).where(eq(users.id, userId));`;

const newCode = `const { 
        role, verificationStatus, companyName, teamOwnerId, email, displayName,
        orgNumber, website, aboutUs, country, region, companyFocus, vatNumber,
        profilePictureUrl, bannerUrl
      } = req.body;
      
      const updateData: any = {};
      if (role !== undefined) updateData.role = role;
      if (verificationStatus !== undefined) updateData.verificationStatus = verificationStatus;
      if (companyName !== undefined) updateData.companyName = companyName;
      if (teamOwnerId !== undefined) updateData.teamOwnerId = teamOwnerId;
      if (email !== undefined) updateData.email = email;
      if (displayName !== undefined) updateData.displayName = displayName;
      if (orgNumber !== undefined) updateData.orgNumber = orgNumber;
      if (website !== undefined) updateData.website = website;
      if (aboutUs !== undefined) updateData.aboutUs = aboutUs;
      if (country !== undefined) updateData.country = country;
      if (region !== undefined) updateData.region = region;
      if (companyFocus !== undefined) updateData.companyFocus = companyFocus;
      if (vatNumber !== undefined) updateData.vatNumber = vatNumber;
      if (profilePictureUrl !== undefined) updateData.profilePictureUrl = profilePictureUrl;
      if (bannerUrl !== undefined) updateData.bannerUrl = bannerUrl;

      await db.update(users).set(updateData).where(eq(users.id, userId));`;

content = content.replace(oldCode, newCode);
fs.writeFileSync('src/routes/admin.ts', content);
