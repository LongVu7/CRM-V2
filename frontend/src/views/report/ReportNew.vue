<template>
  <div class="report-new-view">
    <div class="page-header">
      <h1>Submit Error Report</h1>
      <Button label="Back to Reports" severity="secondary" icon="pi pi-arrow-left" @click="$router.push('/reports')" />
    </div>

    <div class="section-card">
      <div class="card-header">
        <h2><i class="pi pi-flag"></i> Report Details</h2>
      </div>

      <div class="form-grid">
        <div class="form-field">
          <label for="report-title">Title *</label>
          <InputText id="report-title" v-model="form.title" placeholder="Brief summary of the error" fluid />
        </div>

        <div class="form-field">
          <label for="report-description">Description</label>
          <Textarea id="report-description" v-model="form.description" rows="5" placeholder="Steps to reproduce, expected vs actual behavior..." fluid />
        </div>

        <div class="form-field">
          <label>Screenshot</label>
          <div 
            class="upload-area" 
            :class="{ 'has-file': preview }"
            @dragover.prevent="isDragging = true"
            @dragleave.prevent="isDragging = false"
            @drop.prevent="onDrop"
            :style="{ borderColor: isDragging ? 'var(--p-primary-color)' : undefined }"
          >
            <div v-if="!preview" class="upload-placeholder" @click="triggerFileInput">
              <i class="pi pi-cloud-upload"></i>
              <span>Drag & drop a screenshot here, or click to browse</span>
              <span class="upload-hint">PNG, JPG up to 5MB</span>
            </div>
            <div v-else class="preview-container">
              <img :src="preview" alt="Preview" class="preview-image" />
              <Button icon="pi pi-times" severity="danger" text rounded size="small" class="remove-btn" @click="removeFile" />
            </div>
            <input ref="fileInput" type="file" accept="image/*" hidden @change="onFileChange" />
          </div>
        </div>
      </div>
    </div>

    <div class="global-actions">
      <Button label="Submit Report" icon="pi pi-check" size="large" @click="submit" :loading="isSubmitting" />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Textarea from 'primevue/textarea'
import { useToast } from 'primevue/usetoast'
import api from '@/services/apiClient'

const router = useRouter()
const toast = useToast()

const form = ref({ title: '', description: '' })
const selectedFile = ref(null)
const preview = ref(null)
const isDragging = ref(false)
const isSubmitting = ref(false)
const fileInput = ref(null)

const triggerFileInput = () => fileInput.value.click()

const handleFile = (file) => {
  if (!file || !file.type.startsWith('image/')) {
    toast.add({ severity: 'warn', summary: 'Invalid file', detail: 'Please select an image file', life: 3000 })
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    toast.add({ severity: 'warn', summary: 'File too large', detail: 'Max file size is 5MB', life: 3000 })
    return
  }
  selectedFile.value = file
  preview.value = URL.createObjectURL(file)
}

const onFileChange = (e) => handleFile(e.target.files[0])
const onDrop = (e) => {
  isDragging.value = false
  handleFile(e.dataTransfer.files[0])
}
const removeFile = () => {
  selectedFile.value = null
  preview.value = null
}

const submit = async () => {
  if (!form.value.title.trim()) {
    toast.add({ severity: 'error', summary: 'Validation', detail: 'Title is required', life: 3000 })
    return
  }

  isSubmitting.value = true
  try {
    const formData = new FormData()
    formData.append('title', form.value.title)
    if (form.value.description) formData.append('description', form.value.description)
    if (selectedFile.value) formData.append('image', selectedFile.value)

    await api.post('/error-reports', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })

    toast.add({ severity: 'success', summary: 'Submitted', detail: 'Report submitted successfully', life: 3000 })
    router.push('/reports')
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Error', detail: error.response?.data?.error || error.message, life: 5000 })
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
.report-new-view { padding: 1.5rem 2rem; max-width: 800px; margin: 0 auto; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
.page-header h1 { font-size: 1.5rem; font-weight: 700; margin: 0; color: var(--p-text-color); }

.section-card {
  background: var(--p-content-background);
  border: 1px solid var(--p-surface-200);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  margin-bottom: 1.5rem;
}
.card-header {
  display: flex; align-items: center; margin-bottom: 1.5rem;
  border-bottom: 1px solid var(--p-surface-100); padding-bottom: 0.75rem;
}
.card-header h2 { font-size: 1.15rem; margin: 0; display: flex; align-items: center; gap: 0.5rem; color: var(--p-text-color); }
.card-header h2 i { color: var(--p-primary-color); }

.form-grid { display: flex; flex-direction: column; gap: 1.25rem; }
.form-field { display: flex; flex-direction: column; gap: 0.4rem; }
.form-field label { font-size: 0.85rem; font-weight: 600; color: var(--p-text-color); }

.upload-area {
  border: 2px dashed var(--p-surface-300);
  border-radius: 10px;
  transition: border-color 0.2s;
  min-height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.upload-area:hover { border-color: var(--p-primary-color); }

.upload-placeholder {
  display: flex; flex-direction: column; align-items: center; gap: 0.5rem;
  padding: 2rem; cursor: pointer; color: var(--p-text-muted-color); text-align: center;
}
.upload-placeholder i { font-size: 2.5rem; color: var(--p-primary-color); }
.upload-hint { font-size: 0.75rem; opacity: 0.6; }

.preview-container { position: relative; padding: 0.75rem; width: 100%; }
.preview-image { max-width: 100%; max-height: 300px; border-radius: 8px; display: block; margin: 0 auto; }
.remove-btn { position: absolute; top: 0.5rem; right: 0.5rem; }

.global-actions { display: flex; justify-content: flex-end; padding-top: 1rem; border-top: 1px solid var(--p-surface-200); }
</style>
