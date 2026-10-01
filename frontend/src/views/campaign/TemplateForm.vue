<template>
  <div class="template-form">
    <div class="field-row">
      <div class="field col-6">
        <label for="name">Template Name *</label>
        <InputText id="name" v-model="formData.name" placeholder="E.g., Welcome Email" class="w-full" :class="{ 'p-invalid': errors.name }" />
        <small class="p-error" v-if="errors.name">{{ errors.name }}</small>
      </div>

      <div class="field col-3">
        <label for="channel">Channel *</label>
        <Select id="channel" v-model="formData.channel" :options="channelOptions" optionLabel="label" optionValue="value" class="w-full" :disabled="isEditMode" />
      </div>

      <div class="field col-3">
        <label for="status">Status</label>
        <Select id="status" v-model="formData.status" :options="statusOptions" optionLabel="label" optionValue="value" class="w-full" />
      </div>
    </div>

    <div class="field" v-if="formData.channel === 'EMAIL'">
      <label for="subject">Subject Line *</label>
      <InputText id="subject" v-model="formData.subject" placeholder="Email Subject" class="w-full" :class="{ 'p-invalid': errors.subject }" />
      <small class="p-error" v-if="errors.subject">{{ errors.subject }}</small>
    </div>

    <div class="field">
      <div class="content-header">
        <label for="content">Template Content *</label>
        <div class="variables-toolbar">
          <span class="toolbar-label">Insert Variable:</span>
          <Button 
            v-for="v in variables" 
            :key="v" 
            :label="`{{${v}}}`" 
            size="small" 
            severity="secondary" 
            outlined
            class="variable-btn"
            @click="insertVariable(v)"
            v-tooltip.top="'Click to insert'"
          />
        </div>
      </div>
      <Textarea 
        id="content" 
        v-model="formData.content" 
        rows="8" 
        class="w-full font-mono" 
        :class="{ 'p-invalid': errors.content }"
        placeholder="Dear {{fullName}},\n\nWelcome to our campaign..."
      />
      <small class="p-error" v-if="errors.content">{{ errors.content }}</small>
    </div>

    <div class="form-actions">
      <Button label="Cancel" icon="pi pi-times" severity="secondary" text @click="$emit('cancel')" />
      <Button label="Save Template" icon="pi pi-check" @click="save" :loading="loading" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Textarea from 'primevue/textarea'
import Button from 'primevue/button'
import { useCampaignTemplates } from '@/composables/useCampaignTemplates'

const props = defineProps({
  initialData: { type: Object, default: null }
})

const emit = defineEmits(['saved', 'cancel'])
const toast = useToast()
const { saveTemplate, fetchVariables, variables, loading } = useCampaignTemplates()

const isEditMode = computed(() => !!props.initialData?.id)

const channelOptions = [
  { label: 'Email', value: 'EMAIL' },
  { label: 'SMS', value: 'SMS' },
  { label: 'ZNS', value: 'ZNS' }
]

const statusOptions = [
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Archived', value: 'ARCHIVED' }
]

const formData = ref({
  id: null,
  name: '',
  channel: 'EMAIL',
  status: 'ACTIVE',
  subject: '',
  content: ''
})

const errors = ref({})

onMounted(async () => {
  await fetchVariables()
  if (props.initialData) {
    formData.value = { ...props.initialData }
  }
})

const insertVariable = (variable) => {
  const insertText = `{{${variable}}}`
  // Simple append for now. In a real rich-text editor, it would insert at cursor.
  formData.value.content = formData.value.content ? `${formData.value.content} ${insertText}` : insertText
}

const validate = () => {
  errors.value = {}
  let isValid = true

  if (!formData.value.name) {
    errors.value.name = 'Name is required'
    isValid = false
  }
  if (formData.value.channel === 'EMAIL' && !formData.value.subject) {
    errors.value.subject = 'Subject is required for EMAIL'
    isValid = false
  }
  if (!formData.value.content) {
    errors.value.content = 'Content is required'
    isValid = false
  } else {
    // Frontend regex validation against loaded variables (optional but good UX)
    const regex = /\{\{([^}]+)\}\}/g;
    let match;
    const unknownVars = [];
    while ((match = regex.exec(formData.value.content)) !== null) {
      const varName = match[1].trim();
      if (!variables.value.includes(varName)) {
        unknownVars.push(varName);
      }
    }
    if (unknownVars.length > 0) {
      errors.value.content = `Unknown variables: ${unknownVars.join(', ')}`
      isValid = false
    }
  }

  return isValid
}

const save = async () => {
  if (!validate()) return

  const payload = { ...formData.value }
  if (payload.channel !== 'EMAIL') {
    delete payload.subject // Ensure it's not sent or is null
  }

  try {
    await saveTemplate(payload)
    toast.add({ severity: 'success', summary: 'Success', detail: 'Template saved successfully', life: 3000 })
    emit('saved')
  } catch (err) {
    toast.add({ severity: 'error', summary: 'Validation Error', detail: err, life: 5000 })
  }
}
</script>

<style scoped>
.template-form { display: flex; flex-direction: column; gap: 1.5rem; }
.field-row { display: flex; flex-wrap: wrap; margin: -0.5rem; }
.field { padding: 0.5rem; display: flex; flex-direction: column; gap: 0.5rem; }
.col-6 { width: 50%; }
.col-3 { width: 25%; }
label { font-weight: 600; color: var(--p-text-color); font-size: 0.9rem; }
.w-full { width: 100%; }
.font-mono { font-family: monospace; font-size: 0.95rem; }

.content-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 0.5rem; }
.variables-toolbar { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; }
.toolbar-label { font-size: 0.8rem; color: var(--p-text-muted-color); }
.variable-btn { padding: 0.2rem 0.5rem; font-family: monospace; font-size: 0.8rem; border-radius: 4px; }

.form-actions { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--p-surface-200); }
</style>
