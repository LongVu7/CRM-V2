import { ref } from 'vue'
import { searchStudents as apiSearchStudents } from '@/services/inquiryService'

export function useStudentSearch() {
  const studentSuggestions = ref([])

  const searchStudents = async (query) => {
    if (!query || query.length < 1) return []
    try {
      studentSuggestions.value = await apiSearchStudents(query)
      return studentSuggestions.value
    } catch {
      studentSuggestions.value = []
      return []
    }
  }

  return {
    studentSuggestions,
    searchStudents
  }
}
