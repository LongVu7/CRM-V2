const { google } = require('googleapis');
const MailComposer = require('nodemailer/lib/mail-composer');

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

const stripCRLF = (val) => (val ? String(val).replace(/[\r\n]+/g, ' ').trim() : '');

const buildRawEmail = async ({ from, to, subject, html }) => {
  const mail = new MailComposer({
    from: stripCRLF(from),
    to: stripCRLF(to),
    subject: stripCRLF(subject),
    html
  });
  const message = await mail.compile().build();
  return Buffer.from(message).toString('base64url');
};

const sendMail = async ({ to, subject, html }) => {
  try {
    const gmail = getGmailService();
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;

    const raw = await buildRawEmail({ from, to, subject, html });

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

module.exports = { sendMail, buildRawEmail };

