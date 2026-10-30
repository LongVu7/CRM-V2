// ─── Enum Mapping Tables and Display Labels ─────────────────────────
// Defines normalization maps from external import formats to Prisma enums,
// as well as display labels for human-readable output.

// Enum values: HO_CHI_MINH, CORE_PROVINCE, OTHER_PROVINCE, FOREIGN
const PROVINCE_MAP = {  
  'TP_HCM': 'HO_CHI_MINH',
  'HO_CHI_MINH': 'HO_CHI_MINH',
  'TINH_RUOT': 'CORE_PROVINCE',
  'CORE_PROVINCE': 'CORE_PROVINCE',
  'TINH_NGOAI': 'OTHER_PROVINCE',
  'OTHER_PROVINCE': 'OTHER_PROVINCE',
  'NUOC_NGOAI': 'FOREIGN',
  'FOREIGN': 'FOREIGN'
};
// Enum values: GRADE_11, GRADE_12, FREELANCE, NONE
const CLASS_MAP = { 
  'LOP_11': 'GRADE_11',
  'GRADE_11': 'GRADE_11',
  'LOP_12': 'GRADE_12',
  'GRADE_12': 'GRADE_12',
  'THI_SINH_TU_DO': 'FREELANCE',
  'FREELANCE': 'FREELANCE',
  'NONE': 'NONE',
  'CHUA_XAC_DINH': 'NONE',
  'CHUA_CO': 'NONE'
};

// Enum values: LOWER_21, G11_21_TO_23, G12_SEM1_21_TO_23, G12_21_TO_23, G11_24_TO_26, G12_SEM1_24_TO_26, G12_24_TO_26, G11_HIGHER_26, G12_SEM1_HIGHER_26, G12_HIGHER_26, OTHER
const GPA_MAP = { 
  '3_MON_LT21D': 'LOWER_21', 
  '3_MON_<21D': 'LOWER_21',
  '3_MON_LOP_11_TU_21_23D': 'G11_21_TO_23',
  '3_MON_HK1_12_TU_21_23D': 'G12_SEM1_21_TO_23',
  '3_MON_CA_NAM_12_TU_21_23D': 'G12_21_TO_23',
  '3_MON_LOP_11_TU_24_26D': 'G11_24_TO_26',
  '3_MON_HK1_12_TU_24_26D': 'G12_SEM1_24_TO_26',
  '3_MON_CA_NAM_12_TU_24_26D': 'G12_24_TO_26',
  '3_MON_LOP_11_>26D': 'G11_HIGHER_26',
  '3_MON_HK1_12_>26D': 'G12_SEM1_HIGHER_26',
  '3_MON_CA_NAM_12_>26D': 'G12_HIGHER_26',
  'KHAC': 'OTHER',
  'LOWER_21': 'LOWER_21',
  'G11_21_TO_23': 'G11_21_TO_23',
  'G12_SEM1_21_TO_23': 'G12_SEM1_21_TO_23',
  'G12_21_TO_23': 'G12_21_TO_23',
  'G11_24_TO_26': 'G11_24_TO_26',
  'G12_SEM1_24_TO_26': 'G12_SEM1_24_TO_26',
  'G12_24_TO_26': 'G12_24_TO_26',
  'G11_HIGHER_26': 'G11_HIGHER_26',
  'G12_SEM1_HIGHER_26': 'G12_SEM1_HIGHER_26',
  'G12_HIGHER_26': 'G12_HIGHER_26',
  'OTHER': 'OTHER'
};
// Enum values: TALENT_SCHOLARSHIP, OTHER_SCHOLARSHIP, ELIGIBLE_NO_SCHOLARSHIP, PENDING_REVIEW, NOT_ELIGIBLE, OTHER
const PROGRAM_SCORE_MAP = { 
  'DAT_XET_HB_TALENT': 'TALENT_SCHOLARSHIP',
  'DAT_XET_HB_KHAC': 'OTHER_SCHOLARSHIP',
  'DAT_KHONG_CO_HB': 'ELIGIBLE_NO_SCHOLARSHIP',
  'DANG_CHO_XET_DUYET': 'PENDING_REVIEW',
  'CHUA_DU_DIEM_DAU_VAO': 'NOT_ELIGIBLE',
  'KHAC': 'OTHER',
  'TALENT_SCHOLARSHIP': 'TALENT_SCHOLARSHIP',
  'OTHER_SCHOLARSHIP': 'OTHER_SCHOLARSHIP',
  'ELIGIBLE_NO_SCHOLARSHIP': 'ELIGIBLE_NO_SCHOLARSHIP',
  'PENDING_REVIEW': 'PENDING_REVIEW',
  'NOT_ELIGIBLE': 'NOT_ELIGIBLE',
  'OTHER': 'OTHER'
};

const ENGLISH_CERT_MAP = {
  'IELTS': 'IELTS',
  'TOEFL': 'TOEFL',
  'TOEIC': 'TOEIC',
  'VSTEP': 'VSTEP',
  'APTIS': 'APTIS',
  'LINGUASKILL': 'LINGUASKILL',
  'PEIC': 'PEIC',
  'CAMBRIDGE_EXAM': 'CAMBRIDGE_EXAM',
  'PTE': 'PTE',
  'OTHER': 'other',
  'KHAC': 'other'
};
// !--- End ---!

// !--- Alias Mapping for Province Name ---!
const PROVINCE_ALIASES = {
  // Ho Chi Minh City variations
  'tp ho chi minh': 'thanh pho ho chi minh',
  'tp. ho chi minh': 'thanh pho ho chi minh',
  'tp.hcm': 'thanh pho ho chi minh',
  'tphcm': 'thanh pho ho chi minh',
  'ho chi minh': 'thanh pho ho chi minh',
  'hcm': 'thanh pho ho chi minh',
  'sai gon': 'thanh pho ho chi minh',
  // Ha Noi variations
  'tp ha noi': 'ha noi',
  'tp. ha noi': 'ha noi',
  'thanh pho ha noi': 'ha noi',
  // Da Nang variations
  'tp da nang': 'da nang',
  'tp. da nang': 'da nang',
  'thanh pho da nang': 'da nang',
  // Can Tho variations
  'tp can tho': 'can tho',
  'tp. can tho': 'can tho',
  'thanh pho can tho': 'can tho',
  // Hai Phong variations
  'tp hai phong': 'hai phong',
  'tp. hai phong': 'hai phong',
  'thanh pho hai phong': 'hai phong',
  // Ba Ria - Vung Tau variations
  'ba ria vung tau': 'ba ria - vung tau',
  'brvt': 'ba ria - vung tau',
  'vung tau': 'ba ria - vung tau',
  'ba ria - vung tau': 'ba ria - vung tau',
  'br - vt': 'ba ria - vung tau',
  'br-vt': 'ba ria - vung tau',
  'br-vung tau': 'ba ria - vung tau',
  // Thua Thien Hue variations
  'thua thien hue': 'hue',
  'tt hue': 'hue',
  // Dak Lak variations
  'daklak': 'dak lak',
  'dak lak': 'dak lak',
  'dac lac': 'dak lak',
  'daclak': 'dak lak'
};
// !--- End ---!

// Province group rules for inquiry sync 
const PROVINCE_GROUP_RULES = {
  // ── Tier 1: HO_CHI_MINH ──
  'thanh pho ho chi minh': 'HO_CHI_MINH',
  'binh duong':            'HO_CHI_MINH',
  'ba ria - vung tau':     'HO_CHI_MINH',

  // ── Tier 2: CORE_PROVINCE ──
  'dong nai':    'CORE_PROVINCE',
  'lam dong':    'CORE_PROVINCE',
  'khanh hoa':   'CORE_PROVINCE',
  'tien giang':  'CORE_PROVINCE',
  'long an':     'CORE_PROVINCE',
  'tay ninh':    'CORE_PROVINCE',
  'dak lak':     'CORE_PROVINCE',
  'ben tre':     'CORE_PROVINCE',
  'binh thuan':  'CORE_PROVINCE',
  'binh phuoc':  'CORE_PROVINCE'
};

// !--- Displayed Labels for UI ---//

const CLASS_LABELS = {
  GRADE_11: 'Lớp 11',
  GRADE_12: 'Lớp 12',
  FREELANCE: 'Thí sinh tự do',
  NONE: 'Chưa có thông tin'
};

const PROVINCE_GROUP_LABELS = {
  HO_CHI_MINH: 'TP HCM',
  CORE_PROVINCE: 'Tỉnh ruột',
  OTHER_PROVINCE: 'Tỉnh ngoài',
  FOREIGN: 'Nước ngoài'
};

const SCHOOL_TYPE_LABELS = {
  A_STAR: 'A*',
  A: 'A',
  B: 'B',
  C: 'C',
  D: 'D',
  NONE: 'Chưa có thông tin'
};

const GPA_LABELS = {
  LOWER_21: '3 môn <21đ',
  G11_21_TO_23: '3 môn lớp 11 từ 21-23đ',
  G12_SEM1_21_TO_23: '3 môn HK1 12 từ 21-23đ',
  G12_21_TO_23: '3 môn cả năm 12 từ 21-23đ',
  G11_24_TO_26: '3 môn lớp 11 từ 24-26đ',
  G12_SEM1_24_TO_26: '3 môn HK1 12 từ 24-26đ',
  G12_24_TO_26: '3 môn cả năm 12 từ 24-26đ',
  G11_HIGHER_26: '3 môn lớp 11 > 26đ',
  G12_SEM1_HIGHER_26: '3 môn HK1 12 >26đ',
  G12_HIGHER_26: '3 môn cả năm 12 >26đ',
  OTHER: 'Khác'
};

const PROGRAM_SCORE_LABELS = {
  TALENT_SCHOLARSHIP: 'Đạt xét HB Talent',
  OTHER_SCHOLARSHIP: 'Đạt xét HB khác',
  ELIGIBLE_NO_SCHOLARSHIP: 'Đạt - không có HB',
  PENDING_REVIEW: 'Đang chờ xét duyệt',
  NOT_ELIGIBLE: 'Chưa đủ điểm đầu vào',
  OTHER: 'Khác'
};

module.exports = {
  PROVINCE_MAP,
  CLASS_MAP,
  GPA_MAP,
  PROGRAM_SCORE_MAP,
  ENGLISH_CERT_MAP,
  PROVINCE_ALIASES,
  PROVINCE_GROUP_RULES,
  CLASS_LABELS,
  PROVINCE_GROUP_LABELS,
  SCHOOL_TYPE_LABELS,
  GPA_LABELS,
  PROGRAM_SCORE_LABELS
};
