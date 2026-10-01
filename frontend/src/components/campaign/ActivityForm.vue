<template>
    <div class="p-fluid">
        <div class="formgrid grid">
            <div class="field col">
                <label for="actType">Type *</label>
                <Select id="actType" v-model="activity.type" :options="activityTypeOptions" optionLabel="label" optionValue="value" :disabled="isEditMode" @change="onTypeChange" />
            </div>
            <div class="field col">
                <label for="actName">Activity Name *</label>
                <InputText id="actName" v-model="activity.name" />
            </div>
        </div>

        <div class="field" v-if="filteredTemplates.length > 0">
            <label for="template">Use Template (Optional)</label>
            <Select 
              id="template" 
              v-model="selectedTemplate" 
              :options="filteredTemplates" 
              optionLabel="name" 
              placeholder="Select a template to auto-fill" 
              showClear
              @change="onTemplateChange" 
            />
        </div>

        <div v-if="activity.type === 'EMAIL'" class="field">
            <label for="subject">Email Subject</label>
            <InputText id="subject" v-model="activity.subject" />
        </div>

        <div class="field">
            <label>Content</label>
            <p class="text-500 mb-2 text-sm">Use variables: {{fullName}}, {{email}}, {{mobile}}</p>

            <div v-if="activity.type === 'EMAIL'">
                <Editor v-model="activity.content" editorStyle="height: 280px" />
            </div>
            <div v-else>
                <Textarea v-model="activity.content" rows="6" :placeholder="activity.type === 'SMS' ? 'Enter SMS content...' : 'Enter ZNS content...'" />
                <small class="text-500 block mt-1">Characters: {{ characterCount }}</small>
            </div>
        </div>

        <div class="field">
            <label for="scheduledAt">Scheduled At</label>
            <DatePicker id="scheduledAt" v-model="activity.scheduledAt" showTime dateFormat="dd/mm/yy" showIcon />
        </div>

        <div class="flex justify-content-end gap-2 mt-3">
            <Button label="Cancel" icon="pi pi-times" class="p-button-text" @click="emit('cancel')" />
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
