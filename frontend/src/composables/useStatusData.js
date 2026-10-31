import { ref } from 'vue'
import { getLeadOptions } from '@/services/leadService'

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
      const data = await getLeadOptions()
      interactions.value = data.statuses || []
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
      if (!interactions.value.length) {
        await fetchInteractions()
      }
      const item = interactions.value.find((i) => i.id === Number(interactionId))
      generals.value = item?.children || []
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
      const item = generals.value.find((g) => g.id === Number(generalId))
      details.value = item?.children || []
    } finally {
      loadingStatusDetails.value = false
    }
  }

  const findStatusNode = (nodeId) => {
    const id = Number(nodeId)
    for (const i of interactions.value) {
      if (i.id === id) return { node: i, interactionId: i.id, generalId: null, detailId: null }
      for (const g of i.children || []) {
        if (g.id === id) return { node: g, interactionId: i.id, generalId: g.id, detailId: null }
        for (const d of g.children || []) {
          if (d.id === id) return { node: d, interactionId: i.id, generalId: g.id, detailId: d.id }
        }
      }
    }
    return null
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
    fetchDetails,
    findStatusNode
  }
}
