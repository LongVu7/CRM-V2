/**
 * Migration script: Migrate legacy UserGroup records to Team architecture
 *
 * Tasks executed:
 * 1. Transfers existing `user_group` records into `team` table.
 * 2. Maps `group_leader` (or `groupLeaderId`) to `leader_id`.
 * 3. Populates `team_member` records from `account.group_id` memberships.
 * 4. Migrates `group_permission` records into `team_permission` with `scope = 'TEAM_ONLY'`.
 * 5. Backfills `inquiry.team_id` for inquiries assigned to team members where `team_id` is null.
 *
 * Can be run standalone: `node backend/prisma/migrations/migrate_groups_to_teams.js`
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const prisma = require('../../config/db');

async function migrateGroupsToTeams() {
  console.log('🚀 Starting legacy groups to teams migration...');

  try {
    // 1. Fetch all existing user groups
    const groups = await prisma.userGroup.findMany({
      include: {
        accounts: true,
        permissions: true
      }
    });

    console.log(`Found ${groups.length} legacy user group(s) to process.`);

    let teamsCreated = 0;
    let membersCreated = 0;
    let permissionsMigrated = 0;
    let inquiriesUpdated = 0;

    for (const group of groups) {
      // Find or create team with same name
      let team = await prisma.team.findUnique({
        where: { name: group.name }
      });

      if (!team) {
        team = await prisma.team.create({
          data: {
            name: group.name,
            leaderId: group.groupLeaderId || null,
            createdById: group.createdById || null
          }
        });
        teamsCreated++;
        console.log(`  ✓ Created team: "${team.name}" (ID: ${team.id})`);
      } else {
        console.log(`  ℹ Team already exists: "${team.name}" (ID: ${team.id})`);
      }

      // Member accounts to link
      const memberIds = new Set();
      if (group.groupLeaderId) {
        memberIds.add(group.groupLeaderId);
      }
      for (const acc of group.accounts) {
        memberIds.add(acc.id);
      }

      // 2. Populate team_member records
      for (const accountId of memberIds) {
        const existingMember = await prisma.teamMember.findUnique({
          where: {
            teamId_accountId: {
              teamId: team.id,
              accountId: accountId
            }
          }
        });

        if (!existingMember) {
          await prisma.teamMember.create({
            data: {
              teamId: team.id,
              accountId: accountId
            }
          });
          membersCreated++;
        }
      }

      // 3. Migrate group_permission records to team_permission
      for (const gp of group.permissions) {
        const existingPerm = await prisma.teamPermission.findUnique({
          where: {
            teamId_permissionId: {
              teamId: team.id,
              permissionId: gp.permissionId
            }
          }
        });

        if (!existingPerm) {
          await prisma.teamPermission.create({
            data: {
              teamId: team.id,
              permissionId: gp.permissionId,
              scope: 'TEAM_ONLY'
            }
          });
          permissionsMigrated++;
        }
      }

      // 4. Backfill inquiry.team_id for inquiries assigned to these members where team_id is null
      if (memberIds.size > 0) {
        const updateResult = await prisma.inquiry.updateMany({
          where: {
            assignedToId: { in: Array.from(memberIds) },
            teamId: null
          },
          data: {
            teamId: team.id
          }
        });
        inquiriesUpdated += updateResult.count;
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`  - Teams created: ${teamsCreated}`);
    console.log(`  - Team members added: ${membersCreated}`);
    console.log(`  - Team permissions migrated: ${permissionsMigrated}`);
    console.log(`  - Inquiries backfilled with team_id: ${inquiriesUpdated}`);
    console.log('✅ Migration completed successfully!\n');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  migrateGroupsToTeams();
}

module.exports = { migrateGroupsToTeams };
