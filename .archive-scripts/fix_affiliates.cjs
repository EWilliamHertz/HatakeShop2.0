const fs = require('fs');
let code = fs.readFileSync('src/pages/AffiliateDashboard.tsx', 'utf8');

code = code.replace(/>Partner Referral Program</g, ">{t('Partner Referral Program')}<");
code = code.replace(/>Invite vendors and buyers to Hatake\.Shop and earn a 1% commission on their lifetime Gross Merchandise Value \(GMV\)\.</g, ">{t('Invite vendors and buyers to Hatake.Shop and earn a 1% commission on their lifetime Gross Merchandise Value (GMV).')}<");
code = code.replace(/>Your Unique Invite Link</g, ">{t('Your Unique Invite Link')}<");
code = code.replace(/>Copy Link</g, ">{t('Copy Link')}<");
code = code.replace(/>Referred Partners</g, ">{t('Referred Partners')}<");
code = code.replace(/>Network GMV</g, ">{t('Network GMV')}<");
code = code.replace(/>Commission Earned</g, ">{t('Commission Earned')}<");

fs.writeFileSync('src/pages/AffiliateDashboard.tsx', code);
