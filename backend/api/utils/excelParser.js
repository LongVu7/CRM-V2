const xlsx = require('xlsx');

/**
 * Parses an array of uploaded Excel files into a flat array of student objects.
 * Handles date conversion and tracking the source file and row number for each record.
 */
const parseExcelFiles = (files) => {
  const allStudents = [];

  for (const file of files) {
    const workbook = xlsx.readFile(file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);

    data.forEach((row, index) => {
      // Handle Excel date serial numbers
      if (row.birthDate && typeof row.birthDate === 'number') {
        row.birthDate = new Date(Math.round((row.birthDate - 25569) * 86400 * 1000));
      }

      // Ensure mobile is stored as string
      if (row.mobile) {
        row.mobile = String(row.mobile).trim();
      }

      allStudents.push({
        ...row,
        _mapping: {
          fileName: file.originalname,
          rowNumber: index + 2 // +2 to account for header row and 0-index
        }
      });
    });
  }

  return allStudents;
};

module.exports = {
  parseExcelFiles
};
