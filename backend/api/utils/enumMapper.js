const removeVietnameseTones = (str) => {
  str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g,"a"); 
  str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g,"e"); 
  str = str.replace(/ì|í|ị|ỉ|ĩ/g,"i"); 
  str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g,"o"); 
  str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g,"u"); 
  str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g,"y"); 
  str = str.replace(/đ/g,"d");
  str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
  str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
  str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
  str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
  str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
  str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
  str = str.replace(/Đ/g, "D");
  return str;
};

const normalizeEnum = (val) => {
  if (!val) return val;
  let str = String(val).trim();
  str = removeVietnameseTones(str).toUpperCase();
  str = str.replace(/[\s\-*]+/g, '_');
  return str;
};

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

const CLASS_MAP = {
  'LOP_11': 'GRADE_11',
  'GRADE_11': 'GRADE_11',
  'LOP_12': 'GRADE_12',
  'GRADE_12': 'GRADE_12',
  'THI_SINH_TU_DO': 'FREELANCE',
  'FREELANCE': 'FREELANCE'
};

const GPA_MAP = {
  '3_MON_LT21D': 'LOWER_21', // Note: < becomes LT
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
  // Support direct enum values
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

const PROGRAM_SCORE_MAP = {
  'DAT_XET_HB_TALENT': 'TALENT_SCHOLARSHIP',
  'DAT_XET_HB_KHAC': 'OTHER_SCHOLARSHIP',
  'DAT_KHONG_CO_HB': 'ELIGIBLE_NO_SCHOLARSHIP',
  'DANG_CHO_XET_DUYET': 'PENDING_REVIEW',
  'CHUA_DU_DIEM_DAU_VAO': 'NOT_ELIGIBLE',
  'KHAC': 'OTHER',
  // Support direct enum values
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

module.exports = {
  removeVietnameseTones,
  normalizeEnum,
  PROVINCE_MAP,
  CLASS_MAP,
  GPA_MAP,
  PROGRAM_SCORE_MAP,
  ENGLISH_CERT_MAP
};
