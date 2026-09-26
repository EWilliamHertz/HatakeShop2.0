const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const oldPrompt = `"buyScale": "single_cases" | "pallets" | "containers" | "unknown",`;
const newPrompt = `"buyScale": "retail_units" | "single_cases" | "pallets" | "containers" | "unknown",`;
code = code.replace(oldPrompt, newPrompt);

const oldPrompt2 = `If they don't mention something explicitly, try to infer the best fit. If you can't guess, use "unknown" or empty arrays.`;
const newPrompt2 = `If they don't mention something explicitly, try to infer the best fit. For "buyScale", infer based on budget if provided (< €1000 = "retail_units", €1000-€5000 = "single_cases", > €5000 = "pallets"). If you can't guess, use "unknown".`;
code = code.replace(oldPrompt2, newPrompt2);

fs.writeFileSync('server.ts', code);
