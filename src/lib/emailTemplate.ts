export interface B2BMailTemplateContext {
  companyName?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  location?: string | null;
  segment?: string | null;
}

export interface B2BMailOptions {
  language?: string | null; // 'en' | 'sv' | 'de'
  senderName?: string | null;
  replyTo?: string | null;
  subjectTemplate?: string | null;
  headlineTemplate?: string | null;
  introTemplate?: string | null;
  regionalNote?: string | null;
  ctaText?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  location?: string | null;
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderMailVariables(
  template: string,
  ctx: B2BMailTemplateContext,
  escapeValues = false
): string {
  const companyName = (ctx.companyName || 'Partner').trim() || 'Partner';
  const firstName = companyName.split(/\s+/)[0] || 'Partner';
  const city = (ctx.city || '').trim();
  const state = (ctx.state || '').trim();
  const country = (ctx.country || '').trim();
  const location =
    (ctx.location || [city, state || country].filter(Boolean).join(', ')).trim() ||
    country ||
    'your region';
  const segment = (ctx.segment || 'TCG').trim();

  const map: Record<string, string> = {
    companyName,
    firstName,
    city: city || country || 'your city',
    state: state || country || 'your region',
    country: country || 'your market',
    location,
    segment,
  };

  let out = template;
  for (const [key, val] of Object.entries(map)) {
    const safeVal = escapeValues ? escapeHtml(val) : val;
    out = out.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi'), safeVal);
  }
  // Clean up accidental ", your region" when state/city was empty
  out = out.replace(/,\s*your region/gi, '').replace(/\(\s*your city\s*\)/gi, '').trim();
  return out;
}

export function buildB2BEmailSubject(
  subjectTemplate?: string | null,
  ctx: B2BMailTemplateContext = {},
  language: string = 'en'
): string {
  const defaultSubj =
    language === 'sv'
      ? '{{companyName}} — Inbjudan till Hatake.Shop B2B'
      : language === 'de'
      ? '{{companyName}} — B2B-Einladung zu Hatake.Shop'
      : '{{companyName}}, join Hatake.Shop B2B';

  return renderMailVariables(subjectTemplate?.trim() || defaultSubj, ctx, false);
}

const LOCALE_COPY: Record<
  string,
  {
    subHeader: (acronym: string) => string;
    defaultHeadline: string;
    defaultIntro: (displayCategory: string) => string;
    cards: Array<{ icon: string; title: string; body: string; color: string }>;
    defaultCta: string;
    personalNotice: (company: string) => string;
    questionsText: string;
    unsubscribeLabel: string;
  }
> = {
  en: {
    subHeader: acronym => `International ${acronym} Enterprise Network`,
    defaultHeadline: "{{companyName}}, you're invited.",
    defaultIntro: displayCategory =>
      `Hi {{firstName}}, we'd like to invite {{companyName}} to join Hatake B2B — the wholesale platform where ${displayCategory} businesses source and move inventory at scale, worldwide.`,
    cards: [
      {
        icon: '🌍',
        title: 'Global Buyers & Suppliers',
        body: 'Connect directly with verified wholesale distributors & factories across Europe, North America & Asia.',
        color: '#0ea5e9',
      },
      {
        icon: '📦',
        title: 'Factory & Sealed Allocations',
        body: 'Source sealed TCG boxes, graded slabs & factory-direct accessories with live stock & OEM branding.',
        color: '#6366f1',
      },
      {
        icon: '🔒',
        title: 'Protected B2B Trade',
        body: 'KYB-vetted partners, transparent tiered MOQ pricing, and escrow-backed order protection.',
        color: '#8b5cf6',
      },
      {
        icon: '🚀',
        title: 'Fast Storefront Onboarding',
        body: 'Activate your company workspace in minutes with dedicated account support.',
        color: '#10b981',
      },
    ],
    defaultCta: 'Create Your Company Profile',
    personalNotice: company => `This invitation is personal to ${company}. It expires in 30 days.`,
    questionsText:
      'Questions before signing up? Simply reply to this email and our B2B team will get back to you within one business day.',
    unsubscribeLabel: 'Unsubscribe',
  },
  sv: {
    subHeader: acronym => `Internationellt ${acronym} Grossistnätverk`,
    defaultHeadline: '{{companyName}}, ni är inbjudna.',
    defaultIntro: () =>
      'Hej {{firstName}}! Vi vill bjuda in {{companyName}} till Hatake B2B — grossistplattformen där kort- och hobbybutiker köper in förseglade TCG-produkter och fabrikstillverkade tillbehör direkt utan mellanhänder.',
    cards: [
      {
        icon: '🌍',
        title: 'Direkt från Fabrik & Distributör',
        body: 'Handla direkt från verifierade tillverkare och distributörer i Europa, Asien & Nordamerika.',
        color: '#0ea5e9',
      },
      {
        icon: '📦',
        title: 'TCG & Tillbehör i Partihandel',
        body: 'Booster boxes, japanska/kinesiska utgåvor, pärmar, toploaders, sleeves & akrylboxar med eget OEM-tryck.',
        color: '#6366f1',
      },
      {
        icon: '🔒',
        title: 'Trygg B2B-Handel',
        body: 'Verifierade företagskonton, tydliga MOQ-nivåer och säkra transaktioner.',
        color: '#8b5cf6',
      },
      {
        icon: '🚀',
        title: 'Snabb Registrering',
        body: 'Skapa er företagsprofil kostnadsfritt på några minuter med personlig svensk support.',
        color: '#10b981',
      },
    ],
    defaultCta: 'Skapa Företagsprofil',
    personalNotice: company => `Denna inbjudan är personlig för ${company} och gäller i 30 dagar.`,
    questionsText:
      'Har ni frågor innan registrering? Svara direkt på detta mejl så återkommer vi inom en arbetsdag.',
    unsubscribeLabel: 'Avregistrera',
  },
  de: {
    subHeader: acronym => `Internationales ${acronym} B2B-Handelsnetzwerk`,
    defaultHeadline: '{{companyName}}, Sie sind eingeladen.',
    defaultIntro: () =>
      'Hallo {{firstName}}, wir laden {{companyName}} herzlich zu Hatake B2B ein — der Großhandelsplattform für Sammelkarten-Fachhändler zum direkten Einkauf versiegelter TCG-Ware und Direktfabrik-Zubehör.',
    cards: [
      {
        icon: '🌍',
        title: 'Verifizierte Lieferanten',
        body: 'Direkter Zugang zu geprüften Großhändlern & Herstellern aus Europa, Nordamerika & Asien.',
        color: '#0ea5e9',
      },
      {
        icon: '📦',
        title: 'Sealed TCG & OEM-Zubehör',
        body: 'Displays, Booster, Ordner, Toploader, Sleeves & Acryl-Cases mit Echtzeit-Bestand & Eigenmarken-Option.',
        color: '#6366f1',
      },
      {
        icon: '🔒',
        title: 'Sichere B2B-Abwicklung',
        body: 'Geprüfte Händlerkonten, transparente Staffelpreise und Käuferschutz.',
        color: '#8b5cf6',
      },
      {
        icon: '🚀',
        title: 'Schnelles Onboarding',
        body: 'Richten Sie Ihr kostenloses Händlerprofil in wenigen Minuten ein.',
        color: '#10b981',
      },
    ],
    defaultCta: 'Händlerprofil erstellen',
    personalNotice: company => `Diese Einladung ist persönlich für ${company} bestimmt und 30 Tage gültig.`,
    questionsText:
      'Fragen vor der Anmeldung? Antworten Sie einfach auf diese E-Mail — unser B2B-Team meldet sich innerhalb eines Werktags.',
    unsubscribeLabel: 'Abmelden',
  },
};

export function generateB2BEmailHtml(
  companyNameStr: string,
  registrationUrl: string,
  unsubscribeUrl: string,
  segment: string = 'TCG',
  options?: B2BMailOptions
) {
  const langKey = (options?.language || 'en').toLowerCase().slice(0, 2);
  const copy = LOCALE_COPY[langKey] || LOCALE_COPY.en;

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

  const ctx: B2BMailTemplateContext = {
    companyName: companyNameStr,
    city: options?.city,
    state: options?.state,
    country: options?.country,
    location: options?.location,
    segment,
  };

  const brandTitle = escapeHtml((options?.senderName || 'Hatake B2B').trim() || 'Hatake B2B');
  const contactEmail = escapeHtml((options?.replyTo || 'b2b@hatake.shop').trim() || 'b2b@hatake.shop');

  const headlineHtml = renderMailVariables(
    options?.headlineTemplate?.trim() || copy.defaultHeadline,
    ctx,
    true
  );

  const introHtml = renderMailVariables(
    options?.introTemplate?.trim() || copy.defaultIntro(displayCategory),
    ctx,
    true
  );

  const regionalNoteHtml = options?.regionalNote?.trim()
    ? renderMailVariables(options.regionalNote.trim(), ctx, true)
    : '';

  const ctaLabel = renderMailVariables(
    options?.ctaText?.trim() || copy.defaultCta,
    ctx,
    true
  );

  const safeCompany = escapeHtml(companyNameStr || 'Partner');

  return `<!DOCTYPE html>
<html lang="${langKey}">
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
    <div style="font-size:26px;font-weight:800;color:#f8fafc;letter-spacing:-0.5px;margin-bottom:4px;">${brandTitle}</div>
    <div style="font-size:11px;color:#38bdf8;letter-spacing:4px;text-transform:uppercase;">${escapeHtml(copy.subHeader(acronym))}</div>
  </td></tr>

  <!-- Divider -->
  <tr><td style="padding:0 40px;"><div style="height:1px;background:#1e293b;"></div></td></tr>

  <!-- Hero body -->
  <tr><td style="padding:36px 40px 0 40px;">
    <h2 style="margin:0 0 10px 0;font-size:24px;font-weight:700;color:#f8fafc;line-height:1.3;">
      ${headlineHtml}
    </h2>
    <p style="margin:0 0 22px 0;font-size:15px;color:#94a3b8;line-height:1.65;">
      ${introHtml}
    </p>
    ${
      regionalNoteHtml
        ? `<div style="margin:0 0 24px 0;padding:14px 16px;background:#0ea5e914;border-left:3px solid #38bdf8;border-radius:10px;font-size:13px;color:#cbd5e1;line-height:1.55;">
      📍 ${regionalNoteHtml}
    </div>`
        : ''
    }

    <!-- Value props -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr>
        <td width="50%" valign="top" style="padding:0 8px 12px 0;">
          <div style="background:${copy.cards[0].color}10;border:1px solid ${copy.cards[0].color}20;border-radius:12px;padding:16px;">
            <div style="font-size:20px;margin-bottom:6px;">${copy.cards[0].icon}</div>
            <div style="font-size:13px;font-weight:700;color:#e2e8f0;margin-bottom:4px;">${escapeHtml(copy.cards[0].title)}</div>
            <div style="font-size:12px;color:#64748b;line-height:1.5;">${escapeHtml(copy.cards[0].body)}</div>
          </div>
        </td>
        <td width="50%" valign="top" style="padding:0 0 12px 8px;">
          <div style="background:${copy.cards[1].color}10;border:1px solid ${copy.cards[1].color}20;border-radius:12px;padding:16px;">
            <div style="font-size:20px;margin-bottom:6px;">${copy.cards[1].icon}</div>
            <div style="font-size:13px;font-weight:700;color:#e2e8f0;margin-bottom:4px;">${escapeHtml(copy.cards[1].title)}</div>
            <div style="font-size:12px;color:#64748b;line-height:1.5;">${escapeHtml(copy.cards[1].body)}</div>
          </div>
        </td>
      </tr>
      <tr>
        <td width="50%" valign="top" style="padding:0 8px 0 0;">
          <div style="background:${copy.cards[2].color}10;border:1px solid ${copy.cards[2].color}20;border-radius:12px;padding:16px;">
            <div style="font-size:20px;margin-bottom:6px;">${copy.cards[2].icon}</div>
            <div style="font-size:13px;font-weight:700;color:#e2e8f0;margin-bottom:4px;">${escapeHtml(copy.cards[2].title)}</div>
            <div style="font-size:12px;color:#64748b;line-height:1.5;">${escapeHtml(copy.cards[2].body)}</div>
          </div>
        </td>
        <td width="50%" valign="top" style="padding:0 0 0 8px;">
          <div style="background:${copy.cards[3].color}10;border:1px solid ${copy.cards[3].color}20;border-radius:12px;padding:16px;">
            <div style="font-size:20px;margin-bottom:6px;">${copy.cards[3].icon}</div>
            <div style="font-size:13px;font-weight:700;color:#e2e8f0;margin-bottom:4px;">${escapeHtml(copy.cards[3].title)}</div>
            <div style="font-size:12px;color:#64748b;line-height:1.5;">${escapeHtml(copy.cards[3].body)}</div>
          </div>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- CTA button -->
  <tr><td align="center" style="padding:8px 40px 36px 40px;">
    <a href="${registrationUrl}"
      style="display:inline-block;background:linear-gradient(135deg,#0ea5e9,#6366f1);color:#ffffff;text-decoration:none;font-family:Arial,sans-serif;font-weight:700;font-size:16px;padding:18px 48px;border-radius:12px;letter-spacing:0.3px;">
      → &nbsp; ${ctaLabel}
    </a>
    <p style="margin:16px 0 0 0;font-size:12px;color:#475569;">
      ${copy.personalNotice(safeCompany)}
    </p>
  </td></tr>

  <!-- Divider -->
  <tr><td style="padding:0 40px;"><div style="height:1px;background:#1e293b;"></div></td></tr>

  <!-- Footer -->
  <tr><td style="padding:28px 40px 36px 40px;">
    <p style="margin:0 0 12px 0;font-size:13px;color:#475569;line-height:1.7;">
      ${escapeHtml(copy.questionsText)}
    </p>
    <p style="margin:0;font-size:12px;color:#334155;line-height:1.8;text-align:center;">
      &copy; ${new Date().getFullYear()} ${brandTitle} &mdash; ${escapeHtml(copy.subHeader(acronym))}<br/>
      <a href="${appUrl}" style="color:#38bdf8;text-decoration:none;">hatake.shop</a>
      &nbsp;&middot;&nbsp;
      <a href="mailto:${contactEmail}" style="color:#38bdf8;text-decoration:none;">${contactEmail}</a>
      &nbsp;&middot;&nbsp;
      <a href="${unsubscribeUrl}" style="color:#475569;text-decoration:underline;">${escapeHtml(copy.unsubscribeLabel)}</a>
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
