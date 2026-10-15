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
      oldProvinces.value = data?.oldProvinces || (Array.isArray(data) && (!data.length || !('oldProvinceId' in data[0])) ? data : [])
    } catch {
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
      schools.value = data?.schools || (Array.isArray(data) ? data : [])
    } catch {
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
