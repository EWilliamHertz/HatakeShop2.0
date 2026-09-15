import { Router } from "express";
import { db } from "../db/index.js";
import { users, products, inquiries, orders, categories } from "../db/schema.js";
import { eq, or, and, desc, sql, inArray, ilike } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { requireSeller } from "../middleware/roles.js";
import { getUserProfile } from "../db/users.js";
import { generateEmbedding } from "../lib/services.js";

const router = Router();

router.get(["/seller/analytics", "/api/seller/analytics", "/api-v2/seller/analytics"], requireAuth, requireSeller, async (req: AuthRequest, res) => {
  try {
    const userProfile = await getUserProfile(req.user.uid);
    const teamOwnerId = userProfile.teamOwnerId || userProfile.id;
    
    const myProducts = await db.select({ id: products.id }).from(products).where(eq(products.sellerId, teamOwnerId));
    const productIds = myProducts.map(p => p.id);
    
    if (productIds.length === 0) {
       return res.json({
          totalRevenue: 0,
          profileViews: 0,
          conversionRate: 0,
          lineChartData: [
             { name: 'Week 1', views: 0, inquiries: 0 },
             { name: 'Week 2', views: 0, inquiries: 0 },
             { name: 'Week 3', views: 0, inquiries: 0 },
             { name: 'Week 4', views: 0, inquiries: 0 },
          ],
          barChartData: []
       });
    }

    const myInquiries = await db.select().from(inquiries).where(inArray(inquiries.targetProductId, productIds));
    
    let totalRevenue = 0;
    let acceptedOrPaidCount = 0;
    let totalInquiriesCount = myInquiries.length;
    
    myInquiries.forEach(inq => {
       if (['Accepted', 'Paid', 'Escrow Funded', 'Escrow Released'].includes(inq.status || '') || ['Paid', 'Escrow Funded', 'Escrow Released'].includes(inq.paymentStatus || '')) {
          acceptedOrPaidCount++;
          if (inq.targetBudget) {
             totalRevenue += parseFloat(inq.targetBudget.toString());
          }
       }
    });
    
    const conversionRate = totalInquiriesCount > 0 ? (acceptedOrPaidCount / totalInquiriesCount) * 100 : 0;
    
    let negotiatingCount = 0;
    myInquiries.forEach(inq => {
       if (inq.status === 'Under Negotiation' || inq.status === 'Pending') negotiatingCount++;
    });
    
    const funnelData = [
       { name: 'Initiated', value: totalInquiriesCount, fill: '#6366f1' },
       { name: 'Negotiating', value: negotiatingCount, fill: '#f59e0b' },
       { name: 'Accepted', value: acceptedOrPaidCount, fill: '#10b981' }
    ];
    
    const now = new Date();
    const week1Start = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
    const week2Start = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000);
    const week3Start = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const week4Start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const w1 = myInquiries.filter(i => i.createdAt >= week1Start && i.createdAt < week2Start).length;
    const w2 = myInquiries.filter(i => i.createdAt >= week2Start && i.createdAt < week3Start).length;
    const w3 = myInquiries.filter(i => i.createdAt >= week3Start && i.createdAt < week4Start).length;
    const w4 = myInquiries.filter(i => i.createdAt >= week4Start).length;

    const lineChartData = [
       { name: 'Week 1', views: Math.floor(Math.random() * 10 + w1 * 2), inquiries: w1 },
       { name: 'Week 2', views: Math.floor(Math.random() * 10 + w2 * 2), inquiries: w2 },
       { name: 'Week 3', views: Math.floor(Math.random() * 10 + w3 * 2), inquiries: w3 },
       { name: 'Week 4', views: Math.floor(Math.random() * 10 + w4 * 2), inquiries: w4 },
    ];

    const allProductsData = await db.select({
       id: products.id,
       categoryId: products.categoryId,
       unitCost: products.unitCost,
       stockQuantity: products.stockQuantity
    }).from(products).where(eq(products.sellerId, teamOwnerId));

    const categoriesData = await db.select().from(categories);
    const categoryMap = new Map();
    categoriesData.forEach(c => categoryMap.set(c.id, c.name));

    const revByCategory = new Map();
    allProductsData.forEach(p => {
       const catName = p.categoryId ? categoryMap.get(p.categoryId) || 'Unknown' : 'Unknown';
       const val = parseFloat(p.unitCost || '0') * parseInt(String(p.stockQuantity || 0));
       revByCategory.set(catName, (revByCategory.get(catName) || 0) + val);
    });

    const barChartData = Array.from(revByCategory.entries()).map(([name, revenue]) => ({ name, revenue }));

    res.json({
       totalRevenue,
       profileViews: w1 + w2 + w3 + w4 + 10,
       conversionRate,
       lineChartData,
       barChartData,
       funnelData
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get(["/seller/products", "/api/seller/products", "/api-v2/seller/products"], requireAuth, requireSeller, async (req: AuthRequest, res) => {
  try {
    const userProfile = await getUserProfile(req.user!.uid);
    const teamOwnerId = userProfile.teamOwnerId || userProfile.id;
    const myProducts = await db.select({
        id: products.id,
        sellerId: products.sellerId,
        categoryId: products.categoryId,
        title: products.title,
        brand: products.brand,
        description: products.description,
        specifications: products.specifications,
        moq: products.moq,
        stockQuantity: products.stockQuantity,
        unitCost: products.unitCost,
        tieredPricing: products.tieredPricing,
        originType: products.originType,
        leadTimeDays: products.leadTimeDays,
        shippingOptions: products.shippingOptions,
        approvalStatus: products.approvalStatus,
        images: products.images,
        createdAt: products.createdAt
    }).from(products).where(eq(products.sellerId, teamOwnerId)).orderBy(desc(products.createdAt));
    res.json(myProducts);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post(["/seller/products", "/api/seller/products", "/api-v2/seller/products"], requireAuth, requireSeller, async (req: AuthRequest, res) => {
  try {
    const userProfile = await getUserProfile(req.user!.uid);
    const teamOwnerId = userProfile.teamOwnerId || userProfile.id;
    
    const { title, description, originType, moq, offersOem, oemMoq, tieredPricing, leadTimeDays, shippingOptions, certifications, images, stockQuantity, unitCost, categoryId, productType, gradingCompany, grade, certNumber, cardYear, cardSet, cardNumber, cardVariant } = req.body;
    const embedding = await generateEmbedding(`${title} ${description} ${originType || 'Direct Factory'}`);
    
    const parsedMoq = parseInt(moq, 10);
    const parsedLeadTime = parseInt(leadTimeDays, 10);
    const parsedStock = parseInt(stockQuantity, 10);
    const parsedCost = parseFloat(unitCost);
    const parsedYear = parseInt(cardYear, 10);

    const [newProduct] = await db.insert(products).values({
      sellerId: teamOwnerId,
      title,
      description,
      moq: isNaN(parsedMoq) ? 1 : parsedMoq,
      offersOem: !!offersOem,
      oemMoq: parseInt(oemMoq) || null,
      tieredPricing: tieredPricing || null,
      originType: originType || 'Direct Factory',
      leadTimeDays: isNaN(parsedLeadTime) ? 7 : parsedLeadTime,
      shippingOptions: shippingOptions || [],
      certifications: certifications || [],
      images: images || [],
      stockQuantity: isNaN(parsedStock) ? 0 : parsedStock,
      unitCost: isNaN(parsedCost) ? "0" : parsedCost.toString(),
      categoryId: categoryId || null,
      approvalStatus: userProfile.role === "admin" ? "approved" : "pending",
      productType: productType || 'sealed',
      gradingCompany: gradingCompany || null,
      grade: grade || null,
      certNumber: certNumber || null,
      cardYear: isNaN(parsedYear) ? null : parsedYear.toString(),
      cardSet: cardSet || null,
      cardNumber: cardNumber || null,
      cardVariant: cardVariant || null,
    }).returning();
    
    res.json(newProduct);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post(["/seller/products/bulk", "/api/seller/products/bulk", "/api-v2/seller/products/bulk"], requireAuth, requireSeller, async (req: AuthRequest, res) => {
  try {
    const userProfile = await getUserProfile(req.user!.uid);
    const teamOwnerId = userProfile.teamOwnerId || userProfile.id;
    const { products: newProducts } = req.body;

    if (!Array.isArray(newProducts)) return res.status(400).json({ error: "Expected an array of products" });

    const insertData = await Promise.all(newProducts.map(async (p: any) => {
      const { title, description, originType, moq, tieredPricing, leadTimeDays, shippingOptions, certifications, images, stockQuantity, unitCost, categoryId, productType, gradingCompany, grade, certNumber, cardYear, cardSet, cardNumber, cardVariant } = p;
      const embedding = await generateEmbedding(`${title} ${description} ${originType || 'Direct Factory'}`);
      
      const parsedMoq = parseInt(moq, 10);
      const parsedLeadTime = parseInt(leadTimeDays, 10);
      const parsedStock = parseInt(stockQuantity, 10);
      const parsedCost = parseFloat(unitCost);
      const parsedYear = parseInt(cardYear, 10);

      return {
          sellerId: teamOwnerId,
        title,
        description,
        moq: isNaN(parsedMoq) ? 1 : parsedMoq,
        tieredPricing: tieredPricing || null,
        originType: originType || 'Direct Factory',
        leadTimeDays: isNaN(parsedLeadTime) ? 7 : parsedLeadTime,
        shippingOptions: shippingOptions || [],
        certifications: certifications || [],
        images: images || [],
        stockQuantity: isNaN(parsedStock) ? 0 : parsedStock,
        unitCost: isNaN(parsedCost) ? "0" : parsedCost.toString(),
        categoryId: categoryId || null,
      approvalStatus: userProfile.role === "admin" ? "approved" : "pending",
        productType: productType || 'sealed',
        gradingCompany: gradingCompany || null,
        grade: grade || null,
        certNumber: certNumber || null,
        cardYear: isNaN(parsedYear) ? null : parsedYear.toString(),
        cardSet: cardSet || null,
        cardNumber: cardNumber || null,
        cardVariant: cardVariant || null,
      };
    }));
    
    const result = await db.insert(products).values(insertData).returning();
    res.json(result);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.patch(["/seller/products/:id", "/api/seller/products/:id", "/api-v2/seller/products/:id"], requireAuth, requireSeller, async (req: AuthRequest, res) => {
  try {
    const userProfile = await getUserProfile(req.user!.uid);
    const productId = parseInt(req.params.id, 10);
    
    const existing = await db.select().from(products).where(and(eq(products.id, productId), eq(products.sellerId, userProfile.teamOwnerId || userProfile.id)));
    if (!existing.length) return res.status(403).json({ error: "Not authorized" });

    const { title, description, moq, offersOem, oemMoq, originType, leadTimeDays, shippingOptions, images, tieredPricing, stockQuantity, unitCost, categoryId, certifications, productType, gradingCompany, grade, certNumber, cardYear, cardSet, cardNumber, cardVariant } = req.body;
    const embedding = await generateEmbedding(`${title} ${description} ${originType}`);
    await db.update(products).set({
      title, description, moq, offersOem: !!offersOem, oemMoq: parseInt(oemMoq) || null, originType, leadTimeDays, shippingOptions, images, tieredPricing, stockQuantity, unitCost, categoryId, certifications, productType, gradingCompany, grade, certNumber, cardYear, cardSet, cardNumber, cardVariant,
    }).where(eq(products.id, productId));
    
    res.json({ success: true });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.delete(["/seller/products/:id", "/api/seller/products/:id", "/api-v2/seller/products/:id"], requireAuth, requireSeller, async (req: AuthRequest, res) => {
  try {
    const userProfile = await getUserProfile(req.user!.uid);
    const productId = parseInt(req.params.id, 10);
    
    const existing = await db.select().from(products).where(and(eq(products.id, productId), eq(products.sellerId, userProfile.teamOwnerId || userProfile.id)));
    if (!existing.length) return res.status(403).json({ error: "Not authorized" });

    await db.delete(inquiries).where(eq(inquiries.targetProductId, productId));
    await db.delete(products).where(eq(products.id, productId));
    
    return res.json({ success: true });
  } catch (err: any) {
    console.error(err);
    if (!res.headersSent) {
      return res.status(500).json({ error: err.message });
    }
  }
});

export default router;
