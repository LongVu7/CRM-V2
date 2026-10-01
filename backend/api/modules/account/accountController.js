const bcrypt = require('bcrypt');
const prisma = require('../../../config/db');

// ─── List all accounts
const getAllAccounts = async (req, res) => {
  try {
    const accounts = await prisma.account.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fullName: true,
        email: true,
        isActive: true,
        createdAt: true,
        role: {
          select: { id: true, name: true }
        },
        group: {
          select: { id: true, name: true }
        }
      }
    });

    res.status(200).json({
      message: "Accounts retrieved successfully",
      requestedByRole: req.user?.roleName,
      requestedByAccountId: req.user?.accountId,
      totalCount: accounts.length,
      accounts
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch accounts", details: error.message });
  }
};

// ─── Get specific account
const getAccountById = async (req, res) => {
  try {
    const { id } = req.params;

    const account = await prisma.account.findUnique({
      where: { id: Number(id) },
      select: {
        id: true,
        fullName: true,
        email: true,
        isActive: true,
        createdAt: true,
        roleId: true,
        groupId: true,
        role: {
          select: { id: true, name: true }
        },
        group: {
          select: { id: true, name: true }
        },
        leadingGroups: {
          select: { id: true, name: true }
        },
        inquiries: {
          select: { 
            id: true, 
            statusData: {
              select: { id: true, label: true, name: true, level: true }
            }
          }
        }
      }
    });

    if (!account) {
      return res.status(404).json({ error: "Account not found" });
    }

    res.status(200).json({
      message: "Account retrieved successfully",
      requestedByRole: req.user?.roleName,
      requestedByAccountId: req.user?.accountId,
      accounts: account
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch account", details: error.message });
  }
};

// ─── Create account
const createAccount = async (req, res) => {
  try {
    const { fullName, email, password, roleId, groupId } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }

    // Check for duplicate email
    const existingAccount = await prisma.account.findFirst({
      where: { email }
    });
    if (existingAccount) {
      return res.status(409).json({ error: "This email already exists" });
    }

    // Validate roleId if provided
    if (roleId) {
      const role = await prisma.role.findUnique({ where: { id: Number(roleId) } });
      if (!role) {
        return res.status(404).json({ error: "Role not found with the provided roleId" });
      }
    }

    // Validate groupId if provided
    if (groupId) {
      const group = await prisma.userGroup.findUnique({ where: { id: Number(groupId) } });
      if (!group) {
        return res.status(404).json({ error: "Group not found with the provided groupId" });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const newAccount = await prisma.account.create({
      data: {
        fullName,
        email,
        password: hashedPassword, 
        roleId: roleId ? Number(roleId) : undefined,
        groupId: groupId ? Number(groupId) : undefined
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        isActive: true,
        createdAt: true,
        role: { select: { id: true, name: true } },
        group: { select: { id: true, name: true } }
      }
    });

    res.status(201).json({
      message: "Account created successfully",
      requestedByRole: req.user?.roleName,
      requestedByAccountId: req.user?.accountId,
      newAccountDetail: newAccount
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to create account", details: error.message });
  }
};

// ─── Update account
const updateAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, email, isActive, roleId, groupId, password } = req.body;

    const existing = await prisma.account.findUnique({ where: { id: Number(id) } });
    if (!existing) {
      return res.status(404).json({ error: "Account not found" });
    }

    // Build update data only from provided fields
    const updateData = {};
    if (fullName !== undefined) updateData.fullName = fullName;
    if (email !== undefined) updateData.email = email;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (roleId !== undefined) updateData.roleId = roleId ? Number(roleId) : null;
    if (groupId !== undefined) updateData.groupId = groupId ? Number(groupId) : null;
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedAccount = await prisma.account.update({
      where: { id: Number(id) },
      data: updateData,
      select: {
        id: true,
        fullName: true,
        email: true,
        isActive: true,
        createdAt: true,
        role: { select: { id: true, name: true } },
        group: { select: { id: true, name: true } }
      }
    });

    res.status(200).json({
      message: "Account updated successfully",
      requestedByRole: req.user?.roleName,
      requestedByAccountId: req.user?.accountId,
      updatedAccountDetail: updatedAccount
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to update account", details: error.message });
  }
};

// ─── Delete account
const deleteAccount = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.account.findUnique({
      where: { id: Number(id) },
      select: { id: true, fullName: true, email: true }
    });
    if (!existing) {
      return res.status(404).json({ error: "Account not found" });
    }

    await prisma.$transaction(async (tx) => {
      // Unlink from any groups this account leads
      await tx.userGroup.updateMany({
        where: { groupLeaderId: Number(id) },
        data: { groupLeaderId: null }
      });

      // Unlink from any inquiries assigned to this account
      await tx.inquiry.updateMany({
        where: { assignedToId: Number(id) },
        data: { assignedToId: null }
      });

      // Delete the account
      await tx.account.delete({ where: { id: Number(id) } });
    });

    res.status(200).json({
      message: "Account deleted successfully",
      requestedByRole: req.user?.roleName,
      requestedByAccountId: req.user?.accountId
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete account", details: error.message });
  }
};

// ─── Assign role to account
const assignRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { roleId } = req.body;

    if (roleId === undefined) {
      return res.status(400).json({ error: "roleId is required in the request body" });
    }

    const existing = await prisma.account.findUnique({ where: { id: Number(id) } });
    if (!existing) {
      return res.status(404).json({ error: "Account not found" });
    }

    // Validate role exists 
    if (roleId !== null) {
      const role = await prisma.role.findUnique({ where: { id: Number(roleId) } });
      if (!role) {
        return res.status(404).json({ error: "Role not found" });
      }
    }

    const updatedAccount = await prisma.account.update({
      where: { id: Number(id) },
      data: { roleId: roleId ? Number(roleId) : null },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: { select: { id: true, name: true } }
      }
    });

    res.status(200).json({
      message: "Role assigned successfully",
      requestedByRole: req.user?.roleName,
      requestedByAccountId: req.user?.accountId,
      data: updatedAccount
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to assign role", details: error.message });
  }
};


module.exports = {
  getAllAccounts,
  getAccountById,
  createAccount,
  updateAccount,
  deleteAccount,
  assignRole
};