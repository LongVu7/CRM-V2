import { ref } from 'vue'
import { getStudentOptions } from '@/services/studentService'
import { getAllCountries } from '@/services/schoolService'

export function useCountryOptions() {
  const countries = ref([])
  const loadingCountries = ref(false)

  const fetchCountries = async () => {
    loadingCountries.value = true
    try {
      const data = await getStudentOptions()
      if (data?.countries?.length) {
        countries.value = data.countries
      } else {
        countries.value = await getAllCountries()
      }
    } catch {
      try {
        countries.value = await getAllCountries()
      } catch {
        countries.value = []
      }
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

