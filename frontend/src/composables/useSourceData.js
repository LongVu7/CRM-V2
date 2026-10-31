import { ref } from 'vue'
import { getLeadOptions } from '@/services/leadService'

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
      const data = await getLeadOptions()
      sources.value = data.sources || []
    } catch {
      sources.value = []
    } finally {
      loadingSources.value = false
    }
  }

  const getSourceChildren = (sourceId) => {
    const found = sources.value.find((s) => s.id === Number(sourceId))
    return found?.children || []
  }

  const fetchSourceDetails = async (sourceId) => {
    if (!sourceId) {
      sourceDetails.value = []
      return
    }
    loadingSourceDetails.value = true
    try {
      if (!sources.value.length) {
        await fetchSources()
      }
      sourceDetails.value = getSourceChildren(sourceId)
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
      const detail = sourceDetails.value.find((d) => d.id === Number(sourceDetailId))
      approachMethods.value = detail?.children || []
    } finally {
      loadingMethods.value = false
    }
  }

  const findSourceNode = (nodeId) => {
    const id = Number(nodeId)
    for (const s of sources.value) {
      if (s.id === id) return { node: s, sourceId: s.id, detailId: null, methodId: null }
      for (const d of s.children || []) {
        if (d.id === id) return { node: d, sourceId: s.id, detailId: d.id, methodId: null }
        for (const a of d.children || []) {
          if (a.id === id) return { node: a, sourceId: s.id, detailId: d.id, methodId: a.id }
        }
      }
    }
    return null
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
    fetchApproachMethods,
    getSourceChildren,
    findSourceNode
  }
}
