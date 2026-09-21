import React, { useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
// @ts-ignore
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ImageUploader } from './ImageUploader.tsx';
import { PRODUCT_LANGUAGES, SEALED_TYPES, classifyProduct } from '../lib/productTaxonomy.ts';

export const productSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  moq: z.coerce.number().min(1, "MOQ must be at least 1"),
  offersOem: z.boolean().default(false),
  oemMoq: z.coerce.number().min(1, "OEM MOQ must be at least 1").optional().default(1),
  stockQuantity: z.coerce.number().min(0, "Stock cannot be negative"),
  unitCost: z.coerce.number().min(0, "Cost cannot be negative"),
  originType: z.string().min(1, "Origin type is required"),
  categoryId: z.coerce.number().optional().nullable(),
  leadTimeDays: z.coerce.number().min(1, "Lead time must be at least 1 day"),
  images: z.array(z.string()).default([]),
  certifications: z.array(z.string()).default([]),
  shippingOptions: z.array(z.object({
    type: z.string(),
    country: z.string().min(1, "Country is required"),
    moq: z.coerce.number().min(1, "MOQ must be >= 1")
  })).default([]),
  tieredPricing: z.array(z.object({
    quantity: z.coerce.number().min(1, "Qty must be >= 1"),
    unitPrice: z.coerce.number().min(0, "Price must be >= 0")
  })).default([]),
  productType: z.string().default('sealed'),
  language: z.string().optional().nullable(),
  sealedType: z.string().optional().nullable(),
  gradingCompany: z.string().optional().nullable(),
  grade: z.string().optional().nullable(),
  certNumber: z.string().optional().nullable(),
  cardYear: z.string().optional().nullable(),
  cardSet: z.string().optional().nullable(),
  cardNumber: z.string().optional().nullable(),
  cardVariant: z.string().optional().nullable()
});

export type ProductFormValues = z.infer<typeof productSchema>;

interface ProductFormProps {
  initialValues?: Partial<ProductFormValues>;
  onSubmit: (data: ProductFormValues) => void;
  onCancel: () => void;
  submitLabel?: string;
}

export function ProductForm({ initialValues, onSubmit, onCancel, submitLabel = "Save" }: ProductFormProps) {
  const [categories, setCategories] = React.useState<any[]>([]);
  React.useEffect(() => {
    fetch('/api-v2/categories').then(res => res.json()).then(data => setCategories(data)).catch(console.error);
  }, []);
  const [step, setStep] = React.useState(1);
  const { register, watch, control, handleSubmit, trigger, setValue, getValues, formState: { errors } } = useForm<any>({
    resolver: zodResolver(productSchema),
    mode: 'onTouched',
    defaultValues: {
      title: initialValues?.title || '',
      description: initialValues?.description || '',
      moq: initialValues?.moq || 1,
      offersOem: initialValues?.offersOem || false,
      oemMoq: initialValues?.oemMoq || 1,
      stockQuantity: initialValues?.stockQuantity || 0,
      unitCost: initialValues?.unitCost || 0,
      originType: initialValues?.originType || 'Direct Factory',
      categoryId: initialValues?.categoryId || null,
      language: initialValues?.language || '',
      sealedType: initialValues?.sealedType || '',
      leadTimeDays: initialValues?.leadTimeDays || 7,
      images: initialValues?.images || [],
      certifications: initialValues?.certifications || [],
      shippingOptions: initialValues?.shippingOptions || [],
      tieredPricing: initialValues?.tieredPricing || []
    }
  });

  const suggestFromTitle = () => {
    const guess = classifyProduct({ title: getValues('title'), description: getValues('description') });
    if (!getValues('language') && guess.language) setValue('language', guess.language, { shouldDirty: true });
    if (!getValues('sealedType') && guess.sealedType) setValue('sealedType', guess.sealedType, { shouldDirty: true });
  };

  const { fields: shippingFields, append: appendShipping, remove: removeShipping } = useFieldArray({
    control,
    name: "shippingOptions"
  });

  const { fields: tierFields, append: appendTier, remove: removeTier } = useFieldArray({
    control,
    name: "tieredPricing"
  });

  const { fields: certFields, append: appendCert, remove: removeCert } = useFieldArray({
    control,
    name: "certifications" as never
  });

  return (
    
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Stepper Header */}
      <div className="flex gap-2 mb-6">
        {[1, 2, 3].map((s) => (
          <div key={s} className={`flex-1 h-2 rounded-full ${step >= s ? 'bg-cyan-500' : 'bg-slate-700'}`} />
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
          <h3 className="text-lg font-bold text-slate-100">Step 1: Basic Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold tracking-tight text-slate-400 mb-1">Product Title</label>
              <input {...register("title", { onBlur: suggestFromTitle })} className="w-full bg-slate-900 text-slate-100 px-4 py-2 border border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none" />
              {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message as string}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold tracking-tight text-slate-400 mb-1">Product Language <span className="text-slate-500 font-normal">(edition printed on the box)</span></label>
              <select {...register("language")} className="w-full bg-slate-900 text-slate-100 px-4 py-2 border border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none">
                <option value="">Select language…</option>
                {PRODUCT_LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.flag} {l.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold tracking-tight text-slate-400 mb-1">Sealed Product Type</label>
              <select {...register("sealedType")} className="w-full bg-slate-900 text-slate-100 px-4 py-2 border border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none">
                <option value="">Select type…</option>
                {SEALED_TYPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <p className="text-[11px] text-slate-500 mt-1">Auto-suggested from the title — please double-check.</p>
            </div>
            <div>
              <label className="block text-sm font-semibold tracking-tight text-slate-400 mb-1">Origin Facility Type</label>
              <select {...register("originType")} className="w-full bg-slate-900 text-slate-100 px-4 py-2 border border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none">
                <option value="Direct Factory">Direct Factory</option>
                <option value="Verified EU Carrier/Warehouse">Verified EU Carrier/Warehouse</option>
                <option value="Global Distributor">Global Distributor</option>
              </select>
              {errors.originType && <p className="text-red-500 text-xs mt-1">{errors.originType.message as string}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold tracking-tight text-slate-400 mb-1">Category</label>
              <select {...register("categoryId")} className="w-full bg-slate-900 text-slate-100 px-4 py-2 border border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none">
                <option value="">No Category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold tracking-tight text-slate-400 mb-1">Minimum Order Quantity (MOQ)</label>
              <input type="number" {...register("moq")} className="w-full bg-slate-900 text-slate-100 px-4 py-2 border border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none" />
              {errors.moq && <p className="text-red-500 text-xs mt-1">{errors.moq.message as string}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold tracking-tight text-slate-400 mb-1">Lead Time (Days)</label>
              <input type="number" {...register("leadTimeDays")} className="w-full bg-slate-900 text-slate-100 px-4 py-2 border border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none" />
              {errors.leadTimeDays && <p className="text-red-500 text-xs mt-1">{errors.leadTimeDays.message as string}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold tracking-tight text-slate-400 mb-1">Live Stock Quantity</label>
              <input type="number" {...register("stockQuantity")} className="w-full bg-slate-900 text-slate-100 px-4 py-2 border border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none" />
              {errors.stockQuantity && <p className="text-red-500 text-xs mt-1">{errors.stockQuantity.message as string}</p>}
            </div>
            <div>
              <label className="block text-sm font-semibold tracking-tight text-slate-400 mb-1">Internal Unit Cost (€)</label>
              <input type="number" step="0.01" {...register("unitCost")} className="w-full bg-slate-900 text-slate-100 px-4 py-2 border border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none" />
              {errors.unitCost && <p className="text-red-500 text-xs mt-1">{errors.unitCost.message as string}</p>}
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
          <h3 className="text-lg font-bold text-slate-100">Step 2: Specs & Pricing</h3>
          <div>
            <label className="block text-sm font-semibold tracking-tight text-slate-400 mb-1">Product Description & Specs</label>
            <textarea rows={3} {...register("description")} className="w-full bg-slate-900 text-slate-100 px-4 py-2 border border-slate-700 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none" />
            {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description.message as string}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center text-sm font-semibold tracking-tight text-slate-300 mb-2 cursor-pointer">
                <input type="checkbox" className="mr-2 rounded border-slate-700 bg-slate-800 focus:ring-cyan-500 text-cyan-600" {...register("offersOem")} />
                Offer OEM / Private Label?
              </label>
              <div className={`transition-opacity ${watch("offersOem") ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                <label className="block text-xs font-semibold tracking-tight text-slate-400 mb-1">OEM MOQ</label>
                <input type="number" className="w-full bg-slate-800 border border-slate-700 text-slate-100 px-3 py-2 rounded-xl focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all outline-none" {...register("oemMoq")} disabled={!watch("offersOem")} />
                {errors.oemMoq && <p className="text-red-500 text-xs mt-1">{errors.oemMoq.message as string}</p>}
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-semibold tracking-tight text-slate-400">Volume Pricing Tiers</label>
                  <button type="button" onClick={() => appendTier({ quantity: 100, unitPrice: 10 })} className="text-xs text-[#ffcc00] font-semibold tracking-tight hover:text-slate-100 bg-slate-700 px-2 py-1 rounded">Add Tier</button>
              </div>
              <div className="space-y-2">
                {tierFields.map((field, index) => (
                  <div key={field.id} className="flex gap-2">
                    <div className="w-1/2">
                      <input type="number" placeholder="Min Qty" {...register(`tieredPricing.${index}.quantity`)} className="w-full bg-slate-900 text-slate-100 px-3 py-2 border border-slate-700 rounded" />
                      {errors.tieredPricing?.[index]?.quantity && <span className="text-red-500 text-xs">{errors.tieredPricing[index].quantity?.message as string}</span>}
                    </div>
                    <div className="w-1/2">
                      <input type="number" step="0.01" placeholder="Unit Price" {...register(`tieredPricing.${index}.unitPrice`)} className="w-full bg-slate-900 text-slate-100 px-3 py-2 border border-slate-700 rounded" />
                      {errors.tieredPricing?.[index]?.unitPrice && <span className="text-red-500 text-xs">{errors.tieredPricing[index].unitPrice?.message as string}</span>}
                    </div>
                    <button type="button" onClick={() => removeTier(index)} className="px-3 py-2 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-red-500 font-semibold tracking-tight rounded">X</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="pt-4 border-t border-slate-700">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-semibold tracking-tight text-slate-400">Multi-Tier Shipping (Warehouses vs Factory)</label>
              <button type="button" onClick={() => appendShipping({ type: 'Warehouse', country: '', moq: 1 })} className="text-xs bg-slate-700 text-slate-100 px-3 py-1 rounded-lg font-semibold tracking-tight">+ Add Shipping</button>
            </div>
            <div className="space-y-2">
              {shippingFields.map((field, index) => (
                <div key={field.id} className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2 p-3 bg-slate-900 border border-slate-700 rounded-xl">
                  <div className="w-full md:w-1/4">
                    <select {...register(`shippingOptions.${index}.type`)} className="w-full bg-slate-900 text-slate-100 text-sm px-2 py-1.5 border border-slate-700 rounded focus:ring-2 focus:ring-cyan-500">
                      <option value="Warehouse">Warehouse</option>
                      <option value="Factory">Factory</option>
                    </select>
                  </div>
                  <div className="w-full md:w-1/3">
                    <input type="text" placeholder="Country" {...register(`shippingOptions.${index}.country`)} className="w-full bg-slate-900 text-slate-100 text-sm px-2 py-1.5 border border-slate-700 rounded focus:ring-2 focus:ring-cyan-500" />
                  </div>
                  <div className="w-full md:w-1/6">
                    <input type="number" placeholder="MOQ" {...register(`shippingOptions.${index}.moq`)} className="w-full bg-slate-900 text-slate-100 text-sm px-2 py-1.5 border border-slate-700 rounded focus:ring-2 focus:ring-cyan-500" />
                  </div>
                  <button type="button" onClick={() => removeShipping(index)} className="w-full md:w-auto px-3 py-1.5 text-sm bg-slate-800 border border-slate-700 text-red-500 hover:bg-slate-700 font-semibold tracking-tight rounded">Remove</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
          <h3 className="text-lg font-bold text-slate-100">Step 3: Images</h3>
          <Controller
            control={control}
            name="images"
            render={({ field }) => (
              <ImageUploader images={field.value} onChange={field.onChange} />
            )}
          />
        </div>
      )}

      <div className="flex justify-between items-center pt-6 mt-6 border-t border-slate-700">
         <button type="button" onClick={onCancel} className="px-4 py-2 text-slate-400 hover:text-slate-200 font-medium">Cancel</button>
         <div className="flex gap-3">
           {step > 1 && (
             <button type="button" onClick={() => setStep(step - 1)} className="px-4 py-2 bg-slate-800 text-slate-200 hover:bg-slate-700 rounded-xl font-medium transition-colors">
               Back
             </button>
           )}
           {step < 3 ? (
             <button type="button" onClick={async () => {
               let fieldsToValidate: any[] = [];
               if (step === 1) fieldsToValidate = ['title', 'originType', 'moq', 'leadTimeDays', 'stockQuantity', 'unitCost'];
               if (step === 2) fieldsToValidate = ['description', 'oemMoq', 'tieredPricing', 'shippingOptions'];
               const isStepValid = await trigger(fieldsToValidate);
               if (isStepValid) setStep(step + 1);
             }} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-medium transition-colors">
               Next Step
             </button>
           ) : (
             <button type="submit" className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold transition-colors">
               {submitLabel}
             </button>
           )}
         </div>
      </div>
    </form>
  );
}
