<script setup>
import { ref } from 'vue'
import FileUpload from 'primevue/fileupload'

const props = defineProps({
  isUploading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['upload'])

const fileUpload = ref(null)

const onUpload = (event) => {
  const files = event.files
  if (!files || files.length === 0) return
  emit('upload', files[0])
}

const clear = () => {
  if (fileUpload.value) {
    fileUpload.value.clear()
  }
}

defineExpose({ clear })
</script>

<template>
  <div>
    <div class="import-info">
      <i class="pi pi-info-circle"></i>
      <p>Upload a single Excel file (<code>.xlsx</code>, <code>.xls</code>) matching the official template. The system will create new students or map inquiries to existing students.</p>
    </div>
    <FileUpload
      name="excelFile"
      accept=".xlsx, .xls"
      :multiple="false"
      :maxFileSize="10000000"
      chooseLabel="Choose Excel File"
      :auto="false"
      customUpload
      ref="fileUpload"
      @uploader="onUpload"
      :disabled="isUploading"
    >
      <template #empty>
        <div class="upload-empty">
          <i class="pi pi-file-excel"></i>
          <span>Drag and drop a file here to upload.</span>
        </div>
      </template>
    </FileUpload>
  </div>
</template>

<style scoped>
.import-info {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  background: var(--p-blue-50);
  border-radius: 8px;
  margin-bottom: 1rem;
  border: 1px solid var(--p-blue-200);
}

.import-info i {
  color: var(--p-blue-500);
  font-size: 1.25rem;
  margin-top: 0.1rem;
}

.import-info p {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.5;
}

.upload-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem 1rem;
  gap: 0.5rem;
  color: var(--p-text-muted-color);
}

.upload-empty i {
  font-size: 2rem;
  color: var(--p-green-400);
}
</style>
