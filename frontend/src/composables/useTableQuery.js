import { ref } from 'vue'

export function useTableQuery(fetchFn, defaultParams = {}) {
  const currentParams = ref({
    page: 1,
    limit: 20,
    search: '',
    sortField: null,
    sortOrder: null,
    ...defaultParams
  })

  const loadData = () => fetchFn(currentParams.value)

  const onPageChange = ({ page, limit }) => {
    currentParams.value.page = page
    currentParams.value.limit = limit
    return loadData()
  }

  const onSearch = (searchQuery) => {
    currentParams.value.search = searchQuery
    currentParams.value.page = 1
    return loadData()
  }

  const onSort = ({ sortField, sortOrder }) => {
    currentParams.value.sortField = sortField
    currentParams.value.sortOrder = sortOrder
    currentParams.value.page = 1
    return loadData()
  }

  const onFilter = (filters) => {
    currentParams.value = { ...currentParams.value, ...filters, page: 1 }
    return loadData()
  }

  return {
    currentParams,
    loadData,
    onPageChange,
    onSearch,
    onSort,
    onFilter
  }
}
