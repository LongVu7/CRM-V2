<template>
  <div class="call-history-view p-4">
    <div class="page-heading mb-4 flex justify-content-between align-items-center">
      <div class="flex align-items-center gap-3">
        <h1 class="text-2xl font-bold m-0 flex align-items-center gap-2">
          <i class="pi pi-phone text-primary"></i> Call History
        </h1>
        <Tag :value="`${pagination.totalCount || 0} calls`" severity="info" rounded />
      </div>
      <div class="actions">
        <Button icon="pi pi-refresh" label="Refresh" outlined size="small" @click="loadData" :loading="loading" />
      </div>
    </div>

    <div class="filter-card surface-card p-3 border-round shadow-1 mb-4">
      <div class="grid align-items-center gap-3">
        <div class="col-12 md:col-4">
          <IconField class="w-full">
            <InputIcon class="pi pi-search" />
            <InputText
              v-model="searchQuery"
              placeholder="Search phone, student, advisor, notes..."
              class="w-full"
              @keyup.enter="handleSearch"
            />
          </IconField>
        </div>

        <div class="col-12 sm:col-6 md:col-3">
          <Select
            v-model="selectedStatus"
            :options="statusOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Filter by Status"
            showClear
            class="w-full"
            @change="handleFilterChange"
          />
        </div>

        <div class="col-12 sm:col-6 md:col-3">
          <Select
            v-model="selectedDisposition"
            :options="dispositionOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Filter by Disposition"
            showClear
            class="w-full"
            @change="handleFilterChange"
          />
        </div>

        <div class="col-12 md:col-auto flex gap-2">
          <Button label="Search" icon="pi pi-search" size="small" @click="handleSearch" />
          <Button label="Clear" icon="pi pi-filter-slash" severity="secondary" outlined size="small" @click="clearFilters" />
        </div>
      </div>
    </div>

    <div class="table-card surface-card border-round shadow-1">
      <DataTable
        :value="calls"
        :loading="loading"
        lazy
        paginator
        :rows="pagination.limit"
        :first="(pagination.page - 1) * pagination.limit"
        :totalRecords="pagination.totalCount"
        :rowsPerPageOptions="[10, 15, 25, 50]"
        stripedRows
        responsiveLayout="scroll"
        @page="onPageChange"
      >
        <template #empty>
          <div class="text-center p-4 text-500">
            <i class="pi pi-inbox text-3xl mb-2 block"></i>
            No call records found matching criteria.
          </div>
        </template>

        <Column field="startedAt" header="Date & Time" style="min-width: 170px">
          <template #body="{ data }">
            <span class="font-medium text-sm">{{ formatDateTime(data.startedAt) }}</span>
          </template>
        </Column>

        <Column field="student" header="Student" style="min-width: 160px">
          <template #body="{ data }">
            <RouterLink
              v-if="data.student?.id"
              :to="`/students/${data.student.id}`"
              class="font-semibold text-primary hover:underline"
            >
              {{ data.student.fullName }}
            </RouterLink>
            <span v-else class="text-500 italic">No Student</span>
          </template>
        </Column>

        <Column field="destinationNumber" header="Dialed Number" style="min-width: 140px">
          <template #body="{ data }">
            <span class="font-mono text-sm">{{ data.destinationNumber || data.calleeId || '—' }}</span>
          </template>
        </Column>

        <Column field="durationSeconds" header="Duration" style="min-width: 100px">
          <template #body="{ data }">
            <span class="font-mono font-semibold">{{ formatDuration(data.durationSeconds) }}</span>
          </template>
        </Column>

        <Column field="status" header="Status" style="min-width: 120px">
          <template #body="{ data }">
            <Tag :value="data.status" :severity="getStatusSeverity(data.status)" />
          </template>
        </Column>

        <Column field="disposition" header="Disposition" style="min-width: 160px">
          <template #body="{ data }">
            <span v-if="data.disposition" class="font-medium text-xs surface-200 px-2 py-1 border-round">
              {{ data.disposition }}
            </span>
            <span v-else class="text-500">—</span>
          </template>
        </Column>

        <Column field="handledBy" header="Advisor" style="min-width: 150px">
          <template #body="{ data }">
            {{ data.handledBy?.fullName || data.handledBy?.email || '—' }}
          </template>
        </Column>

        <Column field="inquiry" header="Inquiry" style="min-width: 110px">
          <template #body="{ data }">
            <RouterLink
              v-if="data.inquiry?.id"
              :to="`/inquiries/${data.inquiry.id}`"
              class="p-button p-button-text p-button-sm p-0 text-primary"
            >
              #{{ data.inquiry.id }}
            </RouterLink>
            <span v-else class="text-500">—</span>
          </template>
        </Column>

        <Column field="note" header="Notes" style="min-width: 220px">
          <template #body="{ data }">
            <span class="text-sm text-700 block text-overflow-ellipsis" :title="data.note">
              {{ data.note || '—' }}
            </span>
          </template>
        </Column>
      </DataTable>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import Select from 'primevue/select';
import InputText from 'primevue/inputtext';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import { getAllCalls } from '@/services/voipService';
import { useToast } from 'primevue/usetoast';

const toast = useToast();

const calls = ref([]);
const loading = ref(false);
const searchQuery = ref('');
const selectedStatus = ref(null);
const selectedDisposition = ref(null);

const pagination = ref({
  page: 1,
  limit: 15,
  totalCount: 0,
  totalPages: 1
});

const statusOptions = [
  { label: 'All Statuses', value: null },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Connected', value: 'CONNECTED' },
  { label: 'Busy', value: 'BUSY' },
  { label: 'No Answer', value: 'NO_ANSWER' },
  { label: 'Failed', value: 'FAILED' }
];

const dispositionOptions = [
  { label: 'All Dispositions', value: null },
  { label: 'Connected / Answered', value: 'CONNECTED' },
  { label: 'Consultation Completed', value: 'CONSULTATION_COMPLETED' },
  { label: 'Busy / Line Engaged', value: 'BUSY' },
  { label: 'No Answer / Timeout', value: 'NO_ANSWER' },
  { label: 'Call Back Requested', value: 'CALL_BACK' },
  { label: 'Wrong Number / Invalid', value: 'WRONG_NUMBER' },
  { label: 'Call Failed / Rejected', value: 'FAILED' }
];

const loadData = async () => {
  loading.value = true;
  try {
    const params = {
      page: pagination.value.page,
      limit: pagination.value.limit,
      search: searchQuery.value || undefined,
      status: selectedStatus.value || undefined,
      disposition: selectedDisposition.value || undefined
    };

    const res = await getAllCalls(params);
    calls.value = res.calls || [];
    if (res.pagination) {
      pagination.value = res.pagination;
    }
  } catch (err) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: err.response?.data?.error || err.message || 'Failed to load call history',
      life: 4000
    });
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  pagination.value.page = 1;
  loadData();
};

const handleFilterChange = () => {
  pagination.value.page = 1;
  loadData();
};

const clearFilters = () => {
  searchQuery.value = '';
  selectedStatus.value = null;
  selectedDisposition.value = null;
  pagination.value.page = 1;
  loadData();
};

const onPageChange = (event) => {
  pagination.value.page = Math.floor(event.first / event.rows) + 1;
  pagination.value.limit = event.rows;
  loadData();
};

const formatDateTime = (val) => {
  if (!val) return '—';
  const d = new Date(val);
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatDuration = (secs) => {
  if (secs === null || secs === undefined) return '—';
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

const getStatusSeverity = (status) => {
  switch (status) {
    case 'COMPLETED':
    case 'CONNECTED':
      return 'success';
    case 'BUSY':
    case 'NO_ANSWER':
      return 'warn';
    case 'FAILED':
      return 'danger';
    default:
      return 'info';
  }
};

onMounted(() => {
  loadData();
});
</script>

<style scoped>
.call-history-view {
  max-width: 1400px;
  margin: 0 auto;
}

.text-overflow-ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 320px;
}
</style>
