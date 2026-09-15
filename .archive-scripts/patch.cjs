const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const target = `          for (const plat of ["Facebook", "Instagram", "Twitter", "LinkedIn", "YouTube", "TikTok", "Other Socials"]) {
            if (lead[plat]) socialLinks.push(lead[plat]);
          }
          const res = await db.insert(leads).values({
            email,
            companyName: companyName ? companyName.toString().substring(0, 255) : null,
            website,
            location,
            socialLinks: socialLinks.length > 0 ? socialLinks : undefined,
          }).onConflictDoNothing({ target: leads.email }).returning({ id: leads.id });`;

const replacement = `          for (const plat of ["Facebook", "Instagram", "Twitter", "LinkedIn", "YouTube", "TikTok", "Other Socials"]) {
            if (lead[plat]) socialLinks.push(lead[plat]);
          }
          
          let segment = 'TCG';
          const lowerName = (companyName || '').toString().toLowerCase();
          const notesKey = findKey(['note']);
          const notes = notesKey ? (lead[notesKey] || '').toString().toLowerCase() : '';
          const combinedStr = lowerName + ' ' + notes;
          if (combinedStr.includes('sport') || combinedStr.includes('baseball') || combinedStr.includes('basketball') || combinedStr.includes('football')) {
            segment = 'Sports';
          } else if (combinedStr.includes('tcg') || combinedStr.includes('magic') || combinedStr.includes('pokemon') || combinedStr.includes('yugioh')) {
            segment = 'TCG';
          } else {
            segment = 'General';
          }

          const res = await db.insert(leads).values({
            email,
            companyName: companyName ? companyName.toString().substring(0, 255) : null,
            website,
            location,
            segment,
            socialLinks: socialLinks.length > 0 ? socialLinks : undefined,
          }).onConflictDoNothing({ target: leads.email }).returning({ id: leads.id });`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('server.ts', code);
    console.log("Patched successfully");
} else {
    console.log("Target not found");
}
