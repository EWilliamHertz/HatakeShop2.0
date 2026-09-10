export function generateB2BEmailHtml(
  companyNameStr: string,
  registrationUrl: string,
  unsubscribeUrl: string,
  segment: string = 'TCG'
) {
  const firstName = companyNameStr.split(' ')[0] || "Partner";
  
  const displayCategory = segment === 'Sports' ? 'sports cards and memorabilia' : (segment === 'General' ? 'trading cards and collectibles' : 'trading card games');
  const acronym = segment === 'Sports' ? 'Sports Cards' : (segment === 'General' ? 'Collectibles' : 'TCG');
  const profType = segment === 'Sports' ? 'sports card' : 'trading card game';

  // Determine base URL for absolute image paths (defaulting to production if not set)
  const appUrl = typeof process !== 'undefined' && process.env.APP_URL 
    ? process.env.APP_URL 
    : 'https://hatake.shop';

  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="${appUrl}/logo.png" alt="Hatake Logo" style="max-height: 60px; margin-bottom: 10px;" />
      </div>
      <h2 style="color: #4f46e5;">Buy and sell ${acronym} in wholesale — worldwide</h2>
      <p>You're invited to join Hatake.Shop B2B, the global marketplace built for ${profType} professionals.</p>
      <p>Hi ${firstName},</p>
      <p>We'd like to welcome <strong>${companyNameStr}</strong> to Hatake.Shop B2B — the wholesale platform where retailers, distributors, and stores source and move ${acronym} inventory at scale, across borders, with confidence.</p>
      
      <h3>What you can do on Hatake.Shop B2B</h3>
      <ul>
        <li><strong>Buy wholesale:</strong> Access sealed product, singles, and accessories from verified sellers around the world.</li>
        <li><strong>Sell wholesale:</strong> List your inventory once and reach thousands of qualified B2B buyers globally.</li>
        <li><strong>Trade with confidence:</strong> Vetted partners, transparent pricing, and secure payments in multiple currencies.</li>
        <li><strong>Ship globally:</strong> Integrated logistics tools to move product across regions without the usual friction.</li>
      </ul>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${registrationUrl}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Activate your B2B account</a>
      </div>
      
      <p style="font-size: 14px;">Onboarding takes minutes. A dedicated partner manager will help you get set up.</p>
      
      <hr style="border: none; border-top: 1px solid #eaeaea; margin: 30px 0;" />
      
      <h3>Why partners choose Hatake.Shop</h3>
      <ul style="padding-left: 20px;">
        <li><strong>Global reach:</strong> Buyers and sellers across Europe, North America, and Asia — all in one marketplace.</li>
        <li><strong>Better margins:</strong> Cut out the middlemen and trade directly with verified wholesale partners.</li>
        <li><strong>Real-time inventory:</strong> Live stock levels and pricing so you always know what's available.</li>
        <li><strong>Secure transactions:</strong> Escrow-backed payments and buyer/seller protection on every order.</li>
      </ul>
      
      <p>Questions before you sign up? Just reply to this email and our team will get back to you within one business day.</p>
      <p>Looking forward to trading with you,<br/>The Hatake.Shop B2B Team</p>
      
      <div style="margin-top: 40px; font-size: 12px; color: #888; text-align: center;">
        <p>If you no longer wish to receive these emails, you can <a href="${unsubscribeUrl}" style="color: #888; text-decoration: underline;">unsubscribe here</a>.</p>
        <p>Hatake.Shop B2B • <a href="https://hatake.shop" style="color: #888;">hatake.shop</a><br/>© 2026 Hatake.Shop. All rights reserved.</p>
      </div>
    </div>
  `;
}
