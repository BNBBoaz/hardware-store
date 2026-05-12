// User Management Controller
// Only the OWNER can access these endpoints.
// This is where staff accounts are created, edited, and deactivated.

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ── GET ALL USERS ─────────────────────────────
// GET /api/users
export const getUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { businessId: req.user.businessId },
      select: {
        id:        true,
        name:      true,
        email:     true,
        role:      true,
        isActive:  true,
        createdAt: true,
        userBranches: {
          include: { branch: { select: { id: true, name: true } } }
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json(users.map(u => ({
      ...u,
      branches: u.userBranches.map(ub => ub.branch),
      userBranches: undefined,
    })));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users', message: error.message });
  }
};

// ── CREATE USER ───────────────────────────────
// POST /api/users
// Owner creates a new staff account
export const createUser = async (req, res) => {
  try {
    const { name, email, password, role, branchIds } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'name, email, password and role are required' });
    }

    const validRoles = ['MANAGER', 'CASHIER', 'STOREKEEPER', 'ACCOUNTANT'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          businessId:   req.user.businessId,
          name,
          email,
          passwordHash,
          role,
          isActive:     true,
        },
      });

      // Assign to branches
      if (branchIds && branchIds.length > 0) {
        await Promise.all(
          branchIds.map(branchId =>
            tx.userBranch.create({
              data: { userId: user.id, branchId },
            })
          )
        );
      }

      return user;
    });

    const user = await prisma.user.findUnique({
      where: { id: result.id },
      select: {
        id: true, name: true, email: true,
        role: true, isActive: true, createdAt: true,
        userBranches: { include: { branch: { select: { id: true, name: true } } } },
      },
    });

    res.status(201).json({
      ...user,
      branches:     user.userBranches.map(ub => ub.branch),
      userBranches: undefined,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create user', message: error.message });
  }
};

// ── UPDATE USER ───────────────────────────────
// PUT /api/users/:id
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, isActive, branchIds, password } = req.body;

    const existing = await prisma.user.findFirst({
      where: { id, businessId: req.user.businessId },
    });
    if (!existing) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Cannot demote/change the owner's own role
    if (existing.id === req.user.userId && role && role !== 'OWNER') {
      return res.status(400).json({ error: 'Cannot change your own role' });
    }

    const updateData = {
      ...(name && { name }),
      ...(role && { role }),
      ...(isActive !== undefined && { isActive }),
    };

    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 12);
    }

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({ where: { id }, data: updateData });

      // Update branch assignments if provided
      if (branchIds !== undefined) {
        await tx.userBranch.deleteMany({ where: { userId: id } });
        if (branchIds.length > 0) {
          await Promise.all(
            branchIds.map(branchId =>
              tx.userBranch.create({ data: { userId: id, branchId } })
            )
          );
        }
      }
      return user;
    });

    const user = await prisma.user.findUnique({
      where: { id: result.id },
      select: {
        id: true, name: true, email: true,
        role: true, isActive: true, createdAt: true,
        userBranches: { include: { branch: { select: { id: true, name: true } } } },
      },
    });

    res.json({
      ...user,
      branches:     user.userBranches.map(ub => ub.branch),
      userBranches: undefined,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user', message: error.message });
  }
};

// ── DEACTIVATE USER ───────────────────────────
// DELETE /api/users/:id  (soft delete — never fully remove)
export const deactivateUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (id === req.user.userId) {
      return res.status(400).json({ error: 'Cannot deactivate your own account' });
    }

    const existing = await prisma.user.findFirst({
      where: { id, businessId: req.user.businessId },
    });
    if (!existing) {
      return res.status(404).json({ error: 'User not found' });
    }

    await prisma.user.update({
      where: { id },
      data:  { isActive: false },
    });

    res.json({ message: `${existing.name}'s account has been deactivated` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to deactivate user', message: error.message });
  }
};