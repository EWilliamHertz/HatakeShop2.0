const fs = require('fs');
let code = fs.readFileSync('src/routes/feed.ts', 'utf8');

// Replace req.user.id with getting DB user
code = code.replace(/const userId = req\.user\.id;/g, `
    const dbUserRes = await db.select({ id: users.id }).from(users).where(eq(users.uid, req.user.uid));
    if(dbUserRes.length === 0) return res.status(401).json({error: "User not found"});
    const userId = dbUserRes[0].id;
`);

code = code.replace(/const authorId = req\.user\.id;/g, `
    const dbUserRes = await db.select({ id: users.id }).from(users).where(eq(users.uid, req.user.uid));
    if(dbUserRes.length === 0) return res.status(401).json({error: "User not found"});
    const authorId = dbUserRes[0].id;
`);

fs.writeFileSync('src/routes/feed.ts', code);
console.log('Fixed req.user.id in feed.ts');
