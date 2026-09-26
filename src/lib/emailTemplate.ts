export function generateB2BEmailHtml(
  companyNameStr: string,
  registrationUrl: string,
  unsubscribeUrl: string,
  segment: string = 'TCG'
) {
  const firstName = companyNameStr.split(' ')[0] || 'Partner';

  const displayCategory =
    segment === 'Sports'
      ? 'sports cards & memorabilia'
      : segment === 'General'
      ? 'trading cards & collectibles'
      : 'trading card games';

  const acronym =
    segment === 'Sports' ? 'Sports Cards' : segment === 'General' ? 'Collectibles' : 'TCG';

  const appUrl =
    typeof process !== 'undefined' && process.env.APP_URL
      ? process.env.APP_URL
      : 'https://hatake.shop';

  const logoUrl = 'https://i.imgur.com/B06rBhI.png';

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background-color:#0d1117;font-family:Arial,Helvetica,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0d1117;padding:48px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#0f172a;border-radius:20px;border:1px solid #1e293b;overflow:hidden;">

  <!-- Top accent bar -->
  <tr><td style="background:linear-gradient(90deg,#0ea5e9 0%,#6366f1 50%,#8b5cf6 100%);height:4px;font-size:0;">&nbsp;</td></tr>

  <!-- Logo & brand header -->
  <tr><td align="center" style="padding:44px 40px 28px 40px;">
    <img src="${logoUrl}" alt="Hatake" width="100" height="100"
      style="display:block;border-radius:50%;border:3px solid #1e293b;margin-bottom:18px;" />
    <div style="font-size:26px;font-weight:800;color:#f8fafc;letter-spacing:-0.5px;margin-bottom:4px;">Hatake B2B</div>
    <div style="font-size:11px;color:#38bdf8;letter-spacing:4px;text-transform:uppercase;">International ${acronym} Enterprise Network</div>
  </td></tr>

  <!-- Divider -->
  <tr><td style="padding:0 40px;"><div style="height:1px;background:#1e293b;"></div></td></tr>

  <!-- Hero body -->
  <tr><td style="padding:36px 40px 0 40px;">
    <h2 style="margin:0 0 8px 0;font-size:24px;font-weight:700;color:#f8fafc;line-height:1.3;">
      ${companyNameStr}, you're invited.
    </h2>
    <p style="margin:0 0 24px 0;font-size:15px;color:#64748b;line-height:1.6;">
      Hi ${firstName}, we'd like to invite <strong style="color:#94a3b8;">${companyNameStr}</strong> to join 
      <strong style="color:#38bdf8;">Hatake B2B</strong> — the wholesale platform where ${displayCategory} 
      businesses source and move inventory at scale, worldwide.
    </p>

    <!-- Value props -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr>
        <td width="50%" valign="top" style="padding:0 8px 12px 0;">
          <div style="background:#0ea5e910;border:1px solid #0ea5e920;border-radius:12px;padding:16px;">
            <div style="font-size:20px;margin-bottom:6px;">🌍</div>
            <div style="font-size:13px;font-weight:700;color:#e2e8f0;margin-bottom:4px;">Global Buyers</div>
            <div style="font-size:12px;color:#64748b;line-height:1.5;">Reach verified wholesale buyers across Europe, North America & Asia.</div>
          </div>
        </td>
        <td width="50%" valign="top" style="padding:0 0 12px 8px;">
          <div style="background:#6366f110;border:1px solid #6366f120;border-radius:12px;padding:16px;">
            <div style="font-size:20px;margin-bottom:6px;">📦</div>
            <div style="font-size:13px;font-weight:700;color:#e2e8f0;margin-bottom:4px;">Wholesale Listings</div>
            <div style="font-size:12px;color:#64748b;line-height:1.5;">List sealed product, singles & accessories with real-time stock & pricing.</div>
          </div>
        </td>
      </tr>
      <tr>
        <td width="50%" valign="top" style="padding:0 8px 0 0;">
          <div style="background:#8b5cf610;border:1px solid #8b5cf620;border-radius:12px;padding:16px;">
            <div style="font-size:20px;margin-bottom:6px;">🔒</div>
            <div style="font-size:13px;font-weight:700;color:#e2e8f0;margin-bottom:4px;">Secure Transactions</div>
            <div style="font-size:12px;color:#64748b;line-height:1.5;">Vetted partners, transparent pricing, and buyer/seller protection.</div>
          </div>
        </td>
        <td width="50%" valign="top" style="padding:0 0 0 8px;">
          <div style="background:#10b98110;border:1px solid #10b98120;border-radius:12px;padding:16px;">
            <div style="font-size:20px;margin-bottom:6px;">🚀</div>
            <div style="font-size:13px;font-weight:700;color:#e2e8f0;margin-bottom:4px;">Fast Onboarding</div>
            <div style="font-size:12px;color:#64748b;line-height:1.5;">Set up your company profile in minutes. A partner manager will assist you.</div>
          </div>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- CTA button -->
  <tr><td align="center" style="padding:8px 40px 36px 40px;">
    <a href="${registrationUrl}"
      style="display:inline-block;background:linear-gradient(135deg,#0ea5e9,#6366f1);color:#ffffff;text-decoration:none;font-family:Arial,sans-serif;font-weight:700;font-size:16px;padding:18px 48px;border-radius:12px;letter-spacing:0.3px;">
      → &nbsp; Create Your Company Profile
    </a>
    <p style="margin:16px 0 0 0;font-size:12px;color:#334155;">
      This invitation is personal to ${companyNameStr}. It expires in 30 days.
    </p>
  </td></tr>

  <!-- Divider -->
  <tr><td style="padding:0 40px;"><div style="height:1px;background:#1e293b;"></div></td></tr>

  <!-- Footer -->
  <tr><td style="padding:28px 40px 36px 40px;">
    <p style="margin:0 0 12px 0;font-size:13px;color:#475569;line-height:1.7;">
      Questions before signing up? Simply reply to this email and our team will get back to you within one business day.
    </p>
    <p style="margin:0;font-size:12px;color:#334155;line-height:1.8;text-align:center;">
      &copy; ${new Date().getFullYear()} Hatake B2B &mdash; International ${acronym} Enterprise Network<br/>
      <a href="${appUrl}" style="color:#38bdf8;text-decoration:none;">hatake.shop</a>
      &nbsp;&middot;&nbsp;
      <a href="mailto:b2b@hatake.shop" style="color:#38bdf8;text-decoration:none;">b2b@hatake.shop</a>
      &nbsp;&middot;&nbsp;
      <a href="${unsubscribeUrl}" style="color:#475569;text-decoration:underline;">Unsubscribe</a>
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

export function generateNewRFQEmailHtml(
  buyerName: string,
  productTitle: string,
  quantity: number,
  dashboardUrl: string
) {
  const logoUrl = 'https://i.imgur.com/B06rBhI.png';
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background-color:#0d1117;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0d1117;padding:48px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#0f172a;border-radius:20px;border:1px solid #1e293b;overflow:hidden;">
  <tr><td style="background:linear-gradient(90deg,#0ea5e9 0%,#10b981 50%,#3b82f6 100%);height:4px;font-size:0;">&nbsp;</td></tr>
  <tr><td align="center" style="padding:44px 40px 28px 40px;">
    <img src="${logoUrl}" alt="Hatake" width="80" height="80" style="display:block;border-radius:50%;border:2px solid #1e293b;margin-bottom:12px;" />
    <div style="font-size:22px;font-weight:800;color:#f8fafc;letter-spacing:-0.5px;">New RFQ Received</div>
  </td></tr>
  <tr><td style="padding:0 40px;"><div style="height:1px;background:#1e293b;"></div></td></tr>
  <tr><td style="padding:36px 40px 0 40px;">
    <p style="margin:0 0 20px 0;font-size:16px;color:#cbd5e1;line-height:1.6;">
      <strong>${buyerName}</strong> has just submitted a Request for Quote (RFQ) for your wholesale inventory.
    </p>
    <div style="background:#1e293b;border-radius:12px;padding:20px;margin-bottom:28px;">
      <div style="font-size:12px;color:#64748b;text-transform:uppercase;font-weight:700;margin-bottom:4px;">Product</div>
      <div style="font-size:16px;color:#f8fafc;font-weight:bold;margin-bottom:12px;">${productTitle}</div>
      <div style="font-size:12px;color:#64748b;text-transform:uppercase;font-weight:700;margin-bottom:4px;">Requested Quantity</div>
      <div style="font-size:16px;color:#38bdf8;font-weight:bold;">${quantity} units</div>
    </div>
  </td></tr>
  <tr><td align="center" style="padding:8px 40px 36px 40px;">
    <a href="${dashboardUrl}" style="display:inline-block;background:#38bdf8;color:#0f172a;text-decoration:none;font-weight:700;font-size:15px;padding:16px 40px;border-radius:10px;">
      View & Respond to RFQ
    </a>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

export function generateAbandonedRFQEmailHtml(
  buyerName: string,
  productTitle: string,
  resumeUrl: string
) {
  const logoUrl = 'https://i.imgur.com/B06rBhI.png';
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background-color:#0d1117;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0d1117;padding:48px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#0f172a;border-radius:20px;border:1px solid #1e293b;overflow:hidden;">
  <tr><td style="background:linear-gradient(90deg,#f59e0b 0%,#ef4444 100%);height:4px;font-size:0;">&nbsp;</td></tr>
  <tr><td align="center" style="padding:44px 40px 28px 40px;">
    <img src="${logoUrl}" alt="Hatake" width="80" height="80" style="display:block;border-radius:50%;border:2px solid #1e293b;margin-bottom:12px;" />
    <div style="font-size:22px;font-weight:800;color:#f8fafc;letter-spacing:-0.5px;">Pending Quote Request</div>
  </td></tr>
  <tr><td style="padding:0 40px;"><div style="height:1px;background:#1e293b;"></div></td></tr>
  <tr><td style="padding:36px 40px 0 40px;">
    <p style="margin:0 0 20px 0;font-size:16px;color:#cbd5e1;line-height:1.6;">
      Hi ${buyerName}, you started an RFQ for <strong>${productTitle}</strong> but didn't finish sending it to the supplier.
    </p>
    <p style="margin:0 0 28px 0;font-size:15px;color:#94a3b8;line-height:1.6;">
      Inventory moves fast on the B2B network. Resume your negotiation now to secure the best wholesale pricing before stock runs out.
    </p>
  </td></tr>
  <tr><td align="center" style="padding:8px 40px 36px 40px;">
    <a href="${resumeUrl}" style="display:inline-block;background:#f59e0b;color:#0f172a;text-decoration:none;font-weight:700;font-size:15px;padding:16px 40px;border-radius:10px;">
      Resume Negotiation
    </a>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}
