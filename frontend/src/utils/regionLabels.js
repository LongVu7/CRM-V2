import { provinceGroupOptions } from '@/constants/region'

function buildLabelMap(options) {
  const map = {}
  for (const opt of options) {
    map[opt.value] = opt.label
  }
  return map
}

const provinceGroupLabelMap = buildLabelMap(provinceGroupOptions)

export const getProvinceGroupLabel = (value) => provinceGroupLabelMap[value] || value || '—'
