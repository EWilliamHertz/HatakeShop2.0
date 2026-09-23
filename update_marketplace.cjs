const fs = require('fs');
let code = fs.readFileSync('src/pages/Marketplace.tsx', 'utf-8');

if (!code.includes('ChevronRight')) {
    code = code.replace(/ChevronDown, X/, 'ChevronDown, ChevronRight, X');
}

const stateRegex = /const \[mobileFiltersOpen, setMobileFiltersOpen\] = useState\(false\);/;
const newState = `const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<number, boolean>>({ 3: true }); // TCG expanded by default

  const toggleCategory = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedCategories(prev => ({ ...prev, [id]: !prev[id] }));
  };`;

if (code.includes('const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);') && !code.includes('expandedCategories')) {
    code = code.replace(stateRegex, newState);
    fs.writeFileSync('src/pages/Marketplace.tsx', code);
    console.log("Successfully injected state.");
} else {
    console.log("State already injected or not found.");
}
