const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf-8');

const oldPatchProfile = `app.patch(["/profile", "/api/profile", "/api-v2/profile"], requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).send("Unauthorized");
    const user = await updateUserProfile(req.user.uid, req.body);
    res.json(user);
  } catch (err: any) {`;

const newPatchProfile = `app.patch(["/profile", "/api/profile", "/api-v2/profile"], requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).send("Unauthorized");
    
    // Check if this is a company settings update
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
    }
    
    res.json(user);
  } catch (err: any) {`;

if (content.includes(oldPatchProfile)) {
  content = content.replace(oldPatchProfile, newPatchProfile);
  fs.writeFileSync('server.ts', content);
  console.log("Patched profile endpoint");
} else {
  console.log("Could not find patch profile endpoint");
}
