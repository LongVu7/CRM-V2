import { ref } from 'vue'
import { getRootOptions, getChildrenById } from '@/services/statusDataService'

export function useStatusData() {
  const interactions = ref([])
  const generals = ref([])
  const details = ref([])
  const loadingInteractions = ref(false)
  const loadingGenerals = ref(false)
  const loadingStatusDetails = ref(false)

  const fetchInteractions = async () => {
    loadingInteractions.value = true
    try {
      interactions.value = await getRootOptions()
    } catch {
      interactions.value = []
    } finally {
      loadingInteractions.value = false
    }
  }

  const fetchGenerals = async (interactionId) => {
    if (!interactionId) {
      generals.value = []
      return
    }
    loadingGenerals.value = true
    try {
      generals.value = await getChildrenById(interactionId)
    } catch {
      generals.value = []
    } finally {
      loadingGenerals.value = false
    }
  }

  const fetchDetails = async (generalId) => {
    if (!generalId) {
      details.value = []
      return
    }
    loadingStatusDetails.value = true
    try {
      details.value = await getChildrenById(generalId)
    } catch {
      details.value = []
    } finally {
      loadingStatusDetails.value = false
    }
  }

  return {
    interactions,
    generals,
    details,
    loadingInteractions,
    loadingGenerals,
    loadingStatusDetails,
    fetchInteractions,
    fetchGenerals,
    fetchDetails
  }
}
