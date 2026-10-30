import { ref, shallowRef } from 'vue'
import { getStudentOptions } from '@/services/studentService'

export function useStudentOptions() {
  const newProvinces = ref([])
  const countries = ref([])
  const interestedMajors = ref([])
  const specificMajors = ref([])
  const loadingOptions = shallowRef(false)
  const loadingSpecific = shallowRef(false)

  const fetchStudentOptions = async () => {
    loadingOptions.value = true
    try {
      const data = await getStudentOptions()
      newProvinces.value = data?.newProvinces || []
      countries.value = data?.countries || []
      interestedMajors.value = data?.majors || []
    } catch {
      newProvinces.value = []
      countries.value = []
      interestedMajors.value = []
    } finally {
      loadingOptions.value = false
    }
  }

  const fetchSpecificMajors = async (parentId) => {
    if (!parentId) {
      specificMajors.value = []
      return
    }
    loadingSpecific.value = true
    try {
      if (!interestedMajors.value.length) {
        await fetchStudentOptions()
      }
      const parent = interestedMajors.value.find((m) => m.id === Number(parentId))
      specificMajors.value = parent?.children || []
    } catch {
      specificMajors.value = []
    } finally {
      loadingSpecific.value = false
    }
  }

  return {
    newProvinces,
    countries,
    interestedMajors,
    specificMajors,
    loadingOptions,
    loadingSpecific,
    fetchStudentOptions,
    fetchSpecificMajors
  }
}
