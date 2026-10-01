const resolveHierarchy = (nodes, levelNames, levelsProvided) => {
  // nodes: list of all nodes for a tree (For statusData and sourceData tree)
  // levelNames: ['interaction', 'general', 'detail'] (statusData)
  // levelNames: ['source', 'source_detail'] (sourceData) 
  // levelsProvided: array of strings corresponding to labels/names provided in excel
  // Returns { resolvedId, resolvedIds, error }
  
  // Auto-infer missing parents bottom-up before validation
  const filled = [...levelsProvided];
  for (let i = levelNames.length - 1; i >= 0; i--) {
    const val = filled[i];
    if (val) {
      const node = nodes.find(n =>
        n.level === levelNames[i] &&
        (n.label ? n.label.toLowerCase() === val.toLowerCase() : n.name.toLowerCase() === val.toLowerCase())
      );
      
      if (node) {
        let currNode = node;
        for (let j = i - 1; j >= 0; j--) {
          if (!currNode.parentId) break;
          const parentNode = nodes.find(n => n.id === currNode.parentId);
          if (parentNode) {
             if (!filled[j]) { // Only auto-fill if the parent was not explicitly provided
               filled[j] = parentNode.label || parentNode.name;
             }
             currNode = parentNode;
          } else {
             break;
          }
        }
      }
      break; // Only infer from the deepest provided node
    }
  }

  let currentParentId = null;
  let resolvedId = null;
  let resolvedIds = new Array(levelNames.length).fill(null);

  for (let i = 0; i < levelNames.length; i++) {
    const levelName = levelNames[i];
    const val = filled[i];

    if (!val) {
      for (let j = i + 1; j < levelNames.length; j++) {
        if (filled[j]) {
          return { error: `Missing parent level: ${levelName} when child level is provided` };
        }
      }
      break; 
    }

    const node = nodes.find(n =>
      n.level === levelName &&
      n.parentId === currentParentId &&
      (n.label ? n.label.toLowerCase() === val.toLowerCase() : n.name.toLowerCase() === val.toLowerCase())
    );

    if (!node) {
      return { error: `Unresolved mapping at level ${levelName} for value "${val}" (parentId: ${currentParentId})` };
    }

    resolvedId = node.id;
    resolvedIds[i] = node.id;
    currentParentId = node.id;
  }
  return { resolvedId, resolvedIds };
};

module.exports = {
  resolveHierarchy
};
