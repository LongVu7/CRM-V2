require('dotenv').config();
const prisma = require('../../config/db');

async function cleanupPermissions() {
  console.log('--- Starting Permission Table Canonicalization & Cleanup ---');

  // 1. Ensure canonical team permissions exist
  const canonicalTeamPerms = [
    { resource: 'team', action: 'read', code: 'team.read', description: 'Read teams' },
    { resource: 'team', action: 'create', code: 'team.create', description: 'Create teams' },
    { resource: 'team', action: 'update', code: 'team.update', description: 'Update teams' },
    { resource: 'team', action: 'delete', code: 'team.delete', description: 'Delete teams' },
    { resource: 'team', action: 'assign_leader', code: 'team.assign_leader', description: 'Assign team leader' },
    { resource: 'team', action: 'assign_perm', code: 'team.assign_perm', description: 'Assign team permissions' }
  ];

  for (const tp of canonicalTeamPerms) {
    await prisma.permission.upsert({
      where: { code: tp.code },
      update: { resource: tp.resource, action: tp.action, description: tp.description },
      create: tp
    });
  }

  // 2. Fetch canonical permissions
  const inquiryRead = await prisma.permission.findUnique({ where: { code: 'inquiry.read' } });
  const inquiryUpdate = await prisma.permission.findUnique({ where: { code: 'inquiry.update' } });
  const inquiryDelete = await prisma.permission.findUnique({ where: { code: 'inquiry.delete' } });
  const teamRead = await prisma.permission.findUnique({ where: { code: 'team.read' } });
  const teamUpdate = await prisma.permission.findUnique({ where: { code: 'team.update' } });
  const teamDelete = await prisma.permission.findUnique({ where: { code: 'team.delete' } });
  const teamCreate = await prisma.permission.findUnique({ where: { code: 'team.create' } });

  // 3. Migrate role_permission scopes:
  // If role 7 (manager2) had inquiry.read_assigned as OWNER_ONLY, set canonical inquiry.read to OWNER_ONLY
  const role7InquiryReadAssigned = await prisma.rolePermission.findFirst({
    where: { roleId: 7, permission: { code: 'inquiry.read_assigned' } }
  });
  if (role7InquiryReadAssigned && inquiryRead) {
    console.log(`Setting Role 7 inquiry.read to ${role7InquiryReadAssigned.scope}`);
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: 7, permissionId: inquiryRead.id } },
      update: { scope: role7InquiryReadAssigned.scope },
      create: { roleId: 7, permissionId: inquiryRead.id, scope: role7InquiryReadAssigned.scope }
    });
  }

  // If role 2 (manager) had inquiry.read_assigned as TEAM_ONLY, set canonical inquiry.read to TEAM_ONLY
  const role2InquiryReadAssigned = await prisma.rolePermission.findFirst({
    where: { roleId: 2, permission: { code: 'inquiry.read_assigned' } }
  });
  if (role2InquiryReadAssigned && inquiryRead) {
    console.log(`Setting Role 2 inquiry.read to ${role2InquiryReadAssigned.scope}`);
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: 2, permissionId: inquiryRead.id } },
      update: { scope: role2InquiryReadAssigned.scope },
      create: { roleId: 2, permissionId: inquiryRead.id, scope: role2InquiryReadAssigned.scope }
    });
  }

  // Map any role_permission with group.* to team.*
  const groupCodes = ['group.read', 'group.create', 'group.update', 'group.delete'];
  const groupPerms = await prisma.permission.findMany({ where: { code: { in: groupCodes } } });
  const groupToTeamMap = {
    'group.read': teamRead.id,
    'group.create': teamCreate.id,
    'group.update': teamUpdate.id,
    'group.delete': teamDelete.id
  };

  for (const gp of groupPerms) {
    const targetTeamPermId = groupToTeamMap[gp.code];
    if (!targetTeamPermId) continue;
    const rps = await prisma.rolePermission.findMany({ where: { permissionId: gp.id } });
    for (const rp of rps) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: rp.roleId, permissionId: targetTeamPermId } },
        update: { scope: rp.scope },
        create: { roleId: rp.roleId, permissionId: targetTeamPermId, scope: rp.scope }
      });
    }
  }

  // 4. Delete legacy permissions from junction tables
  const legacyCodes = [
    'inquiry.read_all',
    'inquiry.read_group',
    'inquiry.read_assigned',
    'inquiry.update_all',
    'inquiry.update_group',
    'inquiry.update_assigned',
    'inquiry.delete_all',
    'inquiry.delete_assigned',
    'report.read_all',
    'report.read_group',
    'group.read_all',
    'group.read_managed'
  ];

  const legacyPerms = await prisma.permission.findMany({
    where: { code: { in: legacyCodes } }
  });

  const legacyIds = legacyPerms.map(p => p.id);
  console.log(`Found ${legacyIds.length} legacy permissions to remove:`, legacyCodes);

  if (legacyIds.length > 0) {
    const delRolePerms = await prisma.rolePermission.deleteMany({
      where: { permissionId: { in: legacyIds } }
    });
    console.log(`Deleted ${delRolePerms.count} legacy role_permission records`);

    const delTeamPerms = await prisma.teamPermission.deleteMany({
      where: { permissionId: { in: legacyIds } }
    });
    console.log(`Deleted ${delTeamPerms.count} legacy team_permission records`);

    const delGroupPerms = await prisma.groupPermission.deleteMany({
      where: { permissionId: { in: legacyIds } }
    });
    console.log(`Deleted ${delGroupPerms.count} legacy group_permission records`);

    const delPerms = await prisma.permission.deleteMany({
      where: { id: { in: legacyIds } }
    });
    console.log(`Deleted ${delPerms.count} legacy permission records`);
  }

  console.log('--- Cleanup Finished Successfully ---');
}

cleanupPermissions()
  .catch(console.error)
  .finally(() => prisma.$disconnect().then(() => process.exit(0)));
