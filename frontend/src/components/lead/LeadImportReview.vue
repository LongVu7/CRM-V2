<script setup>
import { ref } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Message from 'primevue/message'
import Tag from 'primevue/tag'
import Dialog from 'primevue/dialog'

const props = defineProps({
  summary: {
    type: Object,
    required: true
  },
  parsedData: {
    type: Array,
    required: true
  },
  isConfirming: {
    type: Boolean,
    default: false
  },
  canConfirm: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['cancel', 'confirm'])

const showDetailsDialog = ref(false)
const selectedRow = ref(null)

const viewRowDetails = (row) => {
  selectedRow.value = row
  showDetailsDialog.value = true
}

const getClassificationLabel = (cls) => {
  switch (cls) {
    case 'READY_NEW_STUDENT_AND_INQUIRY': return 'New Student'
    case 'READY_EXISTING_STUDENT_NEW_INQUIRY': return 'Existing Student'
    case 'EXISTING_INQUIRY': return 'Skip (Exists)'
    case 'DUPLICATE_IN_FILE': return 'Duplicate'
    case 'MAPPING_ISSUE': return 'Mapping Error'
    case 'INVALID': return 'Invalid'
    default: return cls
  }
}

const getClassificationSeverity = (cls) => {
  switch (cls) {
    case 'READY_NEW_STUDENT_AND_INQUIRY': return 'success'
    case 'READY_EXISTING_STUDENT_NEW_INQUIRY': return 'info'
    case 'EXISTING_INQUIRY': return 'warning'
    case 'DUPLICATE_IN_FILE': return 'warning'
    case 'MAPPING_ISSUE': return 'danger'
    case 'INVALID': return 'danger'
    default: return 'secondary'
  }
}
</script>

<template>
  <div>
    <div class="review-summary-cards">
      <div class="summary-card" title="Total Rows">
        <span class="count">{{ summary.total }}</span>
        <span class="label">Total Rows</span>
      </div>
      <div class="summary-card text-green" title="New Student + Inquiry">
        <span class="count">{{ summary.readyNew }}</span>
        <span class="label">Ready (New)</span>
      </div>
      <div class="summary-card text-blue" title="Existing Student + New Inquiry">
        <span class="count">{{ summary.readyExisting }}</span>
        <span class="label">Ready (Existing)</span>
      </div>
      <div class="summary-card text-orange" title="Existing Inquiry (Skipped)">
        <span class="count">{{ summary.existingInquiry }}</span>
        <span class="label">Skipped</span>
      </div>
      <div class="summary-card text-red" title="Mapping/Validation Issues">
        <span class="count">{{ summary.mappingIssue + summary.invalid + summary.duplicateInFile }}</span>
        <span class="label">Issues</span>
      </div>
    </div>

    <Message v-if="summary.duplicateInFile > 0" severity="warn" :closable="false">
      Found {{ summary.duplicateInFile }} duplicate(s) in the uploaded file based on mobile numbers. They will be skipped.
    </Message>

    <DataTable 
      :value="parsedData" 
      dataKey="_meta.rowNumber"
      :paginator="true"
      :rows="10"
      class="p-datatable-sm mt-3 review-table"
    >
      <Column field="_meta.rowNumber" header="Row" style="width: 5%"></Column>
      <Column field="fullName" header="Student Name" style="width: 20%"></Column>
      <Column field="mobile" header="Mobile" style="width: 15%"></Column>
      <Column header="School / Status" style="width: 20%">
        <template #body="{ data }">
          <div class="text-sm">
            <div v-if="data.school">{{ data.school }}</div>
            <div class="text-muted">{{ data.statusInteraction }}<span v-if="data.statusGeneral"> > {{ data.statusGeneral }}</span></div>
          </div>
        </template>
      </Column>
      <Column field="assignedTo" header="Assigned To" style="width: 15%"></Column>
      <Column header="Status" style="width: 15%">
        <template #body="{ data }">
          <Tag :value="getClassificationLabel(data._meta.classification)" :severity="getClassificationSeverity(data._meta.classification)" />
        </template>
      </Column>
      <Column header="Actions" style="width: 10%">
        <template #body="{ data }">
          <Button icon="pi pi-eye" severity="secondary" text rounded aria-label="View Details" @click="viewRowDetails(data)" />
        </template>
      </Column>
    </DataTable>

    <div class="action-buttons">
      <Button label="Cancel" icon="pi pi-times" severity="secondary" @click="emit('cancel')" />
      <Button label="Confirm Import" icon="pi pi-check" severity="success" @click="emit('confirm')" :loading="isConfirming" :disabled="!canConfirm" />
    </div>

    <!-- Row Details Dialog -->
    <Dialog v-model:visible="showDetailsDialog" header="Row Details" :style="{ width: '50rem' }" :modal="true">
      <div v-if="selectedRow">
        <div v-if="selectedRow._meta.errors.length > 0" class="mb-4">
          <Message severity="error" :closable="false">
            <ul style="margin:0; padding-left:1.5rem">
              <li v-for="(err, idx) in selectedRow._meta.errors" :key="idx">{{ err }}</li>
            </ul>
          </Message>
        </div>
        
        <div v-if="selectedRow._meta.warnings.length > 0" class="mb-4">
          <Message severity="warn" :closable="false">
            <ul style="margin:0; padding-left:1.5rem">
              <li v-for="(warn, idx) in selectedRow._meta.warnings" :key="idx">{{ warn }}</li>
            </ul>
          </Message>
        </div>

        <div class="details-grid">
          <div class="detail-group">
            <h4>Student & Education</h4>
            <div class="field"><label>Name:</label> <span>{{ selectedRow.fullName }}</span></div>
            <div class="field"><label>Mobile:</label> <span>{{ selectedRow.mobile }}</span></div>
            <div class="field"><label>Email:</label> <span>{{ selectedRow.email }}</span></div>
            <div class="field"><label>Gender:</label> <span>{{ selectedRow.gender }}</span></div>
            <div class="field"><label>School:</label> <span>{{ selectedRow.school }} ({{ selectedRow.oldProvince }})</span></div>
            <div class="field"><label>New Province:</label> <span>{{ selectedRow.newProvince }}</span></div>
            <div class="field"><label>Class:</label> <span>{{ selectedRow.class }}</span></div>
          </div>
          <div class="detail-group">
            <h4>Inquiry Details</h4>
            <div class="field"><label>Assigned To:</label> <span>{{ selectedRow.assignedTo }}</span></div>
            <div class="field"><label>Interaction:</label> <span>{{ selectedRow.statusInteraction }}</span></div>
            <div class="field"><label>General:</label> <span>{{ selectedRow.statusGeneral }}</span></div>
            <div class="field"><label>Detail:</label> <span>{{ selectedRow.statusDetail }}</span></div>
            <div class="field"><label>Source:</label> <span>{{ selectedRow.source }}</span></div>
            <div class="field"><label>Source Detail:</label> <span>{{ selectedRow.sourceDetail }}</span></div>
            <div class="field"><label>Approach Method:</label> <span>{{ selectedRow.approachMethod }}</span></div>
          </div>
        </div>
      </div>
    </Dialog>
  </div>
</template>

<style scoped>
.review-summary-cards {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.summary-card {
  flex: 1;
  min-width: 120px;
  padding: 1rem;
  background: var(--p-surface-50);
  border-radius: 8px;
  border: 1px solid var(--p-surface-200);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.summary-card .count {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--p-text-color);
}

.summary-card .label {
  font-size: 0.75rem;
  color: var(--p-text-muted-color);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: 0.25rem;
}

.text-green .count { color: var(--p-green-500); }
.text-blue .count { color: var(--p-blue-500); }
.text-orange .count { color: var(--p-orange-500); }
.text-red .count { color: var(--p-red-500); }

.action-buttons {
  margin-top: 1.5rem;
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}

.text-sm { font-size: 0.85rem; }
.text-muted { color: var(--p-text-muted-color); }
.mt-3 { margin-top: 1rem; }
.mb-4 { margin-bottom: 1rem; }

.details-grid {
  display: flex;
  gap: 2rem;
}
.detail-group {
  flex: 1;
}
.detail-group h4 {
  border-bottom: 1px solid var(--p-surface-200);
  padding-bottom: 0.5rem;
  margin-bottom: 1rem;
}
.field {
  display: flex;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
}
.field label {
  width: 120px;
  font-weight: 600;
  color: var(--p-text-muted-color);
}
.field span {
  flex: 1;
}
</style>
