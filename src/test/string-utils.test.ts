import * as assert from 'assert';
import { StringUtils } from '../utils/string-utils';

suite('String Utils Tests', () => {
    test('escapeHtml should escape HTML special characters', () => {
        // Test various special characters
        const input = '<script>alert("XSS attack");</script> & other\'s "data"';
        const expected = '&lt;script&gt;alert(&quot;XSS attack&quot;);&lt;/script&gt; &amp; other&#039;s &quot;data&quot;';
        
        assert.strictEqual(StringUtils.escapeHtml(input), expected);
    });
    
    test('escapeHtml should handle undefined and null inputs', () => {
        assert.strictEqual(StringUtils.escapeHtml(undefined), '');
        assert.strictEqual(StringUtils.escapeHtml(null), '');
    });

    test('truncate should limit string length and add suffix', () => {
        const longText = 'This is a very long string that should be truncated';
        const truncated = StringUtils.truncate(longText, 20);
        
        assert.strictEqual(truncated.length, 20);
        assert.strictEqual(truncated, 'This is a very lo...');
    });
    
    test('truncate should not modify strings shorter than max length', () => {
        const shortText = 'Short text';
        assert.strictEqual(StringUtils.truncate(shortText, 20), shortText);
    });
    
    test('validateLength should correctly validate string lengths', () => {
        assert.strictEqual(StringUtils.validateLength('Test', 1, 10), true);
        assert.strictEqual(StringUtils.validateLength('', 0, 10), true);
        assert.strictEqual(StringUtils.validateLength('', 1, 10), false); // Too short
        assert.strictEqual(StringUtils.validateLength('This is too long', 1, 10), false); // Too long
    });
    
    test('sanitizeSearchQuery should clean up search queries', () => {
        assert.strictEqual(
            StringUtils.sanitizeSearchQuery('test! @#$%^&* query'),
            'test query'
        );
        
        // Multiple spaces should be consolidated
        assert.strictEqual(
            StringUtils.sanitizeSearchQuery('multiple    spaces'),
            'multiple spaces'
        );
        
        // Should keep hyphens and underscores
        assert.strictEqual(
            StringUtils.sanitizeSearchQuery('keep-hyphens_and_underscores'),
            'keep-hyphens_and_underscores'
        );
    });
    
    test('sanitizeUrlComponent should clean up URL components', () => {
        // Test removal of problematic characters
        assert.strictEqual(
            StringUtils.sanitizeUrlComponent('owner/name.git'),
            'ownernamegit'
        );
        
        // Test handling of spaces
        assert.strictEqual(
            StringUtils.sanitizeUrlComponent('test repo with spaces'),
            'test repo with spaces'
        );
        
        // Test handling of empty inputs
        assert.strictEqual(StringUtils.sanitizeUrlComponent(''), '');
        assert.strictEqual(StringUtils.sanitizeUrlComponent(null), '');
        assert.strictEqual(StringUtils.sanitizeUrlComponent(undefined), '');
        
        // Test handling of complex injection attempts
        assert.strictEqual(
            StringUtils.sanitizeUrlComponent('../../etc/passwd'),
            'etcpasswd'
        );
        
        // Test handling of special characters
        assert.strictEqual(
            StringUtils.sanitizeUrlComponent('test<>"\'`{}[]()%$#@&*!;|=+,~^'),
            'test'
        );
    });
    
    test('sanitizeCommandInput should remove shell metacharacters', () => {
        // Test removal of shell metacharacters
        assert.strictEqual(
            StringUtils.sanitizeCommandInput('echo "hello"; rm -rf /'),
            'echo hello rm -rf /'
        );
        
        // Test handling of empty inputs
        assert.strictEqual(StringUtils.sanitizeCommandInput(''), '');
        assert.strictEqual(StringUtils.sanitizeCommandInput(null), '');
        assert.strictEqual(StringUtils.sanitizeCommandInput(undefined), '');
        
        // Test handling of common shell injection patterns
        assert.strictEqual(
            StringUtils.sanitizeCommandInput('command || evil_command'),
            'command  evil_command'
        );
        
        // Test handling of newlines and tabs
        assert.strictEqual(
            StringUtils.sanitizeCommandInput('line1\nline2\tindented'),
            'line1line2indented'
        );
    });
});
