<template>
    <div class="activity-form">
        <div class="form-grid">
            <div class="form-field">
                <label for="actType">Type <span class="required">*</span></label>
                <Select id="actType" v-model="activity.type" :options="activityTypeOptions" optionLabel="label" optionValue="value" :disabled="isEditMode" @change="onTypeChange" fluid />
            </div>
            <div class="form-field">
                <label for="actName">Activity Name <span class="required">*</span></label>
                <InputText id="actName" v-model="activity.name" placeholder="Enter activity name" fluid />
            </div>
        </div>

        <div class="form-grid">
            <div class="form-field" v-if="filteredTemplates.length > 0">
                <label for="template">Use Template (Optional)</label>
                <Select 
                  id="template" 
                  v-model="selectedTemplate" 
                  :options="filteredTemplates" 
                  optionLabel="name" 
                  placeholder="Select a template to auto-fill" 
                  showClear
                  fluid
                  @change="onTemplateChange" 
                />
            </div>
            <div class="form-field">
                <label for="scheduledAt">Scheduled At</label>
                <DatePicker id="scheduledAt" v-model="activity.scheduledAt" showTime dateFormat="dd/mm/yy" showIcon placeholder="dd/mm/yyyy hh:mm" fluid />
            </div>
        </div>

        <div v-if="activity.type === 'EMAIL'" class="form-field">
            <label for="subject">Email Subject</label>
            <InputText id="subject" v-model="activity.subject" placeholder="Enter email subject" fluid />
        </div>

        <div class="form-field">
            <label>Content</label>
            <Editor v-if="activity.type === 'EMAIL'" v-model="activity.content" editorStyle="height: 280px" />
            <template v-else>
                <Textarea v-model="activity.content" rows="6" :placeholder="activity.type === 'SMS' ? 'Enter SMS content...' : 'Enter ZNS content...'" fluid />
                <small class="char-count">Characters: {{ characterCount }}</small>
            </template>
        </div>

        <div class="form-actions">
            <Button label="Cancel" icon="pi pi-times" severity="secondary" text @click="emit('cancel')" />
            <Button :label="isEditMode ? 'Update Activity' : 'Create Activity'" icon="pi pi-check" @click="emit('save')" :loading="loading" />
        </div>
    </div>
</template>

<script setup>
import { computed } from 'vue'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Editor from 'primevue/editor'
import Textarea from 'primevue/textarea'
import DatePicker from 'primevue/datepicker'
import Button from 'primevue/button'
import { ref, onMounted, watch } from 'vue'
import { useCampaignTemplates } from '@/composables/useCampaignTemplates'
import { activityTypeOptions } from '@/constants/campaign'

const props = defineProps({
    modelValue: { type: Object, required: true },
    isEditMode: { type: Boolean, default: false },
    loading: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'save', 'cancel'])

const activity = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
})

const characterCount = computed(() => {
    return activity.value.content ? activity.value.content.length : 0
})

const { templates, fetchTemplates } = useCampaignTemplates()
const filteredTemplates = ref([])
const selectedTemplate = ref(null)

onMounted(async () => {
    await fetchTemplates({ status: 'ACTIVE', limit: 100 })
    filterTemplates()
    
    // If editing and has templateId, pre-select it
    if (activity.value.templateId) {
        selectedTemplate.value = templates.value.find(t => t.id === activity.value.templateId)
    }
})

const filterTemplates = () => {
    filteredTemplates.value = templates.value.filter(t => t.channel === activity.value.type)
    if (selectedTemplate.value && selectedTemplate.value.channel !== activity.value.type) {
        selectedTemplate.value = null
        activity.value.templateId = null
    }
}

const onTypeChange = () => {
    filterTemplates()
}

const onTemplateChange = () => {
    if (selectedTemplate.value) {
        activity.value.templateId = selectedTemplate.value.id
        if (selectedTemplate.value.subject) {
            activity.value.subject = selectedTemplate.value.subject
        }
        if (selectedTemplate.value.content) {
            activity.value.content = selectedTemplate.value.content
        }
    } else {
        activity.value.templateId = null
    }
}

watch(() => activity.value.type, () => {
    filterTemplates()
})
</script>

<style scoped>
.activity-form {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
}

.form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
}

.form-field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
}

.form-field label {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--p-text-color);
}

.required {
    color: var(--p-red-400);
}

.char-count {
    color: var(--p-text-muted-color);
    font-size: 0.75rem;
}

.form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 0.5rem;
}

@media (max-width: 640px) {
    .form-grid {
        grid-template-columns: 1fr;
    }
}
</style>
