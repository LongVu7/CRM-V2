const { z } = require('zod');

const csvToIntArray = z.preprocess(
  (val) => {
    if (val === undefined || val === '') return undefined;
    if (typeof val === 'string') {
      return val.split(',').map(s => {
        const parsed = Number(s.trim());
        return isNaN(parsed) ? s : parsed;
      });
    }
    return val;
  },
  z.array(z.number().int().positive()).optional()
);

const csvToStringArray = (allowedValues) => z.preprocess(
  (val) => {
    if (val === undefined || val === '') return undefined;
    if (typeof val === 'string') return val.split(',').map(s => s.trim());
    return val;
  },
  z.array(z.enum(allowedValues)).optional()
);

const realDate = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
  .refine((val) => {
    const [y, m, day] = val.split('-').map(Number);
    const d = new Date(Date.UTC(y, m - 1, day));
    return d.getUTCFullYear() === y && d.getUTCMonth() + 1 === m && d.getUTCDate() === day;
  }, { message: 'Date does not exist' });

const dashboardQuerySchema = z.object({
  from: realDate,
  to: realDate,
  sourceIds: csvToIntArray,
  sourceDetailIds: csvToIntArray,
  majorInterestTypes: csvToStringArray(['right_major_interest', 'related_major_interest', 'different_major_interest']),
  regionGroups: csvToStringArray(['HO_CHI_MINH', 'CORE_PROVINCE', 'OTHER_PROVINCE', 'FOREIGN']),
  oldProvinceIds: csvToIntArray,
}).refine((data) => data.from <= data.to, {
  message: '"from" date must be on or before "to" date',
  path: ['from'],
});

const getDashboardReportSchema = z.object({
  query: dashboardQuerySchema
});

module.exports = {
  getDashboardReportSchema
};
