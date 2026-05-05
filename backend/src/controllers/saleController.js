// Sale Controller
// This is the most important controller in the system.
// Every sale goes through here.
// When a sale completes, three things happen automatically:
//   1. Stock is deducted from inventory per branch
//   2. A stock movement is logged (who sold what, when)
//   3. A payment record is created

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// ── CREATE SALE ───────────────────────────────
// POST /api/sales
// The cashier sends a cart of items + payment info.
// We validate stock, calculate totals, and complete the sale.
export const createSale = async (req, res) => {
  try {
    const {
      branchId,
      customerId,  // optional — walk-in customers don't need an account
      items,       // array of { productId, quantity, discount }
      payments,    // array of { method, amount, reference }
      discount,    // optional cart-level discount
    } = req.body;

    // Validate required fields
    if (!branchId || !items || items.length === 0) {
      return res.status(400).json({
        error: 'branchId and at least one item are required'
      });
    }

    if (!payments || payments.length === 0) {
      return res.status(400).json({
        error: 'At least one payment method is required'
      });
    }

    // ── Step 1: Validate all items and check stock ──
    // Do this BEFORE the transaction so we catch errors early
    const saleItems = [];

    for (const item of items) {
      // Find the product and its inventory at this branch
      const inventory = await prisma.inventory.findFirst({
        where: {
          productId: item.productId,
          branchId:  branchId,
        },
        include: {
          product: true,
        },
      });

      // Product not found at this branch
      if (!inventory) {
        return res.status(404).json({
          error: `Product not found at this branch: ${item.productId}`
        });
      }

      // Product is deactivated
      if (!inventory.product.isActive) {
        return res.status(400).json({
          error: `Product is not active: ${inventory.product.name}`
        });
      }

      // Check stock — cannot sell what you don't have
      if (parseFloat(inventory.quantity) < parseFloat(item.quantity)) {
        return res.status(400).json({
          error: `Insufficient stock for ${inventory.product.name}. Available: ${inventory.quantity}, Requested: ${item.quantity}`
        });
      }

      // Calculate line item total
      const unitPrice   = parseFloat(inventory.product.sellingPrice);
      const quantity    = parseFloat(item.quantity);
      const itemDiscount = parseFloat(item.discount || 0);
      const itemTotal   = (unitPrice * quantity) - itemDiscount;

      saleItems.push({
        productId:   item.productId,
        inventoryId: inventory.id,  // needed for stock movement
        quantity,
        unitPrice,
        discount:    itemDiscount,
        total:       itemTotal,
        vatRate:     parseFloat(inventory.product.vatRate),
      });
    }

    // ── Step 2: Calculate sale totals ──────────────
    const cartDiscount = parseFloat(discount || 0);
    const subtotal     = saleItems.reduce((sum, i) => sum + i.total, 0) - cartDiscount;

    // Calculate VAT on top of subtotal (16%)
    // VAT is calculated per item based on its vatRate
    const vatAmount = saleItems.reduce((sum, i) => {
      return sum + (i.total * (i.vatRate / 100));
    }, 0);

    const total = subtotal + vatAmount;

    // ── Step 3: Validate payment total ─────────────
    const paymentTotal = payments.reduce(
      (sum, p) => sum + parseFloat(p.amount), 0
    );

    // Payment must cover the full total
    // (credit payments are handled as a payment method,
    //  not as a shortfall in the total)
    if (Math.abs(paymentTotal - total) > 0.01) {
      return res.status(400).json({
        error: `Payment total (${paymentTotal}) does not match sale total (${total.toFixed(2)})`
      });
    }

    // ── Step 4: Create everything in a transaction ──
    const result = await prisma.$transaction(async (tx) => {

      // Create the sale record
      const sale = await tx.sale.create({
        data: {
          branchId,
          cashierId:  req.user.userId,
          customerId: customerId || null,
          subtotal,
          vatAmount,
          discount:   cartDiscount,
          total,
          status:     'COMPLETED',
        },
      });

      // Create sale line items
      await Promise.all(
        saleItems.map(item =>
          tx.saleItem.create({
            data: {
              saleId:    sale.id,
              productId: item.productId,
              quantity:  item.quantity,
              unitPrice: item.unitPrice,
              discount:  item.discount,
              total:     item.total,
            },
          })
        )
      );

      // Deduct stock and log movement for each item
      await Promise.all(
        saleItems.map(async (item) => {
          // Deduct stock from inventory
          await tx.inventory.update({
            where: { id: item.inventoryId },
            data: {
              quantity: {
                // Prisma's decrement — safe atomic operation
                decrement: item.quantity,
              },
            },
          });

          // Log the stock movement — this is the audit trail
          await tx.stockMovement.create({
            data: {
              inventoryId: item.inventoryId,
              userId:      req.user.userId,
              // Negative quantity = stock going OUT
              quantity:    -item.quantity,
              type:        'SALE',
              referenceId: sale.id,
              reason:      `Sale ${sale.id}`,
            },
          });
        })
      );

      // Record payments
      await Promise.all(
        payments.map(payment =>
          tx.payment.create({
            data: {
              saleId:      sale.id,
              customerId:  customerId || null,
              receivedById: req.user.userId,
              amount:      parseFloat(payment.amount),
              method:      payment.method,
              reference:   payment.reference || null,
            },
          })
        )
      );

      // If customer paid on credit, increase their credit balance
      if (customerId) {
        const creditPayment = payments.find(p => p.method === 'CREDIT');
        if (creditPayment) {
          await tx.customer.update({
            where: { id: customerId },
            data: {
              creditBalance: {
                increment: parseFloat(creditPayment.amount),
              },
            },
          });
        }
      }

      return sale;
    });

    // Fetch complete sale to return
    const sale = await prisma.sale.findUnique({
      where: { id: result.id },
      include: {
        saleItems: {
          include: {
            product: { select: { name: true, sku: true, unit: true } }
          }
        },
        payments:  true,
        cashier:   { select: { name: true } },
        customer:  { select: { name: true, phone: true } },
        branch:    { select: { name: true } },
      },
    });

    res.status(201).json(sale);

  } catch (error) {
    console.error('Sale error:', error);
    res.status(500).json({ error: 'Failed to create sale', message: error.message });
  }
};

// ── GET ALL SALES ─────────────────────────────
// GET /api/sales
// Returns sales for this business, newest first.
export const getSales = async (req, res) => {
  try {
    const { branchId, from, to, cashierId } = req.query;

    const where = {
      branch: { businessId: req.user.businessId },
      ...(branchId && { branchId }),
      ...(cashierId && { cashierId }),
      ...(from || to) && {
        createdAt: {
          ...(from && { gte: new Date(from) }),
          ...(to   && { lte: new Date(to)   }),
        }
      },
    };

    const sales = await prisma.sale.findMany({
      where,
      include: {
        saleItems: {
          include: {
            product: { select: { name: true, sku: true } }
          }
        },
        payments: true,
        cashier:  { select: { name: true } },
        customer: { select: { name: true, phone: true } },
        branch:   { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(sales);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sales', message: error.message });
  }
};

// ── GET SINGLE SALE ───────────────────────────
// GET /api/sales/:id
export const getSale = async (req, res) => {
  try {
    const sale = await prisma.sale.findFirst({
      where: {
        id:     req.params.id,
        branch: { businessId: req.user.businessId },
      },
      include: {
        saleItems: {
          include: {
            product: { select: { name: true, sku: true, unit: true } }
          }
        },
        payments: true,
        cashier:  { select: { id: true, name: true } },
        customer: { select: { id: true, name: true, phone: true } },
        branch:   { select: { id: true, name: true } },
      },
    });

    if (!sale) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    res.json(sale);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sale', message: error.message });
  }
};

// ── GET DAILY SUMMARY ─────────────────────────
// GET /api/sales/summary
// Returns today's totals — this powers the owner dashboard.
export const getDailySummary = async (req, res) => {
  try {
    const { branchId, date } = req.query;

    // Default to today if no date provided
    const targetDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay   = new Date(targetDate.setHours(23, 59, 59, 999));

    const where = {
      branch:    { businessId: req.user.businessId },
      status:    'COMPLETED',
      createdAt: { gte: startOfDay, lte: endOfDay },
      ...(branchId && { branchId }),
    };

    // Get all completed sales for the day
    const sales = await prisma.sale.findMany({
      where,
      include: { payments: true },
    });

    // Calculate summary totals
    const summary = {
      totalSales:      sales.length,
      totalRevenue:    sales.reduce((sum, s) => sum + parseFloat(s.total), 0),
      totalVAT:        sales.reduce((sum, s) => sum + parseFloat(s.vatAmount), 0),
      totalDiscount:   sales.reduce((sum, s) => sum + parseFloat(s.discount), 0),
      // Break down by payment method
      paymentBreakdown: {
        CASH:          0,
        MPESA:         0,
        BANK_TRANSFER: 0,
        CHEQUE:        0,
        CREDIT:        0,
      },
    };

    // Sum up each payment method
    sales.forEach(sale => {
      sale.payments.forEach(payment => {
        summary.paymentBreakdown[payment.method] += parseFloat(payment.amount);
      });
    });

    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch summary', message: error.message });
  }
};