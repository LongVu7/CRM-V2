<template>
    <Dialog 
        :visible="visible" 
        @update:visible="$emit('update:visible', $event)" 
        modal 
        header="Select Recipients" 
        :style="{ width: '75vw', maxWidth: '1000px' }"
    >
        <DataTable 
            :value="leads" 
            v-model:selection="selectedLeads" 
            dataKey="id" 
            :loading="fetching || loading"
            lazy
            paginator 
            :rows="pagination.limit"
            :totalRecords="pagination.totalCount"
            :first="(pagination.page - 1) * pagination.limit"
            :sortField="sortField"
            :sortOrder="sortOrder"
            :removableSort="true"
            :rowsPerPageOptions="[5, 10, 20, 50]"
            stripedRows
            responsiveLayout="scroll"
            @page="onPageChange"
            @sort="onSortChange"
        >
            <template #header>
                <div class="recipient-toolbar">
                    <div class="toolbar-filters">
                        <IconField class="search-field">
                            <InputIcon class="pi pi-search" />
                            <InputText 
                                :value="searchQuery" 
                                placeholder="Search name, email, phone..." 
                                @input="handleSearchInput"
                                @keyup.enter="handleSearchEnter"
                            />
                        </IconField>

                        <Select 
                            v-model="selectedStatusId" 
                            :options="statusOptions" 
                            optionLabel="label" 
                            optionValue="id" 
                            placeholder="All Statuses" 
                            showClear 
                            class="status-select"
                            @change="handleFilterChange"
                        />

                        <Button 
                            v-if="searchQuery || selectedStatusId"
                            icon="pi pi-filter-slash" 
                            text 
                            rounded 
                            size="small"
                            severity="secondary" 
                            v-tooltip.top="'Clear filters'"
                            @click="clearFilters" 
                        />
                    </div>

                    <div class="toolbar-meta">
                        <Tag 
                            :value="`Selected: ${selectedLeads.length}`" 
                            severity="info" 
                            icon="pi pi-check-circle"
                        />
                    </div>
                </div>
            </template>

            <template #empty>
                <div class="empty-state">
                    <i class="pi pi-users empty-icon"></i>
                    <p>No recipients found matching criteria.</p>
                </div>
            </template>

            <Column selectionMode="multiple" headerStyle="width: 3rem"></Column>
            <Column field="student.fullName" header="Full Name" sortable></Column>
            <Column field="student.email" header="Email" sortable></Column>
            <Column field="student.mobile" header="Mobile" sortable></Column>
            <Column field="statusData.label" header="Status" sortable>
                <template #body="{ data }">
                    <span v-if="data.statusData">{{ data.statusData.label }}</span>
                    <span v-else class="text-muted">—</span>
                </template>
            </Column>
        </DataTable>

        <template #footer>
            <Button label="Cancel" icon="pi pi-times" text @click="$emit('update:visible', false)" />
            <Button :label="`Save Recipients (${selectedLeads.length})`" icon="pi pi-check" @click="handleAdd" :loading="loading" />
        </template>
    </Dialog>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useToast } from 'primevue/usetoast';
import Dialog from 'primevue/dialog';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import IconField from 'primevue/iconfield';
import InputIcon from 'primevue/inputicon';
import Select from 'primevue/select';
import Tag from 'primevue/tag';
import { getRecipientCandidates } from '@/services/campaignService';

const props = defineProps({
    visible: Boolean,
    loading: {
        type: Boolean,
        default: false
    },
    campaignId: {
        type: [String, Number],
        required: true
    },
    activityId: {
        type: [String, Number],
        required: true
    },
    initialRecipients: {
        type: Array,
        default: () => []
    }
});

const emit = defineEmits(['update:visible', 'add']);
const toast = useToast();

const leads = ref([]);
const selectedLeads = ref([]);
const fetching = ref(false);
const searchQuery = ref('');
const selectedStatusId = ref(null);
const sortField = ref(null);
const sortOrder = ref(null);
const statusOptions = ref([]);
const isInitialLoad = ref(true);

const pagination = ref({
    page: 1,
    limit: 10,
    totalCount: 0
});

let searchTimeout = null;

const fetchRecipientsData = async () => {
    fetching.value = true;
    try {
        const params = {
            page: pagination.value.page,
            limit: pagination.value.limit
        };

        if (searchQuery.value?.trim()) {
            params.search = searchQuery.value.trim();
        }

        if (selectedStatusId.value) {
            params.statusId = selectedStatusId.value;
        }

        if (sortField.value && sortOrder.value) {
            params.sortField = sortField.value;
            params.sortOrder = sortOrder.value === 1 ? 'asc' : 'desc';
        }

        const data = await getRecipientCandidates(props.campaignId, props.activityId, params);
        leads.value = data.leads || [];
        statusOptions.value = data.statuses || [];
        if (data.pagination) {
            pagination.value = {
                page: data.pagination.page,
                limit: data.pagination.limit,
                totalCount: data.pagination.totalCount
            };
        }

        if (isInitialLoad.value) {
            const initialLeadIds = new Set((props.initialRecipients || []).map(r => r.leadId));
            selectedLeads.value = leads.value.filter(lead => initialLeadIds.has(lead.id));
            isInitialLoad.value = false;
        }
    } catch {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load recipients', life: 3000 });
    } finally {
        fetching.value = false;
    }
};

const handleSearchInput = (e) => {
    searchQuery.value = e.target.value;
    if (searchTimeout) clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        pagination.value.page = 1;
        fetchRecipientsData();
    }, 350);
};

const handleSearchEnter = () => {
    if (searchTimeout) clearTimeout(searchTimeout);
    pagination.value.page = 1;
    fetchRecipientsData();
};

const handleFilterChange = () => {
    pagination.value.page = 1;
    fetchRecipientsData();
};

const clearFilters = () => {
    searchQuery.value = '';
    selectedStatusId.value = null;
    sortField.value = null;
    sortOrder.value = null;
    pagination.value.page = 1;
    fetchRecipientsData();
};

const onPageChange = (event) => {
    pagination.value.page = Math.floor(event.first / event.rows) + 1;
    pagination.value.limit = event.rows;
    fetchRecipientsData();
};

const onSortChange = (event) => {
    sortField.value = event.sortField;
    sortOrder.value = event.sortOrder;
    pagination.value.page = 1;
    fetchRecipientsData();
};

const handleAdd = () => {
    const leadIds = (selectedLeads.value || [])
        .map(lead => (typeof lead === 'object' && lead !== null ? lead.id : lead))
        .filter(id => id !== null && id !== undefined && !isNaN(Number(id)))
        .map(Number);
    emit('add', leadIds);
};

onMounted(() => {
    if (props.visible) {
        fetchRecipientsData();
    }
});
</script>

<style scoped>
.recipient-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.75rem;
    padding: 0.25rem 0 0.5rem 0;
}

.toolbar-filters {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
}

.search-field {
    min-width: 240px;
}

.status-select {
    min-width: 170px;
}

.toolbar-meta {
    display: flex;
    align-items: center;
}

.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 2.5rem 1rem;
    color: var(--p-text-muted-color);
}

.empty-icon {
    font-size: 2rem;
    margin-bottom: 0.5rem;
    opacity: 0.6;
}

.text-muted {
    color: var(--p-text-muted-color);
}
</style>
