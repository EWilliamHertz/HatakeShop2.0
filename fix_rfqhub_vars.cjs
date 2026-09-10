const fs = require('fs');
let code = fs.readFileSync('src/pages/RFQHub.tsx', 'utf8');

const useEffectCode = `  useEffect(() => {
    if (activeTab === 'contacts' && user) {
       // Fetch contacts (mocking as users we have RFQs with)
       const uniqueUsers = new Map();
       inquiries.forEach(inq => {
          if (inq.buyer?.uid !== user.uid && inq.buyer) uniqueUsers.set(inq.buyer.id, inq.buyer);
          if (inq.seller?.uid !== user.uid && inq.seller) uniqueUsers.set(inq.seller.id, inq.seller);
       });
       setContacts(Array.from(uniqueUsers.values()));
    }
  }, [activeTab, inquiries, user]);`;

code = code.replace(useEffectCode, "");

const insertAfter = "  const location = useLocation();";
const index = code.indexOf(insertAfter);
if (index !== -1) {
    code = code.substring(0, index + insertAfter.length) + "\n" + useEffectCode + "\n" + code.substring(index + insertAfter.length);
    fs.writeFileSync('src/pages/RFQHub.tsx', code);
}
