const { z } = require('zod');
const templateRenderer = require('./templateRenderer');

// Custom Zod refinement to validate the content for allowed variables
const validateTemplateContent = (content) => {
  try {
    templateRenderer.validateContent(content);
    return true;
  } catch (err) {
    return false;
  }
};

const baseTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(255),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).optional()
});

const emailTemplateSchema = baseTemplateSchema.extend({
  channel: z.literal('EMAIL'),
  subject: z.string().min(1, 'Subject is required for EMAIL templates').max(255),
  content: z.string().min(1, 'Content is required').refine(validateTemplateContent, {
    message: 'Content contains unknown variables.'
  })
});

const smsTemplateSchema = baseTemplateSchema.extend({
  channel: z.literal('SMS'),
  subject: z.null().optional(), // Must be null or omitted
  content: z.string().min(1, 'Content is required').refine(validateTemplateContent, {
    message: 'Content contains unknown variables.'
  })
});

const znsTemplateSchema = baseTemplateSchema.extend({
  channel: z.literal('ZNS'),
  subject: z.null().optional(),
  content: z.string().min(1, 'Content is required').refine(validateTemplateContent, {
    message: 'Content contains unknown variables.'
  })
});

const campaignTemplateSchema = z.discriminatedUnion('channel', [
  emailTemplateSchema,
  smsTemplateSchema,
  znsTemplateSchema
]);

const updateTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(255).optional(),
  channel: z.enum(['EMAIL', 'SMS', 'ZNS']).optional(),
  subject: z.string().min(1, 'Subject is required').max(255).nullable().optional(),
  content: z.string().min(1, 'Content is required').optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).optional()
}).superRefine((data, ctx) => {
  if (data.channel === 'EMAIL' && data.subject === null) {
    ctx.addIssue({
      code: 'custom',
      path: ['subject'],
      message: 'Subject cannot be null for EMAIL templates'
    });
  }
  if (data.content !== undefined) {
    try {
      templateRenderer.validateContent(data.content);
    } catch (err) {
      ctx.addIssue({
        code: 'custom',
        path: ['content'],
        message: err.message
      });
    }
  }
});

module.exports = {
  campaignTemplateSchema,
  updateTemplateSchema
};
