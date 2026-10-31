<template>
    <Dialog 
        :visible="visible" 
        @update:visible="$emit('update:visible', $event)" 
        modal 
        header="Select Recipients" 
        :style="{ width: '70vw' }"
    >
        <DataTable 
            :value="leads" 
            v-model:selection="selectedLeads" 
            dataKey="id" 
            :loading="fetching || loading"
            paginator 
            :rows="5"
        >
            <Column selectionMode="multiple" headerStyle="width: 3rem"></Column>
            <Column field="student.fullName" header="Student Name"></Column>
            <Column field="student.email" header="Email"></Column>
            <Column field="student.mobile" header="Mobile"></Column>
            <Column header="Status">
                <template #body="{ data }">
                    <span v-if="data.statusData">{{ data.statusData.label }}</span>
                    <span v-else>—</span>
                </template>
            </Column>
        </DataTable>

        <template #footer>
            <Button label="Cancel" icon="pi pi-times" text @click="$emit('update:visible', false)" />
            <Button label="Save Recipients" icon="pi pi-check" @click="handleAdd" :loading="loading" />
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
import { getAllLeads } from '@/services/leadService';

const props = defineProps({
    visible: Boolean,
    loading: {
        type: Boolean,
        default: false
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

const fetchLeadsData = async () => {
    fetching.value = true;
    try {
        const response = await getAllLeads({ limit: 100, hasStudent: true });
        const raw = response.data || response.leads || response || [];
        const initialLeadIds = new Set((props.initialRecipients || []).map(r => r.leadId));

        // Filter leads with valid email and sort already selected recipients to the top
        const validLeads = raw.filter(lead => lead.student?.email?.trim());
        validLeads.sort((a, b) => (initialLeadIds.has(b.id) ? 1 : 0) - (initialLeadIds.has(a.id) ? 1 : 0));

        leads.value = validLeads;
        selectedLeads.value = validLeads.filter(lead => initialLeadIds.has(lead.id));
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load leads', life: 3000 });
    } finally {
        fetching.value = false;
    }
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
        fetchLeadsData();
    }
});
</script>
