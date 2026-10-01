import { ref, shallowRef } from 'vue'
import { getRootMajors, getMajorChildrenById } from '@/services/majorDataService'

export function useMajorOptions() {
  const interestedMajors = ref([])
  const specificMajors = ref([])
  const loadingInterested = shallowRef(false)
  const loadingSpecific = shallowRef(false)

  const fetchInterestedMajors = async () => {
    loadingInterested.value = true
    try {
      interestedMajors.value = await getRootMajors()
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
      specificMajors.value = await getMajorChildrenById(parentId)
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
