// Category Controller
// Categories group products — Paint, Cement, Timber etc.
// Only OWNER and MANAGER can create or edit categories.

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// ── GET ALL CATEGORIES ────────────────────────
// GET /api/categories
// Returns all categories for the logged-in user's business.
export const getCategories = async (req, res) => {
  try {
    // req.user.businessId comes from the JWT token
    // Every query filters by businessId — users never see
    // another business's data even if they guess an ID
    const categories = await prisma.category.findMany({
      where: { businessId: req.user.businessId },
      orderBy: { name: 'asc' },
    });

    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch categories', message: error.message });
  }
};

// ── CREATE CATEGORY ───────────────────────────
// POST /api/categories
// Owner and Manager only
export const createCategory = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const category = await prisma.category.create({
      data: {
        businessId: req.user.businessId,
        name,
      },
    });

    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create category', message: error.message });
  }
};

// ── UPDATE CATEGORY ───────────────────────────
// PUT /api/categories/:id
export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    // First check the category belongs to this business
    // Prevents one business editing another business's data
    const existing = await prisma.category.findFirst({
      where: { id, businessId: req.user.businessId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const category = await prisma.category.update({
      where: { id },
      data: { name },
    });

    res.json(category);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update category', message: error.message });
  }
};

// ── DELETE CATEGORY ───────────────────────────
// DELETE /api/categories/:id
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.category.findFirst({
      where: { id, businessId: req.user.businessId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Category not found' });
    }

    await prisma.category.delete({ where: { id } });

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    // If products are linked to this category, delete will fail
    // We catch that and return a helpful message
    res.status(500).json({
      error: 'Cannot delete category — it may have products linked to it',
      message: error.message
    });
  }
};