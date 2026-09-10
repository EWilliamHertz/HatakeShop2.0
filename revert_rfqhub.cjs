const fs = require('fs');
let code = fs.readFileSync('src/pages/RFQHub.tsx', 'utf8');

const badBlockRegex = /  useEffect\(\(\) => \{\n    if \(\!user\) return;\n    setLoading\(true\);\n    const q1[\s\S]*?const fetchInquiries = \(\) => \{\}; \/\/ Dummy for draft form/m;

const goodBlock = `  const fetchInquiries = async () => {
    try {
      const token = await user?.getIdToken();
      const res = await fetch('/api/inquiries', {
        headers: { 'Authorization': \`Bearer \${token}\` }
      });
      const data = await res.json();
      setInquiries(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchInquiries();
    
    const q1 = query(collection(db, 'inquiries'), where('buyerUid', '==', user.uid));
    const q2 = query(collection(db, 'inquiries'), where('sellerUid', '==', user.uid));
    
    let debounceTimer;
    const triggerFetch = () => {
       clearTimeout(debounceTimer);
       debounceTimer = setTimeout(() => {
          fetchInquiries();
       }, 500);
    };
    
    const unsub1 = onSnapshot(q1, triggerFetch);
    const unsub2 = onSnapshot(q2, triggerFetch);
    
    return () => {
        unsub1();
        unsub2();
        clearTimeout(debounceTimer);
    };
  }, [user]);`;

code = code.replace(badBlockRegex, goodBlock);

fs.writeFileSync('src/pages/RFQHub.tsx', code);
