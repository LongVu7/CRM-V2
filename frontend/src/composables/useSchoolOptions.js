import { ref } from 'vue'
import { getSchoolOptions } from '@/services/schoolService'

export function useSchoolOptions() {
  const oldProvinces = ref([])
  const schools = ref([])
  const loadingOldProvinces = ref(false)
  const loadingSchools = ref(false)

  const fetchOldProvinces = async () => {
    loadingOldProvinces.value = true
    try {
      const data = await getSchoolOptions()
      oldProvinces.value = Array.isArray(data) ? data : data.oldProvinces || []
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
      const data = await getSchoolOptions(oldProvinceId)
      schools.value = Array.isArray(data) ? data : data.schools || []
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
