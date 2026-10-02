const prisma = require('../../../config/db');

const handleError = (message, status) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

const getAllDispositions = async () => {
  return await prisma.callDisposition.findMany({
    orderBy: { displayOrder: 'asc' }
  });
};

const createDisposition = async (data) => {
  return await prisma.callDisposition.create({
    data: {
      name: data.name,
      description: data.description,
      requireNotes: data.requireNotes || false,
      displayOrder: data.displayOrder || 0,
      isActive: true
    }
  });
};

const updateDisposition = async (id, data) => {
  return await prisma.callDisposition.update({
    where: { id: parseInt(id, 10) },
    data
  });
};

const deleteDisposition = async (id) => {
  return await prisma.callDisposition.delete({
    where: { id: parseInt(id, 10) }
  });
};

module.exports = {
  getAllDispositions,
  createDisposition,
  updateDisposition,
  deleteDisposition
};
