const fs = require('fs');
let content = fs.readFileSync('src/routes/profile.ts', 'utf-8');

const target = `    // Check if this is a company settings update
    const isCompanyUpdate = req.body.hasOwnProperty('orgNumber') || req.body.hasOwnProperty('companyFocus') || req.body.hasOwnProperty('vatNumber');
    
    let user = await updateUserProfile(req.user.uid, req.body);
    
    if (isCompanyUpdate) {
       // If it's a company update, sync these specific company fields to the parent and all team members
       const parentId = user.teamOwnerId || user.id;
       const companyFields = {
         companyName: req.body.companyName,
         orgNumber: req.body.orgNumber,
         website: req.body.website,
         aboutUs: req.body.aboutUs,
         socialLinks: req.body.socialLinks,
         portfolio: req.body.portfolio,
         profilePictureUrl: req.body.profilePictureUrl,
         bannerUrl: req.body.bannerUrl,
         country: req.body.country,
         region: req.body.region,
         companyFocus: req.body.companyFocus,
         vatNumber: req.body.vatNumber,
         shippingAddress: req.body.shippingAddress,
         shippingCity: req.body.shippingCity,
         shippingZip: req.body.shippingZip,
         kybDocuments: req.body.kybDocuments,
         verificationStatus: req.body.verificationStatus
       };
       // Remove undefined fields
       Object.keys(companyFields).forEach(key => companyFields[key] === undefined && delete companyFields[key]);
       
       if (Object.keys(companyFields).length > 0) {
          // Update parent
          await db.update(users).set(companyFields).where(eq(users.id, parentId));
          // Update all team members
          await db.update(users).set(companyFields).where(eq(users.teamOwnerId, parentId));
       }
    }`;

const replacement = `    // Check if this is a company settings update
    const isCompanyUpdate = req.body.hasOwnProperty('orgNumber') || req.body.hasOwnProperty('companyFocus') || req.body.hasOwnProperty('vatNumber') || req.body.hasOwnProperty('isCompanyUpdate');
    
    let user;
    
    if (isCompanyUpdate) {
       const { db } = require('../db/index.js');
       const { users } = require('../db/schema.js');
       const { eq, and } = require('drizzle-orm');
       const { getUserProfile } = require('../db/users.js');
       
       const currentUser = await getUserProfile(req.user.uid);
       const parentId = currentUser.teamOwnerId || currentUser.id;
       
       // Update parent row with company info
       const companyFields = {
         companyName: req.body.companyName,
         orgNumber: req.body.orgNumber,
         website: req.body.website,
         aboutUs: req.body.aboutUs,
         socialLinks: req.body.socialLinks,
         portfolio: req.body.portfolio,
         profilePictureUrl: req.body.profilePictureUrl, // Company logo
         bannerUrl: req.body.bannerUrl,
         country: req.body.country,
         region: req.body.region,
         companyFocus: req.body.companyFocus,
         vatNumber: req.body.vatNumber,
         shippingAddress: req.body.shippingAddress,
         shippingCity: req.body.shippingCity,
         shippingZip: req.body.shippingZip,
         kybDocuments: req.body.kybDocuments,
         verificationStatus: req.body.verificationStatus
       };
       Object.keys(companyFields).forEach(key => companyFields[key] === undefined && delete companyFields[key]);
       
       if (Object.keys(companyFields).length > 0) {
          await db.update(users).set(companyFields).where(eq(users.id, parentId));
       }
       
       // Sync ONLY shared identity fields to all team members
       const sharedFields = {
           companyName: req.body.companyName,
           country: req.body.country,
           verificationStatus: req.body.verificationStatus
       };
       Object.keys(sharedFields).forEach(key => sharedFields[key] === undefined && delete sharedFields[key]);
       if (Object.keys(sharedFields).length > 0) {
           await db.update(users).set(sharedFields).where(eq(users.teamOwnerId, parentId));
       }
       
       user = await getUserProfile(req.user.uid);
    } else {
       // Personal update
       user = await updateUserProfile(req.user.uid, req.body);
    }`;

content = content.replace(target, replacement);
fs.writeFileSync('src/routes/profile.ts', content);
console.log("Patched profile.ts sync logic");
