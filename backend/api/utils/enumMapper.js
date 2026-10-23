const enumConstants = require('../../constants/enumConstants');
const {
  PROVINCE_MAP,
  CLASS_MAP,
  GPA_MAP,
  PROGRAM_SCORE_MAP,
  ENGLISH_CERT_MAP,
  PROVINCE_ALIASES,
  CLASS_LABELS,
  PROVINCE_GROUP_LABELS,
  SCHOOL_TYPE_LABELS,
  GPA_LABELS,
  PROGRAM_SCORE_LABELS
} = enumConstants;

const removeVietnameseTones = (str) => {
  str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
  str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
  str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
  str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
  str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
  str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
  str = str.replace(/đ/g, "d");
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

const normalizeProvinceName = (val) => {
  if (!val) return '';
  let str = removeVietnameseTones(String(val)).toLowerCase();
  str = str.replace(/[\.\-_]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (PROVINCE_ALIASES[str]) return PROVINCE_ALIASES[str];
  const stripped = str.replace(/^(tinh|tp|thanh pho)\s+/i, '').trim();
  if (PROVINCE_ALIASES[stripped]) return PROVINCE_ALIASES[stripped];
  return stripped;
};

module.exports = {
  removeVietnameseTones,
  normalizeEnum,
  normalizeProvinceName,
  ...enumConstants
};
