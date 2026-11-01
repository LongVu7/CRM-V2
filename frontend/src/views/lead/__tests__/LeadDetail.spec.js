import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import PrimeVue from 'primevue/config'
import Tooltip from 'primevue/tooltip'
import LeadDetail from '../LeadDetail.vue'

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { id: '121' } }),
  useRouter: () => ({ push: vi.fn() })
}))

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }))
})

vi.mock('@/services/voipService', () => ({
  checkCallReadiness: vi.fn().mockResolvedValue({ canCall: false, reason: null, message: '' }),
  getStringeeToken: vi.fn().mockResolvedValue({ token: 'mock' }),
  createCall: vi.fn(),
  updateCall: vi.fn()
}))

vi.mock('@/services/leadService', () => ({
  getLeadById: vi.fn().mockResolvedValue({
    id: 121,
    fullName: 'Zxcvzxvzxcvzx',
    gender: 'Unknown',
    mobile: '0357865444',
    email: 'longvu123@tetst.com',
    schoolId: 873,
    oldProvinceId: 51,
    newProvinceId: 32,
    countryId: 241,
    provinceGroup: 'FOREIGN',
    schoolType: 'NONE',
    class: 'NONE',
    interestedMajorId: 1,
    specificMajorId: 13,
    gpa: 'G12_21_TO_23',
    programScore: 'NOT_ELIGIBLE',
    sourceDataId: 257,
    statusDataId: 52,
    assignedToId: 49,
    assignedTo: { id: 49, fullName: 'KhanhTN24@fe.edu.vn', email: 'tuvan2@tuvan.com' }
  }),
  getLeadOptions: vi.fn().mockResolvedValue({
    sources: [],
    statuses: []
  }),
  getLeadStatusHistory: vi.fn().mockResolvedValue([]),
  searchAccounts: vi.fn().mockResolvedValue([])
}))

vi.mock('@/services/schoolService', () => ({
  getSchoolOptions: vi.fn().mockResolvedValue({
    oldProvinces: [],
    schools: []
  })
}))

vi.mock('@/services/studentService', () => ({
  getStudentOptions: vi.fn().mockResolvedValue({
    newProvinces: [],
    countries: [],
    majors: []
  })
}))

vi.mock('primevue/usetoast', () => ({
  useToast: () => ({ add: vi.fn() })
}))

describe('LeadDetail mount check', () => {
  it('mounts LeadDetail without crashing', async () => {
    const wrapper = mount(LeadDetail, {
      global: {
        plugins: [PrimeVue],
        directives: { tooltip: Tooltip },
        mocks: {
          $route: { params: { id: '121' } },
          $can: () => true,
          $t: (k) => k
        }
      }
    })

    // Wait for onMounted
    await new Promise(r => setTimeout(r, 100))
    await wrapper.vm.$nextTick()
    await new Promise(r => setTimeout(r, 100))
    await wrapper.vm.$nextTick()

    console.log('Wrapper HTML length:', wrapper.html().length)
    expect(wrapper.find('.cards-container').exists()).toBe(true)
  })
})
