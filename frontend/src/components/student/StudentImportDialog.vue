<template>
  <Dialog
    :visible="visible"
    @update:visible="$emit('update:visible', $event)"
    header="Import Students"
    modal
    :style="{ width: '80vw', maxWidth: '1000px' }"
    :contentStyle="{ padding: '1rem' }"
  >
    <StudentImport @cancel="$emit('update:visible', false)" @success="onSuccess" />
  </Dialog>
</template>

<script setup>
import Dialog from 'primevue/dialog'
import StudentImport from '@/components/student/StudentImport.vue'

const props = defineProps({
  visible: { type: Boolean, default: false }
})

const emit = defineEmits(['update:visible', 'success'])

const onSuccess = () => {
  emit('update:visible', false)
  emit('success')
}
</script>

<style scoped>
/* Any additional overrides for dialog layout if needed */
</style>
