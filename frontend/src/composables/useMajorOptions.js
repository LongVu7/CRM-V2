import { ref, shallowRef } from 'vue'
import { getStudentOptions } from '@/services/studentService'

export function useMajorOptions() {
  const interestedMajors = ref([])
  const specificMajors = ref([])
  const loadingInterested = shallowRef(false)
  const loadingSpecific = shallowRef(false)

  const fetchInterestedMajors = async () => {
    loadingInterested.value = true
    try {
      const data = await getStudentOptions()
      interestedMajors.value = data.majors || []
    } catch {
      interestedMajors.value = []
    } finally {
      loadingInterested.value = false
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
        const data = await getStudentOptions()
        interestedMajors.value = data.majors || []
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
    interestedMajors,
    specificMajors,
    loadingInterested,
    loadingSpecific,
    fetchInterestedMajors,
    fetchSpecificMajors
  }
}
