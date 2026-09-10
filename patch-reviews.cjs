const fs = require('fs');

let modalTs = fs.readFileSync('src/components/ProductModal.tsx', 'utf-8');

// Inject state and queries for reviews
const importString = "import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';\nimport { useAuth } from './AuthContext.tsx';";
modalTs = modalTs.replace("import React, { useState } from 'react';", "import React, { useState } from 'react';\n" + importString);

const stateInjection = `
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");

  const { data: reviewsData, isLoading: reviewsLoading } = useQuery({
    queryKey: ['productReviews', product.id],
    queryFn: () => fetch(\`/api-v2/products/\${product.id}/reviews\`).then(res => res.json())
  });

  const submitReview = useMutation({
    mutationFn: async () => {
      const res = await fetch(\`/api-v2/products/\${product.id}/reviews\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${await user?.getIdToken()}\` },
        body: JSON.stringify({ rating: reviewRating, comment: reviewComment })
      });
      if (!res.ok) throw new Error("Failed to submit review");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productReviews', product.id] });
      setReviewComment("");
    }
  });
`;
modalTs = modalTs.replace('const { formatPrice } = useCurrency();', 'const { formatPrice } = useCurrency();\n' + stateInjection);

// Replace existing mock reviews (if any) or add it below specifications
const reviewsUI = `
              {/* Real Reviews System */}
              <div className="mt-8 border-t border-slate-800 pt-6">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">{t('Product Reviews')}</h3>
                
                {user && (
                  <div className="mb-6 bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                    <h4 className="text-sm font-semibold text-slate-200 mb-2">{t('Leave a Review')}</h4>
                    <div className="flex gap-2 mb-2">
                      {[1,2,3,4,5].map(star => (
                        <Star key={star} className={\`w-5 h-5 cursor-pointer \${reviewRating >= star ? 'text-[#ffcc00] fill-[#ffcc00]' : 'text-slate-600'}\`} onClick={() => setReviewRating(star)} />
                      ))}
                    </div>
                    <textarea 
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white mb-2 focus:border-[#ffcc00] focus:ring-1 focus:ring-[#ffcc00] outline-none" 
                      rows={3} 
                      placeholder={t('Share your experience with this product...')}
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                    ></textarea>
                    <button 
                      onClick={() => submitReview.mutate()} 
                      disabled={submitReview.isPending || !reviewComment.trim()}
                      className="px-4 py-2 bg-[#ffcc00] text-black font-semibold rounded-lg text-sm hover:bg-[#ffcc00]/90 disabled:opacity-50"
                    >
                      {submitReview.isPending ? t('Submitting...') : t('Submit Review')}
                    </button>
                  </div>
                )}

                <div className="space-y-4">
                  {reviewsLoading ? (
                    <div className="text-slate-400 text-sm">{t('Loading reviews...')}</div>
                  ) : reviewsData && reviewsData.length > 0 ? (
                    reviewsData.map((review: any) => (
                      <div key={review.id} className="border-b border-slate-800 pb-4 last:border-0">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="flex">
                            {[1,2,3,4,5].map(star => (
                              <Star key={star} className={\`w-3 h-3 \${review.rating >= star ? 'text-[#ffcc00] fill-[#ffcc00]' : 'text-slate-600'}\`} />
                            ))}
                          </div>
                          <span className="text-sm font-semibold text-slate-200">{review.reviewerName || 'Verified Buyer'}</span>
                          <span className="text-xs text-slate-500 ml-auto">{new Date(review.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-sm text-slate-400">{review.comment}</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-500 text-sm italic">{t('No reviews yet. Be the first to review this product!')}</div>
                  )}
                </div>
              </div>
`;

// Insert just before `</div> {/* Right Column: Sticky actions */}`
modalTs = modalTs.replace('{/* Right Column: Sticky actions */}', reviewsUI + '\n              {/* Right Column: Sticky actions */}');

fs.writeFileSync('src/components/ProductModal.tsx', modalTs);
