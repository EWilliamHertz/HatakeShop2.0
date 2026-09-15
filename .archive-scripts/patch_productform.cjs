const fs = require('fs');

let content = fs.readFileSync('src/components/ProductForm.tsx', 'utf-8');

// 1. Add oemMoq to Zod schema
content = content.replace(
  'moq: z.coerce.number().min(1, "MOQ must be at least 1"),',
  'moq: z.coerce.number().min(1, "MOQ must be at least 1"),\n  oemMoq: z.coerce.number().min(1, "OEM MOQ must be at least 1").optional().default(1),'
);

// 2. Add oemMoq to initialValues
content = content.replace(
  'moq: initialValues?.moq || 1,',
  'moq: initialValues?.moq || 1,\n      oemMoq: initialValues?.oemMoq || 1,'
);

// 3. Add oemMoq input field
const moqField = `
          {errors.moq && <p className="text-red-500 text-xs mt-1">{errors.moq.message as string}</p>}
        </div>`;
        
const newMoqField = moqField + `
        <div>
          <label className="block text-sm font-semibold tracking-tight text-slate-300 mb-1">OEM MOQ</label>
          <input 
            type="number" 
            className="w-full bg-slate-800 border border-slate-700 text-slate-100 px-3 py-2 rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all outline-none"
            {...register("oemMoq")}
          />
          {errors.oemMoq && <p className="text-red-500 text-xs mt-1">{errors.oemMoq.message as string}</p>}
        </div>`;

content = content.replace(moqField, newMoqField);

fs.writeFileSync('src/components/ProductForm.tsx', content);
