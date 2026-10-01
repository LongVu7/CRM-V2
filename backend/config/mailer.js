const { google } = require('googleapis');

const getGmailService = () => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'https://developers.google.com/oauthplayground'
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN
  });

  return google.gmail({ version: 'v1', auth: oauth2Client });
};

const buildRawEmail = ({ from, to, subject, html }) => {
  const messageParts = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset="UTF-8"',
    '',
    html
  ];
  const message = messageParts.join('\r\n');

  // Base64url encode
  return Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

const sendMail = async ({ to, subject, html }) => {
  try {
    const gmail = getGmailService();
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;

    const raw = buildRawEmail({ from, to, subject, html });

    const result = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw }
    });

    console.log(`✅ Email sent successfully to ${to}. Message ID: ${result.data.id}`);
    return result.data;
  } catch (error) {
    console.error(`❌ Failed to send email to ${to}:`, error.message);
    throw error;
  }
};

module.exports = { sendMail };

