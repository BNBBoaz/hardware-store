// Report Controller
// These endpoints power the owner dashboard and reports section.
// All figures are calculated from real transaction data.

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// ── DASHBOARD SUMMARY ─────────────────────────
// GET /api/reports/dashboard
// The first thing the owner sees when they log in.
// Priority order agreed in requirements:
// 1. Today's total sales
// 2. Low stock alerts
// 3. Unpaid customer balances
// 4. Supplier payments due
// 5. Profit summary
export const getDashboard = async (req, res) => {
  try {
    const businessId = req.user.businessId;

    // Date range for today
    const today     = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay   = new Date(today.setHours(23, 59, 59, 999));

    // Run all queries in parallel for speed
    const [
      todaySales,
      lowStockItems,
      outstandingCustomers,
      suppliersOwed,
      allTimeSales,
    ] = await Promise.all([

      // 1. Today's sales
      prisma.sale.findMany({
        where: {
          branch:    { businessId },
          status:    'COMPLETED',
          createdAt: { gte: startOfDay, lte: endOfDay },
        },
        include: { payments: true },
      }),

      // 2. Low stock — products at or below reorder level
      prisma.inventory.findMany({
        where: {
          branch:  { businessId },
          product: { isActive: true },
        },
        include: {
          product: { select: { name: true, sku: true, unit: true } },
          branch:  { select: { name: true } },
        },
      }),

      // 3. Customers with outstanding credit balances
      prisma.customer.findMany({
        where: {
          businessId,
          creditBalance: { gt: 0 },
        },
        orderBy: { creditBalance: 'desc' },
        take: 5, // top 5 debtors
        select: {
          id:            true,
          name:          true,
          phone:         true,
          creditBalance: true,
          creditLimit:   true,
        },
      }),

      // 4. Suppliers we owe money to
      prisma.supplier.findMany({
        where: {
          businessId,
          balanceOwed: { gt: 0 },
        },
        orderBy: { balanceOwed: 'desc' },
        take: 5,
        select: {
          id:          true,
          name:        true,
          balanceOwed: true,
        },
      }),

      // 5. All time sales for profit calculation
      prisma.sale.findMany({
        where: {
          branch: { businessId },
          status: 'COMPLETED',
        },
        include: {
          saleItems: {
            include: {
              product: { select: { buyingPrice: true } }
            }
          },
        },
      }),
    ]);

    // Calculate today's totals
    const todayRevenue  = todaySales.reduce((sum, s) => sum + parseFloat(s.total), 0);
    const todayVAT      = todaySales.reduce((sum, s) => sum + parseFloat(s.vatAmount), 0);
    const todayPayments = {
      CASH:          0,
      MPESA:         0,
      BANK_TRANSFER: 0,
      CHEQUE:        0,
      CREDIT:        0,
    };
    todaySales.forEach(sale => {
      sale.payments.forEach(p => {
        todayPayments[p.method] += parseFloat(p.amount);
      });
    });

    // Filter genuinely low stock items
    const lowStock = lowStockItems.filter(inv =>
      parseFloat(inv.quantity) <= parseFloat(inv.reorderLevel)
    );

    // Calculate all-time profit
    // Profit = selling price - buying price per item sold
    let totalRevenue = 0;
    let totalCOGS    = 0; // Cost of Goods Sold
    allTimeSales.forEach(sale => {
      totalRevenue += parseFloat(sale.total);
      sale.saleItems.forEach(item => {
        totalCOGS += parseFloat(item.product.buyingPrice) * parseFloat(item.quantity);
      });
    });
    const grossProfit = totalRevenue - totalCOGS;

    res.json({
      today: {
        salesCount: todaySales.length,
        revenue:    todayRevenue,
        vat:        todayVAT,
        payments:   todayPayments,
      },
      lowStock: {
        count: lowStock.length,
        items: lowStock,
      },
      outstandingCustomers: {
        count: outstandingCustomers.length,
        total: outstandingCustomers.reduce((sum, c) => sum + parseFloat(c.creditBalance), 0),
        customers: outstandingCustomers,
      },
      suppliersOwed: {
        count: suppliersOwed.length,
        total: suppliersOwed.reduce((sum, s) => sum + parseFloat(s.balanceOwed), 0),
        suppliers: suppliersOwed,
      },
      profitSummary: {
        totalRevenue,
        totalCOGS,
        grossProfit,
        margin: totalRevenue > 0
          ? ((grossProfit / totalRevenue) * 100).toFixed(2)
          : 0,
      },
    });

  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to load dashboard', message: error.message });
  }
};

// ── SALES REPORT ──────────────────────────────
// GET /api/reports/sales
// Filterable by date range and branch
export const getSalesReport = async (req, res) => {
  try {
    const { from, to, branchId } = req.query;

    const where = {
      branch: { businessId: req.user.businessId },
      status: 'COMPLETED',
      ...((from || to) && {
        createdAt: {
          ...(from && { gte: new Date(from) }),
          ...(to   && { lte: new Date(to)   }),
        }
      }),
      ...(branchId && { branchId }),
    };

    const sales = await prisma.sale.findMany({
      where,
      include: {
        saleItems: {
          include: {
            product: {
              select: { name: true, sku: true, buyingPrice: true }
            }
          }
        },
        payments: true,
        cashier:  { select: { name: true } },
        branch:   { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate report totals
    let totalRevenue  = 0;
    let totalCOGS     = 0;
    let totalVAT      = 0;
    let totalDiscount = 0;

    sales.forEach(sale => {
      totalRevenue  += parseFloat(sale.total);
      totalVAT      += parseFloat(sale.vatAmount);
      totalDiscount += parseFloat(sale.discount);
      sale.saleItems.forEach(item => {
        totalCOGS += parseFloat(item.product.buyingPrice) * parseFloat(item.quantity);
      });
    });

    res.json({
      summary: {
        totalSales:    sales.length,
        totalRevenue,
        totalCOGS,
        grossProfit:   totalRevenue - totalCOGS,
        totalVAT,
        totalDiscount,
      },
      sales,
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to generate sales report', message: error.message });
  }
};

// ── STOCK VALUATION REPORT ────────────────────
// GET /api/reports/stock
// What is our current stock worth at buying price
export const getStockReport = async (req, res) => {
  try {
    const { branchId } = req.query;

    const inventory = await prisma.inventory.findMany({
      where: {
        branch:  { businessId: req.user.businessId },
        product: { isActive: true },
        ...(branchId && { branchId }),
      },
      include: {
        product: {
          include: {
            category: { select: { name: true } }
          }
        },
        branch: { select: { name: true } },
      },
      orderBy: { product: { name: 'asc' } },
    });

    // Calculate stock value
    const items = inventory.map(inv => ({
      product:      inv.product.name,
      sku:          inv.product.sku,
      category:     inv.product.category?.name || 'Uncategorized',
      branch:       inv.branch.name,
      unit:         inv.product.unit,
      quantity:     parseFloat(inv.quantity),
      reorderLevel: parseFloat(inv.reorderLevel),
      buyingPrice:  parseFloat(inv.product.buyingPrice),
      sellingPrice: parseFloat(inv.product.sellingPrice),
      // Total value at buying price
      stockValue:   parseFloat(inv.quantity) * parseFloat(inv.product.buyingPrice),
      // Is this item low on stock?
      isLowStock:   parseFloat(inv.quantity) <= parseFloat(inv.reorderLevel),
    }));

    const totalStockValue = items.reduce((sum, i) => sum + i.stockValue, 0);
    const lowStockCount   = items.filter(i => i.isLowStock).length;

    res.json({
      summary: {
        totalProducts:  items.length,
        totalStockValue,
        lowStockCount,
      },
      items,
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to generate stock report', message: error.message });
  }
};

// ── BEST SELLING PRODUCTS ─────────────────────
// GET /api/reports/best-sellers
export const getBestSellers = async (req, res) => {
  try {
    const { from, to, limit } = req.query;

    // Aggregate sales by product
    const bestSellers = await prisma.saleItem.groupBy({
      by: ['productId'],
      where: {
        sale: {
          branch: { businessId: req.user.businessId },
          status: 'COMPLETED',
          ...((from || to) && {
            createdAt: {
              ...(from && { gte: new Date(from) }),
              ...(to   && { lte: new Date(to)   }),
            }
          }),
        },
      },
      _sum: {
        quantity: true,
        total:    true,
      },
      orderBy: {
        _sum: { total: 'desc' },
      },
      take: parseInt(limit || 10),
    });

    // Fetch product details for each result
    const results = await Promise.all(
      bestSellers.map(async (item) => {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
          select: {
            name:     true,
            sku:      true,
            unit:     true,
            category: { select: { name: true } },
          },
        });
        return {
          product,
          totalQuantitySold: parseFloat(item._sum.quantity),
          totalRevenue:      parseFloat(item._sum.total),
        };
      })
    );

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch best sellers', message: error.message });
  }
};