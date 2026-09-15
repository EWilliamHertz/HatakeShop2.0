const fs = require('fs');
let code = fs.readFileSync('src/pages/SellerDashboard.tsx', 'utf8');

if (!code.includes("import { ResponsiveContainer")) {
  code = "import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Line, BarChart, Bar } from 'recharts';\n" + code;
  fs.writeFileSync('src/pages/SellerDashboard.tsx', code);
  console.log("Added recharts imports");
}
