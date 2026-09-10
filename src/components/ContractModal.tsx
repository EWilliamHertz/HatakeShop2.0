import React, { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { X, Download, PenTool } from 'lucide-react';
import { useCurrency } from './CurrencyContext.tsx';

interface ContractModalProps {
  inquiry: any;
  onClose: () => void;
  isBuyer: boolean;
  onSign: (signature: string) => Promise<void>;
}

export function ContractModal({ inquiry, onClose, isBuyer, onSign }: ContractModalProps) {
  const { formatPrice } = useCurrency();
  const sigCanvas = useRef<SignatureCanvas>(null);
  const contractRef = useRef<HTMLDivElement>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const clearSignature = () => {
    sigCanvas.current?.clear();
  };

  const saveSignature = async () => {
    if (sigCanvas.current?.isEmpty()) return;
    setIsSaving(true);
    const dataUrl = sigCanvas.current?.getTrimmedCanvas().toDataURL('image/png');
    if (dataUrl) {
      await onSign(dataUrl);
    }
    setIsSigning(false);
    setIsSaving(false);
  };

  const downloadPDF = async () => {
    if (!contractRef.current) return;
    const canvas = await html2canvas(contractRef.current, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`PO-${inquiry.inquiry.id}-${inquiry.product.title}.pdf`);
  };

  const hasBuyerSigned = !!inquiry.inquiry.buyerSignature;
  const hasSellerSigned = !!inquiry.inquiry.sellerSignature;
  
  const mySignature = isBuyer ? hasBuyerSigned : hasSellerSigned;
  const canSign = !mySignature;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-700 bg-slate-900">
          <h2 className="text-xl font-semibold tracking-tight font-display text-slate-100">Purchase Order / Contract</h2>
          <div className="flex items-center gap-3">
             <button onClick={downloadPDF} className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-slate-100 rounded-xl font-semibold tracking-tight text-sm hover:bg-slate-700">
               <Download className="w-4 h-4" /> Download PDF
             </button>
             <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-400 hover:bg-slate-600 rounded-full transition-colors">
               <X className="w-5 h-5" />
             </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 bg-slate-900/50">
          <div className="bg-slate-800 p-12 max-w-2xl mx-auto shadow-none border border-slate-700 min-h-[800px] text-sm text-slate-100" ref={contractRef}>
             
             {/* Header */}
             <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-8">
                <div>
                   <h1 className="text-4xl font-black text-slate-100 uppercase tracking-tighter">Purchase Order</h1>
                   <div className="mt-2 text-slate-400 font-medium">PO Number: #{String(inquiry.inquiry.id).padStart(6, '0')}</div>
                   <div className="text-slate-400 font-medium">Date: {new Date(inquiry.inquiry.updatedAt || inquiry.inquiry.createdAt).toLocaleDateString()}</div>
                </div>
                <div className="text-right">
                   <div className="font-semibold tracking-tight font-display text-lg text-slate-100">Hatake.Shop B2B</div>
                   <div className="text-slate-400">Global Wholesale Platform</div>
                </div>
             </div>

             {/* Parties */}
             <div className="grid grid-cols-2 gap-8 mb-8">
                <div>
                   <div className="font-semibold tracking-tight text-xs uppercase tracking-widest text-slate-400 mb-2">Vendor (Seller)</div>
                   <div className="font-semibold tracking-tight text-base">{inquiry.seller?.companyName || 'Supplier'}</div>
                   <div className="text-slate-400">{inquiry.seller?.email}</div>
                </div>
                <div>
                   <div className="font-semibold tracking-tight text-xs uppercase tracking-widest text-slate-400 mb-2">Ship To (Buyer)</div>
                   <div className="font-semibold tracking-tight text-base">{inquiry.buyer?.companyName || 'Buyer'}</div>
                   <div className="text-slate-400">{inquiry.buyer?.email}</div>
                   {inquiry.inquiry.shippingDestination && (
                     <div className="text-slate-400 mt-1 whitespace-pre-wrap">{inquiry.inquiry.shippingDestination}</div>
                   )}
                </div>
             </div>

             {/* Line Items */}
             <table className="w-full mb-8">
               <thead>
                 <tr className="border-b-2 border-slate-900">
                   <th className="py-2 text-left font-semibold tracking-tight text-xs uppercase tracking-widest">Item Description</th>
                   <th className="py-2 text-right font-semibold tracking-tight text-xs uppercase tracking-widest">Qty</th>
                   <th className="py-2 text-right font-semibold tracking-tight text-xs uppercase tracking-widest">Unit Price</th>
                   <th className="py-2 text-right font-semibold tracking-tight text-xs uppercase tracking-widest">Total</th>
                 </tr>
               </thead>
               <tbody className="border-b border-slate-700">
                 <tr>
                   <td className="py-4 text-left font-medium">{inquiry.product?.title}</td>
                   <td className="py-4 text-right">{inquiry.inquiry.quantity}</td>
                   <td className="py-4 text-right">{inquiry.inquiry.targetBudget ? formatPrice(parseFloat(inquiry.inquiry.targetBudget)) : 'TBD'}</td>
                   <td className="py-4 text-right font-semibold tracking-tight">
                     {inquiry.inquiry.targetBudget ? formatPrice(inquiry.inquiry.quantity * parseFloat(inquiry.inquiry.targetBudget)) : 'TBD'}
                   </td>
                 </tr>
               </tbody>
             </table>

             {/* Terms */}
             <div className="mb-12">
               <div className="font-semibold tracking-tight text-xs uppercase tracking-widest text-slate-400 mb-2">Terms & Conditions</div>
               <p className="text-xs text-slate-400 leading-relaxed">
                 1. Acceptance: This Purchase Order constitutes the buyer's offer to the seller, and becomes a binding contract upon acceptance by seller either by acknowledgment or commencement of performance.<br/>
                 2. Payment: Payment shall be processed securely via Hatake.Shop Escrow services, released upon confirmed delivery or agreed milestones.<br/>
                 3. Shipping: Unless otherwise specified, all goods shall be shipped DDP (Delivered Duty Paid).<br/>
                 4. Returns: Defective goods may be returned within 14 days of receipt for full refund or replacement.
               </p>
             </div>

             {/* Signatures */}
             <div className="grid grid-cols-2 gap-8 mt-16 pt-8 border-t border-slate-700">
                <div>
                   <div className="h-24 flex items-end border-b border-slate-700 pb-2 mb-2">
                     {inquiry.inquiry.buyerSignature ? (
                        <img src={inquiry.inquiry.buyerSignature} alt="Buyer Signature" className="max-h-16" />
                     ) : (
                        <span className="text-slate-400 italic">Awaiting Signature</span>
                     )}
                   </div>
                   <div className="font-semibold tracking-tight text-sm">Buyer Authorized Signature</div>
                   <div className="text-xs text-slate-400 mt-1">{inquiry.buyer?.companyName}</div>
                </div>
                <div>
                   <div className="h-24 flex items-end border-b border-slate-700 pb-2 mb-2">
                     {inquiry.inquiry.sellerSignature ? (
                        <img src={inquiry.inquiry.sellerSignature} alt="Seller Signature" className="max-h-16" />
                     ) : (
                        <span className="text-slate-400 italic">Awaiting Signature</span>
                     )}
                   </div>
                   <div className="font-semibold tracking-tight text-sm">Seller Authorized Signature</div>
                   <div className="text-xs text-slate-400 mt-1">{inquiry.seller?.companyName}</div>
                </div>
             </div>

          </div>
        </div>

        {/* Action Bar */}
        <div className="p-4 border-t border-slate-700 bg-slate-800">
          {isSigning ? (
            <div className="flex flex-col items-center">
              <div className="text-sm font-semibold tracking-tight text-slate-400 mb-2">Sign Below</div>
              <div className="border-2 border-slate-700 rounded-xl overflow-hidden bg-slate-900">
                 <SignatureCanvas 
                    ref={sigCanvas} 
                    penColor="blue"
                    canvasProps={{width: 500, height: 150, className: 'sigCanvas'}} 
                 />
              </div>
              <div className="flex gap-2 mt-4">
                 <button onClick={clearSignature} className="px-4 py-2 text-sm font-semibold tracking-tight text-slate-400 bg-slate-700 hover:bg-slate-600 rounded-xl">Clear</button>
                 <button onClick={() => setIsSigning(false)} className="px-4 py-2 text-sm font-semibold tracking-tight text-slate-400 bg-slate-700 hover:bg-slate-600 rounded-xl">Cancel</button>
                 <button disabled={isSaving} onClick={saveSignature} className="px-6 py-2 text-sm font-semibold tracking-tight text-white bg-ink hover:bg-ink-light rounded-xl shadow-none flex items-center gap-2">
                   {isSaving ? 'Saving...' : 'Save Signature'}
                 </button>
              </div>
            </div>
          ) : (
            <div className="flex justify-between items-center">
               <div className="text-sm font-medium text-slate-400">
                  {hasBuyerSigned && hasSellerSigned ? (
                     <span className="text-emerald-600 font-semibold tracking-tight flex items-center gap-1"><PenTool className="w-4 h-4"/> Fully Executed</span>
                  ) : (
                     <span>Requires signatures from both parties.</span>
                  )}
               </div>
               {canSign && (
                 <button 
                   onClick={() => setIsSigning(true)}
                   className="px-6 py-2.5 bg-ink text-white font-semibold tracking-tight rounded-xl shadow-none hover:bg-ink-light hover:shadow-none transition-all active:scale-95 flex items-center gap-2"
                 >
                   <PenTool className="w-4 h-4" /> Sign Document
                 </button>
               )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
