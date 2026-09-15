const fs = require('fs');
let content = fs.readFileSync('src/components/ProductForm.tsx', 'utf-8');

const oldSchema = `oemMoq: z.coerce.number().min(1, "OEM MOQ must be at least 1").optional().default(1),`;
const newSchema = `offersOem: z.boolean().default(false),
  oemMoq: z.coerce.number().min(1, "OEM MOQ must be at least 1").optional().default(1),`;

const oldDefaults = `moq: initialValues?.moq || 1,
      oemMoq: initialValues?.oemMoq || 1,`;
const newDefaults = `moq: initialValues?.moq || 1,
      offersOem: initialValues?.offersOem || false,
      oemMoq: initialValues?.oemMoq || 1,`;

const oldInput = `<div>
          <label className="block text-sm font-semibold tracking-tight text-slate-300 mb-1">OEM MOQ</label>
          <input 
            type="number" 
            className="w-full bg-slate-800 border border-slate-700 text-slate-100 px-3 py-2 rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all outline-none"
            {...register("oemMoq")}
          />
          {errors.oemMoq && <p className="text-red-500 text-xs mt-1">{errors.oemMoq.message as string}</p>}
        </div>`;

const newInput = `<div>
          <label className="flex items-center text-sm font-semibold tracking-tight text-slate-300 mb-2 cursor-pointer">
            <input 
              type="checkbox"
              className="mr-2 rounded border-slate-700 bg-slate-800 focus:ring-cyan-500 text-cyan-600"
              {...register("offersOem")}
            />
            Offer OEM / Private Label?
          </label>
          <div className={\`transition-opacity \${control._formValues.offersOem ? 'opacity-100' : 'opacity-50 pointer-events-none'}\`}>
            <label className="block text-xs font-semibold tracking-tight text-slate-400 mb-1">OEM MOQ</label>
            <input 
              type="number" 
              className="w-full bg-slate-800 border border-slate-700 text-slate-100 px-3 py-2 rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all outline-none"
              {...register("oemMoq")}
              disabled={!control._formValues.offersOem}
            />
            {errors.oemMoq && <p className="text-red-500 text-xs mt-1">{errors.oemMoq.message as string}</p>}
          </div>
        </div>`;

content = content.replace(oldSchema, newSchema);
content = content.replace(oldDefaults, newDefaults);
content = content.replace(oldInput, newInput);
fs.writeFileSync('src/components/ProductForm.tsx', content);
console.log("Patched ProductForm");
