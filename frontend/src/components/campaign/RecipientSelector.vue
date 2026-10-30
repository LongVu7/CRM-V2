<template>
    <Dialog 
        :visible="visible" 
        @update:visible="$emit('update:visible', $event)" 
        modal 
        header="Select Recipients" 
        :style="{ width: '70vw' }"
    >
        <DataTable 
            :value="inquiries" 
            v-model:selection="selectedInquiries" 
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
import { getAllInquiries } from '@/services/inquiryService';

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

const inquiries = ref([]);
const selectedInquiries = ref([]);
const fetching = ref(false);

const fetchInquiriesData = async () => {
    fetching.value = true;
    try {
        const response = await getAllInquiries({ limit: 100, hasStudent: true });
        const raw = response.data || response.inquiries || response || [];
        const initialInquiryIds = new Set((props.initialRecipients || []).map(r => r.inquiryId));

        // Filter inquiries with valid email and sort already selected recipients to the top
        const validInquiries = raw.filter(inq => inq.student?.email?.trim());
        validInquiries.sort((a, b) => (initialInquiryIds.has(b.id) ? 1 : 0) - (initialInquiryIds.has(a.id) ? 1 : 0));

        inquiries.value = validInquiries;
        selectedInquiries.value = validInquiries.filter(inq => initialInquiryIds.has(inq.id));
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load inquiries', life: 3000 });
    } finally {
        fetching.value = false;
    }
};

const handleAdd = () => {
    const inquiryIds = (selectedInquiries.value || [])
        .map(inq => (typeof inq === 'object' && inq !== null ? inq.id : inq))
        .filter(id => id !== null && id !== undefined && !isNaN(Number(id)))
        .map(Number);
    emit('add', inquiryIds);
};

onMounted(() => {
    if (props.visible) {
        fetchInquiriesData();
    }
});
</script>
