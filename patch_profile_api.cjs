const fs = require('fs');
let profile = fs.readFileSync('src/routes/profile.ts', 'utf-8');

const userEndpoint = `
router.get(["/users/:id", "/api/users/:id", "/api-v2/users/:id"], async (req, res) => {
  if (req.params.id === 'team') return; // Skip /users/team route
  try {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) return res.status(400).json({ error: "Invalid user ID" });
    
    const { db } = require('../db/index.js');
    const { users } = require('../db/schema.js');
    const { eq } = require('drizzle-orm');

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
`;

// Insert after the first `const router = Router();`
profile = profile.replace('const router = Router();', 'const router = Router();\n' + userEndpoint);
fs.writeFileSync('src/routes/profile.ts', profile);
console.log("Patched profile.ts with /users/:id route");
