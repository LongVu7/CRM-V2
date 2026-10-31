<template>
  <div class="lead-import-view">
    <div class="page-header">
      <div class="header-left">
        <div class="breadcrumb-bar">
          <RouterLink to="/leads" class="breadcrumb-link">
            <i class="pi pi-ticket"></i> Leads
          </RouterLink>
          <i class="pi pi-angle-right breadcrumb-separator"></i>
          <span class="breadcrumb-active">Import Data</span>
        </div>
        <div class="title-row">
          <h1><i class="pi pi-file-excel"></i> Import Leads from Excel</h1>
        </div>
      </div>
      <Button 
        label="Back to List" 
        severity="secondary" 
        icon="pi pi-arrow-left" 
        @click="router.push('/leads')" 
      />
    </div>

    <div class="content-container">
      <LeadImport @imported="onImported" />
    </div>
  </div>
</template>

<script setup>
import { useRouter, RouterLink } from 'vue-router'
import Button from 'primevue/button'
import LeadImport from '@/components/lead/LeadImport.vue'

const router = useRouter()

const onImported = () => {
  // Can be used for analytics or parent tracking if needed
}
</script>

<style scoped>
.lead-import-view {
  padding: 1.5rem 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.breadcrumb-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
}

.breadcrumb-link {
  color: var(--p-text-muted-color);
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  transition: color 0.2s;
}

.breadcrumb-link:hover {
  color: var(--p-primary-color);
}

.breadcrumb-separator {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
}

.breadcrumb-active {
  color: var(--p-primary-color);
  font-weight: 600;
}

.title-row h1 {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--p-text-color);
}

.title-row h1 i {
  color: #10b981;
}

.content-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
</style>
