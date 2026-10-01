import { ref } from 'vue'
import { getRootOptions, getChildrenById } from '@/services/sourceDataService'

export function useSourceData() {
  const sources = ref([])
  const sourceDetails = ref([])
  const approachMethods = ref([])
  const loadingSources = ref(false)
  const loadingSourceDetails = ref(false)
  const loadingMethods = ref(false)

  const fetchSources = async () => {
    loadingSources.value = true
    try {
      sources.value = await getRootOptions()
    } catch {
      sources.value = []
    } finally {
      loadingSources.value = false
    }
  }

  const fetchSourceDetails = async (sourceId) => {
    if (!sourceId) {
      sourceDetails.value = []
      return
    }
    loadingSourceDetails.value = true
    try {
      sourceDetails.value = await getChildrenById(sourceId)
    } catch {
      sourceDetails.value = []
    } finally {
      loadingSourceDetails.value = false
    }
  }

  const fetchApproachMethods = async (sourceDetailId) => {
    if (!sourceDetailId) {
      approachMethods.value = []
      return
    }
    loadingMethods.value = true
    try {
      approachMethods.value = await getChildrenById(sourceDetailId)
    } catch {
      approachMethods.value = []
    } finally {
      loadingMethods.value = false
    }
  }

  return {
    sources,
    sourceDetails,
    approachMethods,
    loadingSources,
    loadingSourceDetails,
    loadingMethods,
    fetchSources,
    fetchSourceDetails,
    fetchApproachMethods
  }
}
