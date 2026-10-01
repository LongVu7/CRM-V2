import { ref, watch } from 'vue'
import { getAllOldProvinces, getSchoolOptions } from '@/services/schoolService'

export function useSchoolOptions() {
  const oldProvinces = ref([])
  const schools = ref([])
  const loadingOldProvinces = ref(false)
  const loadingSchools = ref(false)

  const fetchOldProvinces = async () => {
    loadingOldProvinces.value = true
    try {
      oldProvinces.value = await getAllOldProvinces()
    } catch (err) {
      oldProvinces.value = []
    } finally {
      loadingOldProvinces.value = false
    }
  }

  const fetchSchools = async (oldProvinceId) => {
    if (!oldProvinceId) {
      schools.value = []
      return
    }
    loadingSchools.value = true
    try {
      schools.value = await getSchoolOptions(oldProvinceId)
    } catch (err) {
      schools.value = []
    } finally {
      loadingSchools.value = false
    }
  }

  return {
    oldProvinces,
    schools,
    loadingOldProvinces,
    loadingSchools,
    fetchOldProvinces,
    fetchSchools
  }
}
