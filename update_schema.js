const fs = require('fs');
let schema = fs.readFileSync('src/db/schema.ts', 'utf8');

if (!schema.includes('export const feedPosts')) {
  schema += `

export const feedPosts = pgTable('feed_posts', {
  id: serial('id').primaryKey(),
  authorId: integer('author_id').notNull(),
  type: text('type', { enum: ['info', 'listing', 'wtb'] }).notNull(),
  content: text('content').notNull(),
  tags: jsonb('tags').default(sql\`'[]'::jsonb\`),
  budget: text('budget'),
  productId: integer('product_id'),
  likesCount: integer('likes_count').default(0),
  commentsCount: integer('comments_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

export const feedPostsRelations = relations(feedPosts, ({ one }) => ({
  author: one(users, {
    fields: [feedPosts.authorId],
    references: [users.id],
  }),
  product: one(products, {
    fields: [feedPosts.productId],
    references: [products.id],
  }),
}));
`;
  fs.writeFileSync('src/db/schema.ts', schema);
  console.log('Schema updated');
} else {
  console.log('Schema already has feedPosts');
}
