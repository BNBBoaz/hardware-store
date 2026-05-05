// Customer Controller
// Customers can walk in (no account needed) or have
// a named account with a credit limit.
// Credit customers can buy now and pay later.

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// ── GET ALL CUSTOMERS ─────────────────────────
// GET /api/customers
export const getCustomers = async (req, res) => {
  try {
    const { search } = req.query;

    const customers = await prisma.customer.findMany({
      where: {
        businessId: req.user.businessId,
        // Search by name or phone number
        ...(search && {
          OR: [
            { name:  { contains: search, mode: 'insensitive' } },
            { phone: { contains: search } },
          ]
        }),
      },
      orderBy: { name: 'asc' },
    });

    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch customers', message: error.message });
  }
};

// ── GET SINGLE CUSTOMER ───────────────────────
// GET /api/customers/:id
// Returns customer with their full sales and payment history
export const getCustomer = async (req, res) => {
  try {
    const customer = await prisma.customer.findFirst({
      where: {
        id:         req.params.id,
        businessId: req.user.businessId,
      },
      include: {
        // Last 10 sales for this customer
        sales: {
          orderBy: { createdAt: 'desc' },
          take:    10,
          include: {
            saleItems: {
              include: {
                product: { select: { name: true, sku: true } }
              }
            },
            payments: true,
          },
        },
        // All payments made by this customer
        payments: {
          orderBy: { createdAt: 'desc' },
          take:    10,
        },
      },
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch customer', message: error.message });
  }
};

// ── CREATE CUSTOMER ───────────────────────────
// POST /api/customers
export const createCustomer = async (req, res) => {
  try {
    const { name, phone, email, creditLimit } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Customer name is required' });
    }

    const customer = await prisma.customer.create({
      data: {
        businessId:   req.user.businessId,
        name,
        phone:        phone  || null,
        email:        email  || null,
        // Credit limit defaults to 0 — no credit until owner sets it
        creditLimit:  parseFloat(creditLimit || 0),
        creditBalance: 0,
      },
    });

    res.status(201).json(customer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create customer', message: error.message });
  }
};

// ── UPDATE CUSTOMER ───────────────────────────
// PUT /api/customers/:id
export const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, email, creditLimit } = req.body;

    const existing = await prisma.customer.findFirst({
      where: { id, businessId: req.user.businessId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const customer = await prisma.customer.update({
      where: { id },
      data: {
        ...(name        && { name }),
        ...(phone       !== undefined && { phone }),
        ...(email       !== undefined && { email }),
        ...(creditLimit !== undefined && { creditLimit: parseFloat(creditLimit) }),
      },
    });

    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update customer', message: error.message });
  }
};

// ── RECORD CREDIT PAYMENT ─────────────────────
// POST /api/customers/:id/payments
// When a credit customer comes to pay their balance.
// This is separate from a sale payment —
// the customer owes money from a previous credit sale.
export const recordCreditPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, method, reference } = req.body;

    if (!amount || !method) {
      return res.status(400).json({ error: 'Amount and method are required' });
    }

    const customer = await prisma.customer.findFirst({
      where: { id, businessId: req.user.businessId },
    });

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const paymentAmount = parseFloat(amount);

    // Cannot pay more than what is owed
    if (paymentAmount > parseFloat(customer.creditBalance)) {
      return res.status(400).json({
        error: `Payment amount (${paymentAmount}) exceeds outstanding balance (${customer.creditBalance})`
      });
    }

    // Record payment and reduce credit balance in one transaction
    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          customerId:   id,
          receivedById: req.user.userId,
          amount:       paymentAmount,
          method,
          reference:    reference || null,
        },
      });

      // Reduce the customer's outstanding balance
      const updated = await tx.customer.update({
        where: { id },
        data: {
          creditBalance: { decrement: paymentAmount },
        },
      });

      return { payment, customer: updated };
    });

    res.status(201).json({
      message:        'Payment recorded successfully',
      payment:        result.payment,
      customer:       result.customer,
      remainingBalance: parseFloat(result.customer.creditBalance),
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to record payment', message: error.message });
  }
};

// ── GET CUSTOMERS WITH OUTSTANDING BALANCES ───
// GET /api/customers/outstanding
// Powers the dashboard alert — who owes us money
export const getOutstandingBalances = async (req, res) => {
  try {
    const customers = await prisma.customer.findMany({
      where: {
        businessId:    req.user.businessId,
        // Only customers who owe money
        creditBalance: { gt: 0 },
      },
      orderBy: { creditBalance: 'desc' },
      select: {
        id:            true,
        name:          true,
        phone:         true,
        creditLimit:   true,
        creditBalance: true,
      },
    });

    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch balances', message: error.message });
  }
};