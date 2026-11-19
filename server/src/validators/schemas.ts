import { z } from "zod"

// User profile schema
export const profileSchema = z.object({
  handle: z
    .string()
    .trim()
    .min(2, "Handle must be at least 2 characters")
    .regex(/^@[a-zA-Z0-9_]+$/, "Handle must start with @ and contain only letters, numbers, and underscores"),
  name: z.string().trim().min(1, "Name cannot be empty"),
  heightCm: z.coerce.number().min(50, "Height must be at least 50 cm").max(250, "Height must be at most 250 cm").nullable().optional(),
  weightKg: z.coerce.number().min(20, "Weight must be at least 20 kg").max(300, "Weight must be at most 300 kg").nullable().optional(),
  age: z.coerce.number().int().min(10, "Age must be at least 10").max(100, "Age must be at most 100").nullable().optional(),
  baselineCommuteKm: z.coerce.number().min(0, "Commute distance must be non-negative").default(0),
})

// Activity entry in batch log update
export const activityEntrySchema = z.object({
  activityKey: z.string().min(1, "activityKey is required"),
  quantity: z.coerce.number().min(0, "Quantity must be non-negative"),
})

// Batch log update schema for "Today's Update" modal
export const batchLogSchema = z.object({
  userId: z.string().min(1, "userId is required"),
  logDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "logDate must follow YYYY-MM-DD format"),
  entries: z.array(activityEntrySchema).min(1, "At least one activity entry is required"),
})

// Calendar query schema
export const calendarQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
})

export type ProfileInput = z.infer<typeof profileSchema>
export type ActivityEntryInput = z.infer<typeof activityEntrySchema>
export type BatchLogInput = z.infer<typeof batchLogSchema>
export type CalendarQueryInput = z.infer<typeof calendarQuerySchema>
