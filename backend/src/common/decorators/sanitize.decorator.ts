import { Transform } from 'class-transformer';

/**
 * Sanitize HTML content to prevent XSS attacks
 * Removes HTML tags and dangerous characters
 */
export function SanitizeHtml() {
  return Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    
    // Remove HTML tags
    let sanitized = value.replace(/<[^>]*>/g, '');
    
    // Remove dangerous characters
    sanitized = sanitized
      .replace(/[<>]/g, '') // Remove remaining angle brackets
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim();
    
    return sanitized;
  });
}

/**
 * Sanitize text input by trimming and normalizing whitespace
 */
export function SanitizeText() {
  return Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    
    return value
      .trim()
      .replace(/\s+/g, ' ') // Normalize multiple spaces to single space
      .substring(0, 10000); // Limit length to prevent DoS
  });
}
