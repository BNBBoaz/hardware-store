// Product Controller
// Products are the items the hardware store sells.
// Each product has a price, unit, category, and SKU.
// Stock levels are tracked separately in the inventory table.

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// ── Helper: generate a SKU ────────────────────
// SKU = Stock Keeping Unit — unique code per product.
// Example: "HW-00042"
// We auto-generate one if the user does not provide it.
const generateSKU = async (businessId) => {
  const count = await prisma.product.count({ where: { businessId } });
  const number = String(count + 1).padStart(5, '0');
  return `HW-${number}`;
};

// ── GET ALL PRODUCTS ──────────────────────────
// GET /api/products
// Returns all active products for this business.
// Includes category name and inventory levels per branch.
export const getProducts = async (req, res) => {
  try {
    // Optional query params for filtering:
    // GET /api/products?category=abc&search=cement&active=true
    const { category, search, active } = req.query;

    // Build the filter dynamically based on what was passed
    const where = {
      businessId: req.user.businessId,
      // If active param passed, filter by it. Otherwise show all.
      ...(active !== undefined && { isActive: active === 'true' }),
      // If category param passed, filter by categoryId
      ...(category && { categoryId: category }),
      // If search param passed, search by name (case insensitive)
      ...(search && {
        name: { contains: search, mode: 'insensitive' }
      }),
    };

    const products = await prisma.product.findMany({
      where,
      include: {
        // Include category name so frontend doesn't need a second request
        category: { select: { id: true, name: true } },
        // Include stock levels across all branches
        inventory: {
          include: {
            branch: { select: { id: true, name: true } }
          }
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products', message: error.message });
  }
};

// ── GET SINGLE PRODUCT ────────────────────────
// GET /api/products/:id
export const getProduct = async (req, res) => {
  try {
    const product = await prisma.product.findFirst({
      where: {
        id: req.params.id,
        businessId: req.user.businessId,
      },
      include: {
        category: true,
        inventory: {
          include: { branch: true }
        },
      },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch product', message: error.message });
  }
};

// ── CREATE PRODUCT ────────────────────────────
// POST /api/products
// Creates the product AND sets up inventory records
// for every branch in the business automatically.
export const createProduct = async (req, res) => {
  try {
    const {
      name,
      sku,
      categoryId,
      unit,
      buyingPrice,
      sellingPrice,
      reorderLevel,
      initialStock,  // optional: starting stock quantity
    } = req.body;

    // Validate required fields
    if (!name || !unit || !buyingPrice || !sellingPrice) {
      return res.status(400).json({
        error: 'Required: name, unit, buyingPrice, sellingPrice'
      });
    }

    // Validate unit is one of the allowed values from our schema
    const validUnits = ['PCS', 'KG', 'M', 'L', 'BAG', 'BOX'];
    if (!validUnits.includes(unit)) {
      return res.status(400).json({
        error: `Invalid unit. Must be one of: ${validUnits.join(', ')}`
      });
    }

    // Use provided SKU or auto-generate one
    const productSKU = sku || await generateSKU(req.user.businessId);

    // Check SKU is not already in use
    const existingSKU = await prisma.product.findUnique({
      where: { sku: productSKU }
    });
    if (existingSKU) {
      return res.status(409).json({ error: `SKU "${productSKU}" already exists` });
    }

    // Get all branches for this business so we can create
    // an inventory record for each one
    const branches = await prisma.branch.findMany({
      where: { businessId: req.user.businessId, isActive: true },
      select: { id: true },
    });

    // Use a transaction — product and all inventory records
    // are created together or not at all
    const result = await prisma.$transaction(async (tx) => {
      // Create the product
      const product = await tx.product.create({
        data: {
          businessId:   req.user.businessId,
          categoryId:   categoryId || null,
          name,
          sku:          productSKU,
          unit,
          buyingPrice:  parseFloat(buyingPrice),
          sellingPrice: parseFloat(sellingPrice),
          isActive:     true,
        },
      });

      // Create an inventory record for every branch
      // This is what makes stock tracking per-branch work
      const inventoryRecords = await Promise.all(
        branches.map(branch =>
          tx.inventory.create({
            data: {
              productId:    product.id,
              branchId:     branch.id,
              // Set initial stock if provided, otherwise start at 0
              quantity:     parseFloat(initialStock || 0),
              reorderLevel: parseFloat(reorderLevel || 0),
            },
          })
        )
      );

      // If initial stock was provided, log it as a stock movement
      if (initialStock && parseFloat(initialStock) > 0) {
        await Promise.all(
          inventoryRecords.map(inv =>
            tx.stockMovement.create({
              data: {
                inventoryId: inv.id,
                userId:      req.user.userId,
                quantity:    parseFloat(initialStock),
                type:        'ADJUSTMENT',
                reason:      'Initial stock on product creation',
              },
            })
          )
        );
      }

      return product;
    });

    // Fetch the complete product with relations to return
    const product = await prisma.product.findUnique({
      where: { id: result.id },
      include: {
        category: { select: { id: true, name: true } },
        inventory: {
          include: { branch: { select: { id: true, name: true } } }
        },
      },
    });

    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create product', message: error.message });
  }
};

// ── UPDATE PRODUCT ────────────────────────────
// PUT /api/products/:id
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, categoryId, unit,
      buyingPrice, sellingPrice, isActive
    } = req.body;

    // Confirm product belongs to this business
    const existing = await prisma.product.findFirst({
      where: { id, businessId: req.user.businessId },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        // Only update fields that were actually sent
        ...(name && { name }),
        ...(categoryId !== undefined && { categoryId }),
        ...(unit && { unit }),
        ...(buyingPrice && { buyingPrice: parseFloat(buyingPrice) }),
        ...(sellingPrice && { sellingPrice: parseFloat(sellingPrice) }),
        ...(isActive !== undefined && { isActive }),
      },
      include: {
        category: { select: { id: true, name: true } },
      },
    });

    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update product', message: error.message });
  }
};

// ── GET LOW STOCK PRODUCTS ────────────────────
// GET /api/products/low-stock
// Returns products where quantity is at or below reorder level.
// This powers the dashboard alert the owner sees first.
export const getLowStock = async (req, res) => {
  try {
    const inventory = await prisma.inventory.findMany({
      where: {
        // quantity <= reorderLevel means we need to reorder
        quantity: { lte: prisma.inventory.fields.reorderLevel },
        branch: { businessId: req.user.businessId },
        // Only alert on active products
        product: { isActive: true },
      },
      include: {
        product: {
          include: { category: { select: { name: true } } }
        },
        branch: { select: { id: true, name: true } },
      },
    });

    res.json(inventory);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch low stock', message: error.message });
  }
};