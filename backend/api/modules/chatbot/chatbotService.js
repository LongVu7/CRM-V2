const { GoogleGenAI } = require('@google/genai');
const prisma = require('../../../config/db');
const { resolveDateRange, getIctDateBoundaries } = require('../../utils/dateUtils');

const toolDeclarations = [
  {
    name: 'getMyAssignedLeadsCount',
    description: 'Get the number of leads currently assigned to the logged-in user.',
    parameters: {
      type: 'OBJECT',
      properties: {}
    }
  },
  {
    name: 'getSubmittedLeadsCount',
    description: 'Get the number of leads submitted or created in the system within a given time preset.',
    parameters: {
      type: 'OBJECT',
      properties: {
        timePreset: {
          type: 'STRING',
          description: 'Time range preset: today, yesterday, last_7_days (past week / last 7 days), last_month, last_3_months',
          enum: ['today', 'yesterday', 'last_7_days', 'last_month', 'last_3_months']
        },
        onlyCreatedByMe: {
          type: 'BOOLEAN',
          description: 'True if the user specifically asks for leads submitted/created by themselves. False for team or system-wide leads.'
        }
      }
    }
  }
];

async function executeTool(name, args = {}, currentUser) {
  if (name === 'getMyAssignedLeadsCount') {
    const count = await prisma.lead.count({
      where: { assignedToId: currentUser.id }
    });
    return {
      assignedLeadsCount: count,
      userName: currentUser.fullName || currentUser.email
    };
  }

  if (name === 'getSubmittedLeadsCount') {
    const { timePreset = 'last_7_days', onlyCreatedByMe = false } = args;
    const dateRange = resolveDateRange(timePreset);
    const { fromInstant, toExclusiveInstant } = getIctDateBoundaries(dateRange.from, dateRange.to);

    const where = {};
    if (onlyCreatedByMe) {
      where.createdById = currentUser.id;
    }
    where.createdAt = {
      gte: new Date(fromInstant),
      lt: new Date(toExclusiveInstant)
    };

    const count = await prisma.lead.count({ where });
    return {
      submittedLeadsCount: count,
      timePreset,
      from: dateRange.from,
      to: dateRange.to,
      onlyCreatedByMe: !!onlyCreatedByMe
    };
  }

  return { error: `Tool ${name} not found` };
}

const processMessage = async ({ user, message }) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return 'API key was not configured.';
  }

  const modelName = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
  const ai = new GoogleGenAI({ apiKey });

  const systemInstruction = `You are an AI assistant supporting the Lead Management CRM system.
Current user: "${user.fullName || user.email}" (ID: ${user.id}).

Your role and guidelines:
- Provide accurate answers to questions regarding Lead data.
- Be polite, concise, and support both English and Vietnamese (respond in the language the user uses).
- Use Markdown to bold key quantities (for example: **15 leads**) or use bulleted lists if there is a lot of information.
- When a user asks about the number of leads assigned, submitted, or newly created, invoke the appropriate tools to retrieve actual data from the system. Never fabricate figures.`;

  const contents = [
    {
      role: 'user',
      parts: [{ text: message }]
    }
  ];

  const response = await ai.models.generateContent({
    model: modelName,
    contents,
    config: {
      systemInstruction,
      tools: [{ functionDeclarations: toolDeclarations }]
    }
  });

  // Handle function calls
  if (response.functionCalls && response.functionCalls.length > 0) {
    const functionResponses = [];
    for (const call of response.functionCalls) {
      const result = await executeTool(call.name, call.args, user);
      functionResponses.push({
        functionResponse: {
          name: call.name,
          response: result
        }
      });
    }

    // Follow-up request with tool results
    contents.push(response.candidates[0].content);
    contents.push({
      role: 'user',
      parts: functionResponses
    });

    const finalResponse = await ai.models.generateContent({
      model: modelName,
      contents,
      config: { systemInstruction }
    });

    return finalResponse.text || 'No response from AI Chatbot';
  }

  return response.text || 'No response from AI Chatbot';
};

module.exports = {
  processMessage
};
