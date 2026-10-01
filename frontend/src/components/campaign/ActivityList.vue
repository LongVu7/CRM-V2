<template>
    <DataTable :value="activities" :loading="loading" dataKey="id" responsiveLayout="scroll">
        <template #empty> No activities yet. </template>

        <Column field="type" header="Type" style="min-width: 8rem">
            <template #body="{ data }">
                <Tag :value="data.type" :severity="getTypeSeverity(data.type)" />
            </template>
        </Column>
        <Column field="name" header="Name" sortable style="min-width: 12rem"></Column>
        <Column field="status" header="Status" style="min-width: 8rem">
            <template #body="{ data }">
                <Tag :value="data.status" :severity="getStatusSeverity(data.status)" />
            </template>
        </Column>
        <Column field="recipients" header="Recipients" style="min-width: 8rem">
            <template #body="{ data }">
                {{ data.recipients?.length || 0 }}
            </template>
        </Column>
        <Column field="createdAt" header="Created" style="min-width: 8rem">
            <template #body="{ data }">
                {{ formatDate(data.createdAt) }}
            </template>
        </Column>
        <Column headerStyle="min-width: 12rem;">
            <template #body="{ data }">
                <Button v-if="data.type === 'EMAIL' && data.status !== 'sent'" icon="pi pi-send" class="mr-2" rounded outlined severity="success" v-tooltip="'Send Emails'" @click="emit('send', data)" />
                <Button icon="pi pi-users" class="mr-2" rounded outlined v-tooltip="'Manage Recipients'" @click="emit('recipients', data)" />
                <Button icon="pi pi-pencil" class="mr-2" rounded outlined @click="emit('edit', data)" />
                <Button icon="pi pi-trash" rounded outlined severity="danger" @click="emit('delete', data)" />
            </template>
        </Column>
    </DataTable>
</template>

<script setup>
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Tag from 'primevue/tag'

defineProps({
    activities: { type: Array, required: true },
    loading: { type: Boolean, default: false }
})

const emit = defineEmits(['edit', 'delete', 'send', 'recipients'])

const getTypeSeverity = (type) => {
    switch (type) {
        case 'EMAIL': return 'info'
        case 'SMS': return 'warning'
        case 'ZNS': return 'success'
        default: return 'secondary'
    }
}

const getStatusSeverity = (status) => {
    switch (status) {
        case 'draft': return 'secondary'
        case 'scheduled': return 'warning'
        case 'sent': return 'success'
        case 'failed': return 'danger'
        default: return 'secondary'
    }
}

const formatDate = (value) => {
    if (!value) return ''
    return new Date(value).toLocaleDateString('en-US')
}
</script>
