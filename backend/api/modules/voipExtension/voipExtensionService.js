const crypto = require('crypto');
const prisma = require('../../../config/db');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
// Ensure VOIP_ENCRYPTION_KEY is a 32-byte hex string in .env
const ENCRYPTION_KEY = Buffer.from(process.env.VOIP_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex'), 'hex');

const encryptPassword = (text) => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${encrypted}:${authTag}`;
};

const createVoipExtension = async (data) => {
  const { accountId, extensionNumber, sipPassword } = data;
  const sipPasswordEncrypted = encryptPassword(sipPassword);

  return await prisma.voipExtension.create({
    data: {
      accountId: parseInt(accountId, 10),
      extensionNumber,
      sipPasswordEncrypted
    }
  });
};

const updateVoipExtension = async (id, data) => {
  const updates = { ...data };
  if (updates.sipPassword) {
    updates.sipPasswordEncrypted = encryptPassword(updates.sipPassword);
    delete updates.sipPassword;
  }
  return await prisma.voipExtension.update({
    where: { id: parseInt(id, 10) },
    data: updates
  });
};

const getAllExtensions = async () => {
  return await prisma.voipExtension.findMany({
    include: {
      account: { select: { fullName: true, email: true } }
    }
  });
};

module.exports = {
  createVoipExtension,
  updateVoipExtension,
  getAllExtensions
};
