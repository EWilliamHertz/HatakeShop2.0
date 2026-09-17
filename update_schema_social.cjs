const fs = require('fs');
let code = fs.readFileSync('src/db/schema.ts', 'utf8');

const socialTables = `
export const feedLikes = pgTable('feed_likes', {
  id: serial('id').primaryKey(),
  postId: integer('post_id').notNull().references(() => feedPosts.id),
  userId: integer('user_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
});

export const feedComments = pgTable('feed_comments', {
  id: serial('id').primaryKey(),
  postId: integer('post_id').notNull().references(() => feedPosts.id),
  authorId: integer('author_id').notNull().references(() => users.id),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});
`;

if (!code.includes('feedLikes')) {
  code += socialTables;
  fs.writeFileSync('src/db/schema.ts', code);
  console.log('schema.ts updated');
} else {
  console.log('Already updated');
}
