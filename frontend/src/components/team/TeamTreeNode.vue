<template>
  <div class="tree-node" :style="{ marginLeft: `${depth * 28}px` }">
    <div class="node-card">
      <div class="node-left">
        <button
          v-if="hasChildren"
          class="collapse-btn"
          @click="isExpanded = !isExpanded"
          type="button"
          :title="isExpanded ? 'Collapse' : 'Expand'"
        >
          <i :class="isExpanded ? 'pi pi-chevron-down' : 'pi pi-chevron-right'"></i>
        </button>
        <span v-else class="collapse-spacer">
          <i class="pi pi-circle-fill leaf-dot"></i>
        </span>

        <div class="node-info">
          <div class="title-row">
            <span class="team-name">{{ node.name }}</span>
            <span v-if="depth === 0" class="root-badge">Root</span>
            <span v-if="hasChildren" class="children-pill">
              <i class="pi pi-sitemap"></i> {{ node.children.length }} sub-team{{ node.children.length > 1 ? 's' : '' }}
            </span>
          </div>
          <div class="meta-row">
            <span v-if="node.leader" class="leader-info">
              <i class="pi pi-user-plus icon-small"></i> {{ node.leader.fullName }}
            </span>
            <span v-else class="null-leader">— No Leader</span>

            <span class="member-badge">
              <i class="pi pi-users icon-small"></i> {{ node.memberCount || 0 }} members
            </span>
          </div>
        </div>
      </div>

      <div class="node-actions">
        <Button
          icon="pi pi-pencil"
          rounded
          text
          severity="info"
          size="small"
          v-tooltip.top="'Edit & Members'"
          @click="$emit('edit', node.id)"
        />
        <Button
          icon="pi pi-trash"
          rounded
          text
          severity="danger"
          size="small"
          v-tooltip.top="'Delete'"
          @click="$emit('delete', node)"
        />
      </div>
    </div>

    <!-- Recursive children rendering -->
    <div v-if="hasChildren && isExpanded" class="node-children">
      <TeamTreeNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :depth="depth + 1"
        @edit="$emit('edit', $event)"
        @delete="$emit('delete', $event)"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import Button from 'primevue/button'

const props = defineProps({
  node: {
    type: Object,
    required: true
  },
  depth: {
    type: Number,
    default: 0
  }
})

defineEmits(['edit', 'delete'])

const isExpanded = ref(true)
const hasChildren = computed(() => Array.isArray(props.node.children) && props.node.children.length > 0)
</script>

<style scoped>
.tree-node {
  position: relative;
  margin-top: 0.5rem;
}

.node-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: var(--p-content-background);
  border: 1px solid var(--p-surface-200);
  border-radius: 8px;
  transition: all 0.2s ease;
}

.node-card:hover {
  border-color: var(--p-primary-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.node-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
}

.collapse-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  color: var(--p-text-muted-color);
  padding: 0;
}

.collapse-btn:hover {
  background: var(--p-surface-100);
  color: var(--p-primary-color);
}

.collapse-spacer {
  width: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.leaf-dot {
  font-size: 0.35rem;
  color: var(--p-surface-400);
}

.node-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.team-name {
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--p-text-color);
}

.root-badge {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  background: #eff4fa;
  color: #3b65b5;
  border: 1px solid #bed5ee;
}

.children-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.75rem;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  background: var(--p-surface-100);
  color: var(--p-surface-700);
}

.meta-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 0.85rem;
  color: var(--p-text-muted-color);
}

.leader-info {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  color: var(--p-text-color);
  font-weight: 500;
}

.null-leader {
  font-style: italic;
  font-size: 0.8rem;
}

.member-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.8rem;
}

.icon-small {
  font-size: 0.8rem;
  color: var(--p-primary-color);
}

.node-actions {
  display: flex;
  gap: 0.25rem;
}

.node-children {
  border-left: 2px dashed var(--p-surface-200);
  margin-left: 12px;
  padding-left: 4px;
}
</style>
