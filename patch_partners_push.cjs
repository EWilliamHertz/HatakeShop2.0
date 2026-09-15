const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf-8');

const oldPush = `          responseList.push({ 
            id: seller.id,
            name: seller.companyName, 
            location: seller.country, 
            signedUp: true, 
            contacted: true,
            verificationStatus: seller.verificationStatus,
            isLeadOnly: false
          });`;

const newPush = `          responseList.push({ 
            id: seller.id,
            name: seller.companyName, 
            location: seller.country, 
            region: seller.region,
            companyFocus: seller.companyFocus,
            profilePictureUrl: seller.profilePictureUrl,
            signedUp: true, 
            contacted: true,
            verificationStatus: seller.verificationStatus,
            isLeadOnly: false
          });`;

content = content.replace(oldPush, newPush);
fs.writeFileSync('server.ts', content);
