const fs = require('fs');
let code = fs.readFileSync('src/pages/Feed.tsx', 'utf8');

// Patch author rendering
code = code.replace(/\{post\.author\.name\}/g, '{post?.author?.name || "Unknown"}');
code = code.replace(/\{post\.author\.verified/g, '{post?.author?.verified');

// Patch date rendering
code = code.replace(/new Date\(post\.createdAt\)/g, '(post.createdAt ? new Date(post.createdAt) : new Date())');

// Patch content string methods
code = code.replace(/post\.content\.split/g, '(post.content || "").split');
code = code.replace(/post\.content\.includes/g, '(post.content || "").includes');
code = code.replace(/post\.content\.match/g, '(post.content || "").match');

fs.writeFileSync('src/pages/Feed.tsx', code);
console.log('Feed.tsx patched with safe null-checks');
