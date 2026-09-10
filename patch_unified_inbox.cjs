const fs = require('fs');
const file = 'src/pages/RFQHub.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Fix Contacts Deduplication
const targetContacts = `       inquiries.forEach(inq => {
          if (inq.buyer?.uid !== user.uid && inq.buyer) uniqueUsers.set(inq.buyer.id, inq.buyer);
          if (inq.seller?.uid !== user.uid && inq.seller) uniqueUsers.set(inq.seller.id, inq.seller);
       });`;
const replacementContacts = `       inquiries.forEach(inq => {
          if (inq.buyer?.uid !== user.uid && inq.buyer) uniqueUsers.set(inq.buyer.companyName || inq.buyer.id, inq.buyer);
          if (inq.seller?.uid !== user.uid && inq.seller) uniqueUsers.set(inq.seller.companyName || inq.seller.id, inq.seller);
       });`;
content = content.replace(targetContacts, replacementContacts);

// 2. Fix Unified Inbox Deduplication
const targetInbox = `{inquiries.map((inq: any, idx: number) => {
                 const otherParty = dbUser?.id === inq.inquiry.buyerId ? (inq.seller?.companyName || "Vendor") : (inq.buyer?.companyName || "Customer");
                 const latestMsg = inq.messages && inq.messages.length > 0 ? inq.messages[0] : null;
                 
                 return (`;

const replacementInbox = `{(() => {
                 const uniqueInquiries = new Map();
                 inquiries.forEach((inq: any) => {
                    const otherParty = dbUser?.id === inq.inquiry.buyerId ? (inq.seller?.companyName || "Vendor") : (inq.buyer?.companyName || "Customer");
                    if (!uniqueInquiries.has(otherParty)) {
                       uniqueInquiries.set(otherParty, inq);
                    }
                 });
                 return Array.from(uniqueInquiries.values());
               })().map((inq: any, idx: number) => {
                 const otherParty = dbUser?.id === inq.inquiry.buyerId ? (inq.seller?.companyName || "Vendor") : (inq.buyer?.companyName || "Customer");
                 const latestMsg = inq.messages && inq.messages.length > 0 ? inq.messages[0] : null;
                 
                 return (`;
                 
content = content.replace(targetInbox, replacementInbox);

fs.writeFileSync(file, content);
