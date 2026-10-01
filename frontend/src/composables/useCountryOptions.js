import { ref } from 'vue'
import { getAllCountries } from '@/services/schoolService'

export function useCountryOptions() {
  const countries = ref([])
  const loadingCountries = ref(false)

  const fetchCountries = async () => {
    loadingCountries.value = true
    try {
      countries.value = await getAllCountries()
    } catch (err) {
      countries.value = []
    } finally {
      loadingCountries.value = false
    }
  }

  return {
    countries,
    loadingCountries,
    fetchCountries
  }
}
