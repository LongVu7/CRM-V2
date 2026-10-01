<template>
    <div class="form-grid">
        <div class="form-field">
            <label for="name">Campaign Name *</label>
            <InputText id="name" v-model="campaign.name" required autofocus />
        </div>

        <div class="form-field">
            <label for="description">Description</label>
            <Textarea id="description" v-model="campaign.description" rows="3" />
        </div>

        <div class="form-field">
            <div class="form-field">
                <label for="owner">Campaign Owner *</label>
                <Select id="owner" v-model="campaign.ownerId" :options="accounts" optionLabel="fullName" optionValue="id" placeholder="Select owner" filter />
            </div>
            <div class="form-field">
                <label for="status">Status *</label>
                <Select id="status" v-model="campaign.status" :options="campaignStatusOptions" optionLabel="label" optionValue="value" />
            </div>
        </div>

        <div class="form-field">
            <div class="form-field">
                <label for="startDate">Start Date *</label>
                <DatePicker id="startDate" v-model="campaign.startDate" dateFormat="dd/mm/yy" showIcon />
            </div>
            <div class="form-field">
                <label for="endDate">End Date</label>
                <DatePicker id="endDate" v-model="campaign.endDate" dateFormat="dd/mm/yy" showIcon />
            </div>
        </div>

        <div class="form-field">
            <label for="notes">Notes</label>
            <Textarea id="notes" v-model="campaign.notes" rows="2" />
        </div>

    </div>
    <div class="form-actions">
        <Button label="Cancel" icon="pi pi-times" class="p-button-text" @click="emit('cancel')" />
        <Button :label="isEditMode ? 'Update Campaign' : 'Create Campaign'" icon="pi pi-check" @click="emit('save')" :loading="loading" />
    </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Textarea from 'primevue/textarea'
import DatePicker from 'primevue/datepicker'
import Button from 'primevue/button'
import { getAllAccounts } from '@/services/accountService'
import { campaignStatusOptions } from '@/constants/campaign'

const props = defineProps({
    modelValue: { type: Object, required: true },
    isEditMode: { type: Boolean, default: false },
    loading: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'save', 'cancel'])

const campaign = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
})

const accounts = ref([])

onMounted(async () => {
    try {
        accounts.value = await getAllAccounts()
    } catch (e) {
        // Accounts fail silently — dropdown just stays empty
    }
})
</script>


<style scoped>
.account-form {
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

.form-error {
  color: var(--p-red-400);
  font-size: 0.75rem;
}

.toggle-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding-top: 0.25rem;
}

.toggle-label {
  font-size: 0.9rem;
  color: var(--p-text-color);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.5rem;
}

@media (max-width: 640px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
