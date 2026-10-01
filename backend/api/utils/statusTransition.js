const { isProcessed, isInteracted, isNb } = require('./statusGroups');

/**
 * Resolves the status hierarchy (interaction, general, detail)
 * using Prisma self-relations to fetch the parent chain.
 */
async function resolveStatusHierarchy(tx, statusDataId) {
  if (!statusDataId) return null;
  const node = await tx.statusData.findUnique({
    where: { id: statusDataId },
    include: {
      parent: {
        include: {
          parent: true
        }
      }
    }
  });
  if (!node) return null;

  let interaction = null;
  let general = null;
  let detail = null;

  const chain = [node];
  if (node.parent) {
    chain.push(node.parent);
    if (node.parent.parent) {
      chain.push(node.parent.parent);
    }
  }

  for (const item of chain) {
    if (item.level === 'interaction') interaction = item;
    if (item.level === 'general') general = item;
    if (item.level === 'detail') detail = item;
  }

  return {
    interaction: interaction ? interaction.name : null,
    general: general ? general.name : null,
    detail: detail ? detail.name : null,
  };
}

/**
 * Calculates milestone updates for an inquiry status transition.
 */
async function applyStatusTransition({ tx, inquiry, newStatusDataId, occurredAt = new Date() }) {
  if (!newStatusDataId) return {};

  const newHierarchy = await resolveStatusHierarchy(tx, newStatusDataId);
  const oldHierarchy = inquiry.statusDataId ? await resolveStatusHierarchy(tx, inquiry.statusDataId) : null;

  const updates = {};

  // firstProcessedAt logic
  if (!inquiry.firstProcessedAt) {
    const isNewProcessed = newHierarchy && isProcessed(newHierarchy.interaction);
    const isOldProcessed = oldHierarchy && isProcessed(oldHierarchy.interaction);
    if (isNewProcessed && !isOldProcessed) {
      updates.firstProcessedAt = occurredAt;
    }
  }

  // firstInteractedAt logic
  if (!inquiry.firstInteractedAt) {
    const isNewInteracted = newHierarchy && isInteracted(newHierarchy.interaction);
    const isOldInteracted = oldHierarchy && isInteracted(oldHierarchy.interaction);
    if (isNewInteracted && !isOldInteracted) {
      updates.firstInteractedAt = occurredAt;
    }
  }

  // nbAt logic
  if (!inquiry.nbAt) {
    const isNewNb = newHierarchy && isNb(newHierarchy.general);
    const isOldNb = oldHierarchy && isNb(oldHierarchy.general);
    if (isNewNb && !isOldNb) {
      updates.nbAt = occurredAt;
    }
  }

  return updates;
}

module.exports = {
  resolveStatusHierarchy,
  applyStatusTransition
};
