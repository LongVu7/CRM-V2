const chatbotService = require('./chatbotService');

const handleError = (res, error) => {
  const status = error.status || 500;
  res.status(status).json({
    error: error.message || 'Failed to process chatbot request',
    ...(status === 500 && { details: error.message })
  });
};

const handleChatMessage = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Message cannot be blank' });
    }

    const reply = await chatbotService.processMessage({
      user: req.user,
      message: message.trim()
    });

    res.status(200).json({
      message: 'Successful',
      data: { reply }
    });
  } catch (error) {
    handleError(res, error);
  }
};

module.exports = {
  handleChatMessage
};

