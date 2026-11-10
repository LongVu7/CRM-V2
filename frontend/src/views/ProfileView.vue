<template>
  <div class="profile-view">
    <div class="page-header">
      <div class="header-left">
        <h1><i class="pi pi-user"></i> My Profile</h1>
        <Tag :value="user?.roleName || 'Staff'" severity="info" rounded />
      </div>
      <Button label="Back" icon="pi pi-arrow-left" severity="secondary" @click="$router.back()" />
    </div>

    <div class="profile-grid">
      <!-- Profile Information Card -->
      <div class="section-card">
        <div class="card-header">
          <h2><i class="pi pi-id-card"></i> Account Information</h2>
          <Button
            v-if="!isEditingName"
            icon="pi pi-pencil"
            label="Edit Name"
            size="small"
            text
            @click="startEditName"
          />
        </div>

        <div class="profile-avatar-row">
          <div class="avatar-large">
            <i class="pi pi-user"></i>
          </div>
          <div class="avatar-meta">
            <h3>{{ user?.fullName || 'User' }}</h3>
            <span class="user-email">{{ user?.email }}</span>
          </div>
        </div>

        <div class="info-list">
          <div class="info-item">
            <span class="info-label">Full Name</span>
            <div v-if="isEditingName" class="edit-name-row">
              <InputText v-model="nameInput" size="small" placeholder="Enter your full name" />
              <Button icon="pi pi-check" size="small" :loading="savingName" @click="handleUpdateName" />
              <Button icon="pi pi-times" size="small" severity="secondary" text @click="isEditingName = false" />
            </div>
            <span v-else class="info-value">{{ user?.fullName || '—' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Email Address</span>
            <span class="info-value">{{ user?.email || '—' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">System Role</span>
            <span class="info-value">
              <Tag :value="user?.roleName || 'Staff'" :severity="user?.isAdmin ? 'danger' : 'info'" />
            </span>
          </div>
          <div class="info-item">
            <span class="info-label">Account Status</span>
            <span class="info-value">
              <Tag value="Active" severity="success" />
            </span>
          </div>
          <div class="info-item" v-if="user?.memberTeamId || user?.ledTeamIds?.length">
            <span class="info-label">Team Assignment</span>
            <span class="info-value">
              <span v-if="user?.ledTeamIds?.length" class="team-badge leader">
                <i class="pi pi-star-fill"></i> Team Leader
              </span>
              <span v-else class="team-badge">
                <i class="pi pi-users"></i> Team Member
              </span>
            </span>
          </div>
        </div>
      </div>

      <!-- Security / Change Password Card -->
      <div class="section-card">
        <div class="card-header">
          <h2><i class="pi pi-lock"></i> Change Password</h2>
          <p class="section-desc">Change your default or current password to keep your account secure.</p>
        </div>

        <form @submit.prevent="handlePasswordSubmit" class="password-form">
          <div class="form-field">
            <label for="current-password">Current Password</label>
            <Password
              id="current-password"
              v-model="passwordForm.currentPassword"
              placeholder="Enter current password"
              :feedback="false"
              toggleMask
              fluid
              :invalid="!!errors.currentPassword"
            />
            <small v-if="errors.currentPassword" class="form-error">{{ errors.currentPassword }}</small>
          </div>

          <div class="form-field">
            <label for="new-password">New Password</label>
            <Password
              id="new-password"
              v-model="passwordForm.newPassword"
              placeholder="Enter new password"
              toggleMask
              fluid
              :invalid="!!errors.newPassword"
            />
            <small v-if="errors.newPassword" class="form-error">{{ errors.newPassword }}</small>
          </div>

          <div class="form-field">
            <label for="confirm-password">Confirm New Password</label>
            <Password
              id="confirm-password"
              v-model="passwordForm.confirmPassword"
              placeholder="Confirm new password"
              :feedback="false"
              toggleMask
              fluid
              :invalid="!!errors.confirmPassword"
            />
            <small v-if="errors.confirmPassword" class="form-error">{{ errors.confirmPassword }}</small>
            <small v-else class="form-hint">At least 6 characters with a mix of letters and numbers recommended.</small>

          </div>

          <div class="form-actions">
            <Button
              type="submit"
              label="Update Password"
              icon="pi pi-check"
              :loading="saving"
            />
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Password from 'primevue/password'
import InputText from 'primevue/inputtext'
import { useToast } from 'primevue/usetoast'
import { useAuthStore } from '@/stores/auth'
import { changePassword, updateProfile } from '@/services/authService'

const authStore = useAuthStore()
const toast = useToast()

const user = computed(() => authStore.user)

onMounted(async () => {
  await authStore.checkAuth()
})

// Profile editing
const isEditingName = ref(false)
const nameInput = ref('')
const savingName = ref(false)

const startEditName = () => {
  nameInput.value = user.value?.fullName || ''
  isEditingName.value = true
}

const handleUpdateName = async () => {
  if (!nameInput.value.trim()) {
    toast.add({ severity: 'error', summary: 'Validation Error', detail: 'Full Name cannot be empty', life: 3000 })
    return
  }
  savingName.value = true
  try {
    const res = await updateProfile({ fullName: nameInput.value.trim() })
    authStore.user = res.user
    isEditingName.value = false
    toast.add({ severity: 'success', summary: 'Success', detail: 'Profile updated successfully', life: 3000 })
  } catch (err) {
    const msg = err.response?.data?.error || err.message || 'Failed to update profile'
    toast.add({ severity: 'error', summary: 'Error', detail: msg, life: 4000 })
  } finally {
    savingName.value = false
  }
}

// Password change
const saving = ref(false)
const errors = ref({})
const passwordForm = ref({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const validate = () => {
  const e = {}
  if (!passwordForm.value.currentPassword) {
    e.currentPassword = 'Current password is required'
  }
  if (!passwordForm.value.newPassword) {
    e.newPassword = 'New password is required'
  } else if (passwordForm.value.newPassword.length < 6) {
    e.newPassword = 'Password must be at least 6 characters'
  }
  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    e.confirmPassword = 'Passwords do not match'
  }
  errors.value = e
  return Object.keys(e).length === 0
}

const handlePasswordSubmit = async () => {
  if (!validate()) return
  saving.value = true
  try {
    await changePassword(passwordForm.value.currentPassword, passwordForm.value.newPassword)
    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Password updated successfully',
      life: 4000
    })
    passwordForm.value = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }
    errors.value = {}
  } catch (err) {
    const msg = err.response?.data?.error || err.message || 'Failed to update password'
    toast.add({
      severity: 'error',
      summary: 'Password Change Failed',
      detail: msg,
      life: 4000
    })
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.profile-view {
  padding: 1.5rem 2rem;
  max-width: 1000px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.header-left h1 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
  color: var(--p-text-color);
}

.header-left h1 i {
  color: var(--p-primary-color);
}

.profile-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

.section-card {
  background: var(--p-content-background);
  border: 1px solid var(--p-surface-200);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.card-header h2 {
  font-size: 1.15rem;
  font-weight: 600;
  margin: 0 0 0.35rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--p-text-color);
}

.card-header h2 i {
  color: var(--p-primary-color);
}

.section-desc {
  margin: 0 0 1.25rem 0;
  font-size: 0.85rem;
  color: var(--p-text-muted-color);
}

.profile-avatar-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 0 1.25rem 0;
  border-bottom: 1px solid var(--p-surface-100);
  margin-bottom: 1rem;
}

.avatar-large {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--p-primary-50);
  color: var(--p-primary-color);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  border: 1px solid var(--p-primary-200);
}

.avatar-meta h3 {
  margin: 0 0 0.25rem 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--p-text-color);
}

.user-email {
  font-size: 0.875rem;
  color: var(--p-text-muted-color);
}

.info-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--p-surface-100);
}

.edit-name-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.info-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.info-label {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--p-text-muted-color);
}

.info-value {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--p-text-color);
}

.team-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8rem;
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
  background: var(--p-surface-100);
  color: var(--p-surface-800);
}

.team-badge.leader {
  background: #fef3c7;
  color: #92400e;
}

.password-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.form-field label {
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--p-text-color);
}

.form-hint {
  font-size: 0.78rem;
  color: var(--p-text-muted-color);
}

.form-error {
  font-size: 0.8rem;
  color: var(--p-red-500);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.5rem;
}

@media (max-width: 768px) {
  .profile-grid {
    grid-template-columns: 1fr;
  }
  .profile-view {
    padding: 1rem;
  }
}
</style>

