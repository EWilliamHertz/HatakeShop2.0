const fs = require('fs');
let code = fs.readFileSync('src/pages/RFQDetails.tsx', 'utf8');

const fetchInquiryStr = `
  const fetchInquiry = async () => {
    try {
      const token = await user?.getIdToken();
      const res = await fetch(\`/api/inquiries/\${id}\`, {
        headers: { 'Authorization': \`Bearer \${token}\` }
      });
      if (res.ok) {
        setInquiry(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };
`;

code = code.replace(
  'const messagesEndRef = useRef<HTMLDivElement>(null);',
  'const messagesEndRef = useRef<HTMLDivElement>(null);\n' + fetchInquiryStr
);

// also uncomment fetchInquiry
code = code.replace('// fetchInquiry();', 'fetchInquiry();');

fs.writeFileSync('src/pages/RFQDetails.tsx', code);
console.log("Restored fetchInquiry");
