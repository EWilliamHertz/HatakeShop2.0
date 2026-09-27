import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

export function generateProformaInvoice(inquiry: any) {
  const doc = new jsPDF();
  
  const invoiceNumber = `PI-${inquiry.id.toString().padStart(6, '0')}`;
  const date = format(new Date(), 'MMM dd, yyyy');
  
  // Header
  doc.setFontSize(22);
  doc.setTextColor(30, 41, 59);
  doc.text("PROFORMA INVOICE", 14, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Invoice Number: ${invoiceNumber}`, 14, 32);
  doc.text(`Date: ${date}`, 14, 38);
  doc.text(`Status: ${inquiry.status}`, 14, 44);

  // Platform Info
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "bold");
  doc.text("Hatake.Shop B2B Marketplace", 120, 22);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("123 Wholesale Blvd, Trade City", 120, 28);
  doc.text("VAT: EU123456789", 120, 34);
  doc.text("support@hatake.shop", 120, 40);

  // Divider
  doc.setDrawColor(226, 232, 240);
  doc.line(14, 50, 196, 50);

  // Supplier & Buyer Info
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text("Supplier Details:", 14, 60);
  doc.text("Buyer Details:", 120, 60);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  // We use fallback text if we don't have full company details hydrated
  doc.text(inquiry.targetProduct?.seller?.companyName || "Supplier Company", 14, 66);
  doc.text(inquiry.targetProduct?.seller?.email || "Email pending", 14, 72);
  
  doc.text(inquiry.buyer?.displayName || "Buyer Name", 120, 66);
  doc.text(inquiry.buyer?.email || "Email pending", 120, 72);

  // Table
  const tableData = [
    [
      inquiry.targetProduct?.title || 'Custom Sourced Product',
      inquiry.quantity.toString(),
      `€${Number(inquiry.agreedPrice || inquiry.targetBudget || 0).toFixed(2)}`,
      `€${((inquiry.quantity || 1) * Number(inquiry.agreedPrice || inquiry.targetBudget || 0)).toFixed(2)}`
    ]
  ];

  autoTable(doc, {
    startY: 85,
    head: [['Description', 'Qty', 'Unit Price', 'Total']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], textColor: 255 },
    styles: { fontSize: 10, cellPadding: 6 },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { halign: 'center' },
      2: { halign: 'right' },
      3: { halign: 'right' }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;
  
  // Totals
  const subtotal = (inquiry.quantity || 1) * Number(inquiry.agreedPrice || inquiry.targetBudget || 0);
  
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Subtotal:", 130, finalY);
  doc.text(`€${subtotal.toFixed(2)}`, 196, finalY, { align: 'right' });
  
  doc.text("Total Due:", 130, finalY + 8);
  doc.text(`€${subtotal.toFixed(2)}`, 196, finalY + 8, { align: 'right' });

  // Footer notes
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(148, 163, 184);
  doc.text("This proforma invoice is generated automatically by Hatake.Shop.", 14, 270);
  doc.text("Funds are held securely in Escrow until buyer confirms receipt of goods.", 14, 275);

  doc.save(`HatakeShop_Proforma_${invoiceNumber}.pdf`);
}
