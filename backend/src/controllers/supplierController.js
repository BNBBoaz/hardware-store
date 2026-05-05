// Supplier Controller
// Suppliers are the companies we buy stock from.
// We track what we order, what arrives, and what we owe them.

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// ── GET ALL SUPPLIERS ─────────────────────────
// GET /api/suppliers
export const getSuppliers = async (req, res) => {
  try {
    const { search } = req.query;

    const suppliers = await prisma.supplier.findMany({
      where: {
        businessId: req.user.businessId,
        ...(search && {
          OR: [
            { name:  { contains: search, mode: 'insensitive' } },
            { phone: { contains: search } },
          ]
        }),
      },
      orderBy: { name: 'asc' },
    });

    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch suppliers', message: error.message });
  }
};

// ── CREATE SUPPLIER ───────────────────────────
// POST /api/suppliers
export const createSupplier = async (req, res) => {
  try {
    const { name, contactPerson, phone, email } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Supplier name is required' });
    }

    const supplier = await prisma.supplier.create({
      data: {
        businessId:    req.user.businessId,
        name,
        contactPerson: contactPerson || null,
        phone:         phone         || null,
        email:         email         || null,
        balanceOwed:   0,
      },
    });

    res.status(201).json(supplier);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create supplier', message: error.message });
  }
};

// ── UPDATE SUPPLIER ───────────────────────────
// PUT /api/suppliers/:id
export const updateSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, contactPerson, phone, email } = req.body;

    const existing = await prisma.supplier.findFirst({
      where: { id, businessId: req.user.businessId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        ...(name          && { name }),
        ...(contactPerson !== undefined && { contactPerson }),
        ...(phone         !== undefined && { phone }),
        ...(email         !== undefined && { email }),
      },
    });

    res.json(supplier);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update supplier', message: error.message });
  }
};

// ── CREATE PURCHASE ORDER ─────────────────────
// POST /api/suppliers/:id/orders
// An LPO — we are ordering stock from a supplier.
export const createPurchaseOrder = async (req, res) => {
  try {
    const { id: supplierId } = req.params;
    const { branchId, items, expectedDate, notes } = req.body;

    if (!branchId || !items || items.length === 0) {
      return res.status(400).json({
        error: 'branchId and at least one item are required'
      });
    }

    // Verify supplier belongs to this business
    const supplier = await prisma.supplier.findFirst({
      where: { id: supplierId, businessId: req.user.businessId },
    });

    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    // Calculate total order value
    const totalAmount = items.reduce((sum, item) => {
      return sum + (parseFloat(item.unitCost) * parseFloat(item.qtyOrdered));
    }, 0);

    const order = await prisma.purchaseOrder.create({
      data: {
        branchId,
        supplierId,
        createdById:  req.user.userId,
        status:       'DRAFT',
        totalAmount,
        expectedDate: expectedDate ? new Date(expectedDate) : null,
        notes:        notes || null,
        // Create all line items together
        items: {
          create: items.map(item => ({
            productId:   item.productId,
            qtyOrdered:  parseFloat(item.qtyOrdered),
            qtyReceived: 0,
            unitCost:    parseFloat(item.unitCost),
          })),
        },
      },
      include: {
        items: {
          include: {
            product: { select: { name: true, sku: true, unit: true } }
          }
        },
        supplier: { select: { name: true } },
        branch:   { select: { name: true } },
      },
    });

    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create purchase order', message: error.message });
  }
};

// ── RECEIVE STOCK FROM SUPPLIER ───────────────
// PUT /api/suppliers/orders/:orderId/receive
// When goods arrive, storekeeper records what was received.
// Stock is added to inventory automatically.
export const receiveStock = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { items } = req.body;
    // items = [{ poItemId, qtyReceived }]

    const order = await prisma.purchaseOrder.findFirst({
      where: {
        id:       orderId,
        supplier: { businessId: req.user.businessId },
      },
      include: { items: true },
    });

    if (!order) {
      return res.status(404).json({ error: 'Purchase order not found' });
    }

    if (order.status === 'FULLY_RECEIVED') {
      return res.status(400).json({ error: 'This order has already been fully received' });
    }

    const result = await prisma.$transaction(async (tx) => {
      let allReceived = true;

      for (const receivedItem of items) {
        const poItem = order.items.find(i => i.id === receivedItem.poItemId);
        if (!poItem) continue;

        const newQtyReceived = parseFloat(poItem.qtyReceived) + parseFloat(receivedItem.qtyReceived);

        // Update received quantity on the PO line item
        await tx.purchaseOrderItem.update({
          where: { id: poItem.id },
          data:  { qtyReceived: newQtyReceived },
        });

        // Check if all items are fully received
        if (newQtyReceived < parseFloat(poItem.qtyOrdered)) {
          allReceived = false;
        }

        // Find inventory record for this product at this branch
        const inventory = await tx.inventory.findFirst({
          where: {
            productId: poItem.productId,
            branchId:  order.branchId,
          },
        });

        if (inventory) {
          // Add received stock to inventory
          await tx.inventory.update({
            where: { id: inventory.id },
            data:  { quantity: { increment: parseFloat(receivedItem.qtyReceived) } },
          });

          // Log the stock movement
          await tx.stockMovement.create({
            data: {
              inventoryId: inventory.id,
              userId:      req.user.userId,
              quantity:    parseFloat(receivedItem.qtyReceived),
              type:        'DELIVERY',
              referenceId: orderId,
              reason:      `Stock received from supplier — PO ${orderId}`,
            },
          });
        }
      }

      // Update order status
      const updatedOrder = await tx.purchaseOrder.update({
        where: { id: orderId },
        data: {
          status: allReceived ? 'FULLY_RECEIVED' : 'PARTIALLY_RECEIVED',
        },
      });

      // Increase what we owe the supplier
      await tx.supplier.update({
        where: { id: order.supplierId },
        data:  { balanceOwed: { increment: parseFloat(order.totalAmount) } },
      });

      return updatedOrder;
    });

    res.json({
      message: 'Stock received successfully',
      order:   result,
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to receive stock', message: error.message });
  }
};

// ── PAY SUPPLIER ──────────────────────────────
// POST /api/suppliers/:id/payments
export const paySupplier = async (req, res) => {
  try {
    const { id: supplierId } = req.params;
    const { amount, method, reference } = req.body;

    if (!amount || !method) {
      return res.status(400).json({ error: 'Amount and method are required' });
    }

    const supplier = await prisma.supplier.findFirst({
      where: { id: supplierId, businessId: req.user.businessId },
    });

    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.supplierPayment.create({
        data: {
          supplierId,
          paidById:  req.user.userId,
          amount:    parseFloat(amount),
          method,
          reference: reference || null,
        },
      });

      // Reduce what we owe the supplier
      const updated = await tx.supplier.update({
        where: { id: supplierId },
        data:  { balanceOwed: { decrement: parseFloat(amount) } },
      });

      return { payment, supplier: updated };
    });

    res.status(201).json({
      message:         'Payment recorded successfully',
      payment:         result.payment,
      supplier:        result.supplier,
      remainingBalance: parseFloat(result.supplier.balanceOwed),
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to record payment', message: error.message });
  }
};

// ── GET PURCHASE ORDERS ───────────────────────
// GET /api/suppliers/orders
export const getPurchaseOrders = async (req, res) => {
  try {
    const orders = await prisma.purchaseOrder.findMany({
      where: {
        supplier: { businessId: req.user.businessId },
      },
      include: {
        items: {
          include: {
            product: { select: { name: true, sku: true } }
          }
        },
        supplier: { select: { name: true } },
        branch:   { select: { name: true } },
      },
      orderBy: { orderDate: 'desc' },
    });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch orders', message: error.message });
  }
};