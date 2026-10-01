const { google } = require('googleapis');
require('dotenv').config();

// Ensure the private key handles newline characters properly
const privateKey = process.env.GOOGLE_SA_PRIVATE_KEY
  ? process.env.GOOGLE_SA_PRIVATE_KEY.replace(/\\n/g, '\n')
  : '';

const auth = new google.auth.JWT({
  email: process.env.GOOGLE_SA_CLIENT_EMAIL,
  key: privateKey,
  scopes: ['https://www.googleapis.com/auth/drive.readonly'],
});

module.exports = auth;
