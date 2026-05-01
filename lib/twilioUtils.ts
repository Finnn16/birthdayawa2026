/**
 * Twilio Notification Utilities
 */

export function formatPhoneNumber(phone: string): string {
  if (!phone) return "";

  const cleaned = phone.replace(/\D/g, "");

  if (!cleaned) return "";

  if (cleaned.startsWith("62")) {
    return `+${cleaned}`;
  }

  if (cleaned.startsWith("0")) {
    return `+62${cleaned.slice(1)}`;
  }

  return `+${cleaned}`;
}

export function validatePhoneNumber(phone: string): {
  isValid: boolean;
  error?: string;
} {
  if (!phone || typeof phone !== "string") {
    return {
      isValid: false,
      error: "Phone number is required",
    };
  }

  const cleaned = phone.replace(/\D/g, "");

  if (cleaned.length < 10) {
    return {
      isValid: false,
      error: "Phone number must have at least 10 digits",
    };
  }

  if (cleaned.length > 15) {
    return {
      isValid: false,
      error: "Phone number is too long",
    };
  }

  return { isValid: true };
}

export function generateMoodReminderMessage(
  username: string,
  customMessage?: string,
): string {
  const defaultMessage = `Halo ${username}! 👋\n\nUdah isi mood track hari ini? Gimana perasaan lo? Jangan lupa log mood lo di app ya. Ini penting untuk track progress lo!\n\nLet's go! 💪`;

  return customMessage || defaultMessage;
}

export function generateStreakCelebrationMessage(
  username: string,
  streakDays: number,
): string {
  return `WOW ${username}! 🔥\n\nLo udah konsisten ${streakDays} hari isi mood tracking!\n\nStreak lo luar biasa. Keep it up! 💪\n\nJangan putus ya!`;
}
