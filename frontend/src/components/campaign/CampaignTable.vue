<template>
    <DataTable :value="campaigns" :loading="loading" dataKey="id" paginator :rows="10" responsiveLayout="scroll">
        <template #empty> No campaigns found. </template>
        <template #loading> Loading campaigns data. Please wait. </template>

        <Column field="name" header="Campaign Name" sortable style="min-width: 14rem"></Column>
        <Column field="owner.fullName" header="Owner" sortable style="min-width: 10rem"></Column>
        <Column field="status" header="Status" sortable style="min-width: 10rem">
            <template #body="{ data }">
                <Tag :value="getCampaignStatusLabel(data.status)" :severity="getCampaignStatusSeverity(data.status)" />
            </template>
        </Column>
        <Column field="startDate" header="Start Date" sortable style="min-width: 10rem">
            <template #body="{ data }">
                {{ formatCompactDate(data.startDate) }}
            </template>
        </Column>
        <Column field="endDate" header="End Date" sortable style="min-width: 10rem">
            <template #body="{ data }">
                {{ formatCompactDate(data.endDate) }}
            </template>
        </Column>
        
        <Column headerStyle="min-width:10rem;">
            <template #body="{ data }">
                <Button icon="pi pi-pencil" class="mr-2" rounded outlined @click="emit('edit', data.id)" />
                <Button icon="pi pi-trash" rounded outlined severity="danger" @click="emit('delete', data.id)" />
            </template>
        </Column>
    </DataTable>
</template>

<script setup>
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import { formatCompactDate } from '@/utils/dateUtils'
import { getCampaignStatusSeverity, getCampaignStatusLabel } from '@/utils/campaignLabels'

defineProps({
    campaigns: { type: Array, required: true },
    loading: { type: Boolean, default: false }
})

const emit = defineEmits(['edit', 'delete'])
</script>
