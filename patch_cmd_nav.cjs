const fs = require('fs');
let code = fs.readFileSync('src/components/CommandPalette.tsx', 'utf8');

if (!code.includes('selectedIndex')) {
  code = code.replace(
    "const [search, setSearch] = useState('');",
    "const [search, setSearch] = useState('');\n  const [selectedIndex, setSelectedIndex] = useState(0);"
  );
  
  code = code.replace(
    "setSearch(e.target.value)",
    "setSearch(e.target.value); setSelectedIndex(0);"
  );
  
  // Replace handleKeyDown logic to capture j, k, ArrowUp, ArrowDown, Enter
  const handleKeyDownBlock = `const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (!isOpen) return;

      if (e.key === 'Escape') {
        setIsOpen(false);
      }
      
      // Navigate down
      if (e.key === 'ArrowDown' || (e.ctrlKey && e.key === 'j')) {
        e.preventDefault();
        setSelectedIndex(prev => prev < filteredProducts.length - 1 ? prev + 1 : prev);
      }
      
      // Navigate up
      if (e.key === 'ArrowUp' || (e.ctrlKey && e.key === 'k')) {
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : 0);
      }
      
      // Select
      if (e.key === 'Enter') {
        e.preventDefault();
        const selected = filteredProducts[selectedIndex];
        if (selected) {
           handleQuickAdd(selected);
        }
      }
    };`;
    
  code = code.replace(
    /const handleKeyDown = \(e: KeyboardEvent\) => \{[\s\S]*?if \(e\.key === 'Escape'\) \{[\s\S]*?setIsOpen\(false\);[\s\S]*?\}[\s\S]*?\};/,
    handleKeyDownBlock
  );
  
  // Now modify the rendering to show the selected state
  code = code.replace(
    /<div key=\{product.id\} className="group flex items-center justify-between p-3 rounded-xl hover:bg-slate-800\/80 cursor-pointer transition-colors"/g,
    `<div key={product.id} className={\`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors \${selectedIndex === filteredProducts.indexOf(product) ? 'bg-slate-800 border-indigo-500/50' : 'hover:bg-slate-800/80'}\`}`
  );
  
  fs.writeFileSync('src/components/CommandPalette.tsx', code);
}
