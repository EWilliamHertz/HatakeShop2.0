import { Router } from "express";
import { db } from "../db/index.js";
import { users, products, reviews, leads } from "../db/schema.js";
import { eq, or, and, isNull } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { getUserProfile, updateUserProfile } from "../db/users.js";

const router = Router();

router.get(["/users/:id", "/api/users/:id", "/api-v2/users/:id"], async (req, res) => {
  if (req.params.id === 'team') return; // Skip /users/team route
  try {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) return res.status(400).json({ error: "Invalid user ID" });
    
    const userQuery = await db.select({
      id: users.id,
      displayName: users.displayName,
      profilePictureUrl: users.profilePictureUrl,
      teamRole: users.teamRole,
      role: users.role,
      country: users.country,
      teamOwnerId: users.teamOwnerId,
      companyName: users.companyName,
      createdAt: users.createdAt,
    }).from(users).where(eq(users.id, userId)).limit(1);

    if (userQuery.length === 0) return res.status(404).json({ error: "User not found" });
    res.json(userQuery[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


router.get(["/profile", "/api/profile", "/api-v2/profile"], requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).send("Unauthorized");
    let user = await getUserProfile(req.user.uid);
    if (!user) {
        const { getOrCreateUser } = await import('../db/users.js');
        user = await getOrCreateUser(req.user.uid, req.user.email || "", req.user.name);
    }
    res.json(user);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get(["/company/:id", "/api/company/:id", "/api-v2/company/:id"], async (req, res) => {
  try {
    const companyId = parseInt(req.params.id, 10);
    const company = await db.select({
      id: users.id,
      companyName: users.companyName,
      country: users.country,
      website: users.website,
      aboutUs: users.aboutUs,
      socialLinks: users.socialLinks,
      portfolio: users.portfolio,
      profilePictureUrl: users.profilePictureUrl,
      bannerUrl: users.bannerUrl,
      createdAt: users.createdAt,
      teamOwnerId: users.teamOwnerId,
      role: users.role,
      verificationStatus: users.verificationStatus,
    }).from(users).where(eq(users.id, companyId)).limit(1);

    if (!company.length) return res.status(404).json({ error: "Company not found" });

    const teamMembers = await db.select({
      id: users.id,
      displayName: users.displayName,
      role: users.role,
      teamRole: users.teamRole
    }).from(users).where(
      or(
        eq(users.teamOwnerId, companyId),
        eq(users.teamOwnerId, company[0].teamOwnerId || -1),
        eq(users.id, companyId),
        eq(users.id, company[0].teamOwnerId || -1)
      )
    );

    const companyProducts = await db.select().from(products).where(eq(products.sellerId, companyId));
    const companyReviews = await db.query.reviews.findMany({
      where: eq(reviews.targetUserId, companyId)
    });

    res.json({
      company: company[0],
      teamMembers,
      products: companyProducts,
      reviews: companyReviews
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch(["/profile", "/api/profile", "/api-v2/profile"], requireAuth, async (req: AuthRequest, res) => {
  try {
    if (!req.user) return res.status(401).send("Unauthorized");
    
    // Check if this is a company settings update
    const isCompanyUpdate = req.body.hasOwnProperty('orgNumber') || req.body.hasOwnProperty('companyFocus') || req.body.hasOwnProperty('vatNumber') || req.body.hasOwnProperty('isCompanyUpdate');
    
    let user;
    
    if (isCompanyUpdate) {
       let currentUser = await getUserProfile(req.user.uid);
       if (!currentUser) {
           const { getOrCreateUser } = await import('../db/users.js');
           currentUser = await getOrCreateUser(req.user.uid, req.user.email || "", req.user.name);
       }
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
         restrictedShippingCountries: req.body.restrictedShippingCountries,
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
           restrictedShippingCountries: req.body.restrictedShippingCountries,
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
    }
    
    res.json(user);
  } catch (err: any) {
    console.error("SERVER ERROR:", err);
    const rootCause = err.cause?.cause?.message || err.cause?.message || err.toString();
    res.status(500).json({ error: err.message, cause: rootCause });
  }
});

router.post(["/users/apply-seller", "/api/users/apply-seller", "/api-v2/users/apply-seller"], requireAuth, async (req: AuthRequest, res) => {
  try {
    let userProfile = await getUserProfile(req.user!.uid);
    if (!userProfile) {
        const { getOrCreateUser } = await import('../db/users.js');
        userProfile = await getOrCreateUser(req.user!.uid, req.user!.email || "", req.user!.name);
    }

    const parentId = userProfile.teamOwnerId || userProfile.id;
    const newRole = userProfile.role === 'admin' ? 'admin' : 'both';
    await db.update(users).set({ role: newRole, verificationStatus: 'pending' }).where(eq(users.id, parentId));

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch(["/users/team/:id/role", "/api/users/team/:id/role", "/api-v2/users/team/:id/role"], requireAuth, async (req: AuthRequest, res) => {
  try {
    const userProfile = await getUserProfile(req.user!.uid);
    if (userProfile.id !== userProfile.teamOwnerId && userProfile.teamOwnerId !== null) {
       return res.status(403).json({ error: "Only team owner can change roles" });
    }
    
    const targetUserId = parseInt(req.params.id, 10);
    const { teamRole } = req.body;
    
    await db.update(users).set({ teamRole }).where(eq(users.id, targetUserId));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get(["/users/team", "/api/users/team", "/api-v2/users/team"], requireAuth, async (req: AuthRequest, res) => {
  try {
    const userProfile = await getUserProfile(req.user!.uid);
    if (!userProfile) return res.status(404).send("User not found");

    const teamOwnerId = userProfile.teamOwnerId || userProfile.id;
    
    let ownerProfile = userProfile;
    if (userProfile.teamOwnerId) {
       const ownerRes = await db.select().from(users).where(eq(users.id, userProfile.teamOwnerId));
       if (ownerRes.length > 0) ownerProfile = ownerRes[0];
    }

    let inviteCode = ownerProfile.inviteCode;
    if (!inviteCode) {
       inviteCode = "SEC-" + Math.random().toString(36).substring(2, 10).toUpperCase();
       await db.update(users).set({ inviteCode }).where(eq(users.id, ownerProfile.id));
    }

    const teamMembers = await db.select().from(users).where(
       or(eq(users.id, teamOwnerId), eq(users.teamOwnerId, teamOwnerId))
    );

    res.json({
       inviteCode,
       teamOwnerId,
       members: teamMembers
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post(["/users/team/join", "/api/users/team/join", "/api-v2/users/team/join"], requireAuth, async (req: AuthRequest, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: "Invite code required" });

    const userProfile = await getUserProfile(req.user!.uid);
    if (!userProfile) return res.status(404).json({ error: "User not found" });

    const ownerQuery = await db.select().from(users).where(eq(users.inviteCode, code));
    if (ownerQuery.length === 0) {
       return res.status(404).json({ error: "Invalid invite code" });
    }

    const owner = ownerQuery[0];
    if (owner.id === userProfile.id) {
       return res.status(400).json({ error: "You cannot join your own team" });
    }

    const updatedUser = await db.update(users).set({
       teamOwnerId: owner.id,
       companyName: owner.companyName,
       role: owner.role,
       country: owner.country,
       verificationStatus: owner.verificationStatus,
       teamRole: 'sales_rep'
    }).where(eq(users.id, userProfile.id)).returning();

    res.json({ success: true, user: updatedUser[0] });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
