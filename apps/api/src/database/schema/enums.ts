import { pgEnum } from 'drizzle-orm/pg-core';

export const userThemeEnum = pgEnum('user_theme', ['light', 'dark', 'system']);
export const wishStatusEnum = pgEnum('wish_status', ['active', 'paused', 'archived']);
export const offerAvailabilityEnum = pgEnum('offer_availability', ['available', 'unavailable', 'unknown']);
export const alertTypeEnum = pgEnum('alert_type', ['price_target', 'price_drop', 'new_low', 'back_in_stock']);
