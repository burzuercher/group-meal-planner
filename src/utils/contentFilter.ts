import * as filter from 'leo-profanity';

// Initialize the filter
filter.loadDictionary('en'); // Load English dictionary

// Character limits for different content types
export const CONTENT_LIMITS = {
  GROUP_NAME: 50,
  MENU_NAME: 100,
  ITEM_NAME: 100,
  ITEM_NOTES: 500,
  USER_NAME: 50,
};

/**
 * Checks if text contains profanity
 */
export function containsProfanity(text: string): boolean {
  if (!text || text.trim() === '') return false;
  return filter.check(text);
}

/**
 * Cleans profanity from text (replaces with asterisks)
 */
export function cleanProfanity(text: string): string {
  if (!text) return '';
  return filter.clean(text);
}

/**
 * Validates group name
 * Returns error message if invalid, null if valid
 */
export function validateGroupName(name: string): string | null {
  const trimmed = name.trim();

  if (trimmed.length < 2) {
    return 'Group name must be at least 2 characters';
  }

  if (trimmed.length > CONTENT_LIMITS.GROUP_NAME) {
    return `Group name must be ${CONTENT_LIMITS.GROUP_NAME} characters or less`;
  }

  if (containsProfanity(trimmed)) {
    return 'Group name contains inappropriate language';
  }

  return null;
}

/**
 * Validates menu name
 */
export function validateMenuName(name: string): string | null {
  const trimmed = name.trim();

  if (trimmed.length < 2) {
    return 'Menu name must be at least 2 characters';
  }

  if (trimmed.length > CONTENT_LIMITS.MENU_NAME) {
    return `Menu name must be ${CONTENT_LIMITS.MENU_NAME} characters or less`;
  }

  if (containsProfanity(trimmed)) {
    return 'Menu name contains inappropriate language';
  }

  return null;
}

/**
 * Validates menu item name
 */
export function validateItemName(name: string): string | null {
  const trimmed = name.trim();

  if (trimmed.length < 1) {
    return 'Item name is required';
  }

  if (trimmed.length > CONTENT_LIMITS.ITEM_NAME) {
    return `Item name must be ${CONTENT_LIMITS.ITEM_NAME} characters or less`;
  }

  if (containsProfanity(trimmed)) {
    return 'Item name contains inappropriate language';
  }

  return null;
}

/**
 * Validates item notes
 */
export function validateItemNotes(notes: string): string | null {
  const trimmed = notes.trim();

  if (trimmed.length > CONTENT_LIMITS.ITEM_NOTES) {
    return `Notes must be ${CONTENT_LIMITS.ITEM_NOTES} characters or less`;
  }

  if (containsProfanity(trimmed)) {
    return 'Notes contain inappropriate language';
  }

  return null;
}

/**
 * Validates user name
 */
export function validateUserName(name: string): string | null {
  const trimmed = name.trim();

  if (trimmed.length < 2) {
    return 'Name must be at least 2 characters';
  }

  if (trimmed.length > CONTENT_LIMITS.USER_NAME) {
    return `Name must be ${CONTENT_LIMITS.USER_NAME} characters or less`;
  }

  if (containsProfanity(trimmed)) {
    return 'Name contains inappropriate language';
  }

  return null;
}

/**
 * Generic text validation with character limit
 */
export function validateText(
  text: string,
  minLength: number,
  maxLength: number,
  fieldName: string = 'Text'
): string | null {
  const trimmed = text.trim();

  if (trimmed.length < minLength) {
    return `${fieldName} must be at least ${minLength} characters`;
  }

  if (trimmed.length > maxLength) {
    return `${fieldName} must be ${maxLength} characters or less`;
  }

  if (containsProfanity(trimmed)) {
    return `${fieldName} contains inappropriate language`;
  }

  return null;
}
