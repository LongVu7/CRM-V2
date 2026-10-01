import { ref } from 'vue'
import { getAllNewProvinces } from '@/services/schoolService'

export function useNewProvinceOptions() {
  const newProvinces = ref([])
  const loadingNewProvinces = ref(false)

  const fetchNewProvinces = async () => {
    loadingNewProvinces.value = true
    try {
      newProvinces.value = await getAllNewProvinces()
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
