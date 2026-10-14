import { ref } from 'vue'
import { getStudentOptions } from '@/services/studentService'

export function useNewProvinceOptions() {
  const newProvinces = ref([])
  const loadingNewProvinces = ref(false)

  const fetchNewProvinces = async () => {
    loadingNewProvinces.value = true
    try {
      const data = await getStudentOptions()
      newProvinces.value = data.newProvinces || []
    } catch (err) {
      newProvinces.value = []
    } finally {
      loadingNewProvinces.value = false
    }
  }

  return {
    newProvinces,
    loadingNewProvinces,
    fetchNewProvinces
  }
}
