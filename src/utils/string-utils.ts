/**
 * Utility functions for string handling and sanitization
 */
export class StringUtils {
    /**
     * Escapes HTML special characters in a string to prevent XSS
     * 
     * @param text The text to escape
     * @returns Safely escaped HTML string
     */
    public static escapeHtml(text: string | undefined | null): string {
        if (text === undefined || text === null) {
            return '';
        }
        
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    /**
     * Truncates a string if it exceeds the max length
     * 
     * @param text The text to truncate
     * @param maxLength The maximum allowed length
     * @param suffix Optional suffix to add when truncated (defaults to "...")
     * @returns Truncated string
     */
    public static truncate(text: string | undefined | null, maxLength: number, suffix: string = '...'): string {
        if (!text) {
            return '';
        }
        
        if (text.length <= maxLength) {
            return text;
        }
        
        return text.substring(0, maxLength - suffix.length) + suffix;
    }

    /**
     * Validates if a string is within allowed length limits
     * 
     * @param text The text to validate
     * @param minLength The minimum allowed length
     * @param maxLength The maximum allowed length
     * @returns True if the text is within limits, false otherwise
     */
    public static validateLength(text: string | undefined | null, minLength: number, maxLength: number): boolean {
        if (!text) {
            return minLength === 0;
        }
        
        const length = text.length;
        return length >= minLength && length <= maxLength;
    }

    /**
     * Sanitizes a search query for safe use in API calls
     * 
     * @param query The search query to sanitize
     * @returns Sanitized query string
     */
    public static sanitizeSearchQuery(query: string): string {
        if (!query || typeof query !== 'string') {
            return '';
        }
        
        // Remove special characters that might interfere with search APIs
        return query
            .replace(/[^\w\s\-_]/g, ' ')  // Replace special chars with space
            .replace(/\s+/g, ' ')         // Replace multiple spaces with single space
            .trim();                      // Remove leading/trailing spaces
    }

    /**
     * Sanitizes a URL component to ensure it's safe to use in URLs
     * 
     * @param value The URL component to sanitize
     * @returns Sanitized URL component string
     */
    public static sanitizeUrlComponent(value: string | undefined | null): string {
        if (!value) {
            return '';
        }
        
        // Convert to string, trim whitespace, and remove problematic characters
        return String(value)
            .trim()
            // Remove characters that could be used for path traversal or command injection
            .replace(/[\/\\\.]+/g, '')
            // Remove any other potentially dangerous characters
            .replace(/[<>"'`{}\[\]\(\)%$#@&*!;|=+,~^]/g, '')
            // Replace multiple spaces with a single space
            .replace(/\s+/g, ' ');
    }

    /**
     * Sanitizes an input that will be used in a command line context
     * 
     * @param input String input that may be used in a command execution context
     * @returns Safely sanitized string
     */
    public static sanitizeCommandInput(input: string | undefined | null): string {
        if (!input) {
            return '';
        }
        
        // Convert to string and apply aggressive sanitization for command contexts
        return String(input)
            .trim()
            // Escape shell metacharacters but preserve hyphens for command args
            .replace(/[;&|><*?`$(){}[\]!#\\]/g, '')
            .replace(/['"\n\r\t]/g, '');
    }
}
