const { z } = require('zod');

const campaignSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().optional().nullable(),
  ownerId: z.number().int({ message: 'Owner is required' }),
  status: z.enum(['in_progress', 'completed', 'scheduled', 'cancelled']),
  startDate: z.coerce.date({ required_error: 'Start date is required' }),
  endDate: z.coerce.date().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const updateCampaignSchema = campaignSchema.partial();

const activitySchema = z.object({
  type: z.enum(['EMAIL', 'SMS', 'ZNS']),
  name: z.string().min(1, 'Activity name is required').max(255),
  subject: z.string().max(255).optional().nullable(),
  content: z.string().optional().nullable(),
  templateId: z.number().int().optional().nullable(),
  status: z.enum(['draft', 'scheduled', 'sent', 'failed']).optional().default('draft'),
  scheduledAt: z.coerce.date().optional().nullable(),
});

const updateActivitySchema = activitySchema.partial();

const activityRecipientSchema = z.object({
  inquiryIds: z.array(z.number().int()).min(1, 'At least one recipient must be selected')
});

const campaignTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(255),
  type: z.enum(['EMAIL', 'SMS', 'ZNS']),
  subject: z.string().max(255).optional().nullable(),
  content: z.string().min(1, 'Content is required'),
});

module.exports = {
  campaignSchema,
  updateCampaignSchema,
  activitySchema,
  updateActivitySchema,
  activityRecipientSchema,
  campaignTemplateSchema
};
