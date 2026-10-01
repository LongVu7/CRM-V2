<template>
    <Dialog 
        :visible="visible" 
        @update:visible="$emit('update:visible', $event)" 
        modal 
        header="Select Recipients from Inquiries" 
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
        const response = await getAllInquiries({ limit: 100, hasStudent: true }); // fetch more for selection
        inquiries.value = response.data || response.inquiries || response; 

        if (props.initialRecipients && props.initialRecipients.length) {
            const initialInquiryIds = props.initialRecipients.map(r => r.inquiryId);
            selectedInquiries.value = inquiries.value.filter(inq => initialInquiryIds.includes(inq.id));
        } else {
            selectedInquiries.value = [];
        }
    } catch (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load inquiries', life: 3000 });
    } finally {
        fetching.value = false;
    }
};

const handleAdd = () => {
    const inquiryIds = selectedInquiries.value.map(inq => inq.id);
    emit('add', inquiryIds);
};

onMounted(() => {
    if (props.visible) {
        fetchInquiriesData();
    }
});
</script>
