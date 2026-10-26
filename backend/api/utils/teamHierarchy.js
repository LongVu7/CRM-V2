const prisma = require('../../config/db');

/**
 * Resolves all team IDs in the subtrees rooted at the given team ID(s),
 * including the root team IDs themselves and all their descendants.
 */
async function getDescendantSubtreeTeamIds(rootTeamIds, tx = prisma) {
  const normalizedIds = (Array.isArray(rootTeamIds) ? rootTeamIds : [rootTeamIds])
    .map(Number)
    .filter(id => !isNaN(id) && id > 0);

  if (normalizedIds.length === 0) {
    return [];
  }

  try {
    const rows = await tx.$queryRaw`
      WITH RECURSIVE team_tree AS (
        SELECT id FROM team WHERE id = ANY(${normalizedIds}::int[])
        UNION
        SELECT t.id FROM team t
        INNER JOIN team_tree tt ON t.parent_id = tt.id
      )
      SELECT id FROM team_tree;
    `;
    return rows.map(r => r.id);
  } catch (error) {
    // Fallback: in-memory traversal if raw query fails
    const allTeams = await tx.team.findMany({ select: { id: true, parentId: true } });
    const idSet = new Set(normalizedIds);
    let added = true;

    while (added) {
      added = false;
      for (const t of allTeams) {
        if (t.parentId && idSet.has(t.parentId) && !idSet.has(t.id)) {
          idSet.add(t.id);
          added = true;
        }
      }
    }

    return Array.from(idSet);
  }
}

/**
 * Validates that setting `targetParentId` as parent of `teamId` will not
 * produce a circular hierarchy cycle.
 */
async function validateNoCircularHierarchy(teamId, targetParentId, tx = prisma) {
  if (!targetParentId) {
    return true;
  }

  const tid = Number(teamId);
  const pid = Number(targetParentId);

  if (tid && tid === pid) {
    throw new Error('A team cannot be its own parent');
  }

  if (!tid) {
    return true; // New team creation, cannot have existing descendants
  }

  const descendants = await getDescendantSubtreeTeamIds(tid, tx);
  // Remove self from descendants check
  const strictDescendants = descendants.filter(id => id !== tid);

  if (strictDescendants.includes(pid)) {
    throw new Error('Cannot set parent to an existing descendant team (circular reference)');
  }

  return true;
}

/**
 * Transforms a flat array of team objects into a nested hierarchical tree.
 */
function buildTeamTree(teams = []) {
  const teamMap = new Map();
  const roots = [];

  // 1. Initialize map with empty children
  for (const team of teams) {
    teamMap.set(team.id, { ...team, children: [] });
  }

  // 2. Link children to parents
  for (const team of teams) {
    const node = teamMap.get(team.id);
    if (team.parentId && teamMap.has(team.parentId)) {
      teamMap.get(team.parentId).children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

module.exports = {
  getDescendantSubtreeTeamIds,
  validateNoCircularHierarchy,
  buildTeamTree
};
