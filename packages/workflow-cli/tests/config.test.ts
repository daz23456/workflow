/**
 * Configuration Loader Tests
 * TDD: RED phase - tests written before implementation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadConfig, getDefaultConfig, mergeConfigs, CONFIG_FILE_NAME } from '../src/config.js';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock fs module
vi.mock('fs/promises');

describe('Config Loader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CONFIG_FILE_NAME', () => {
    it('should be .workflowrc', () => {
      expect(CONFIG_FILE_NAME).toBe('.workflowrc');
    });
  });

  describe('getDefaultConfig', () => {
    it('should return default configuration', () => {
      const config = getDefaultConfig();

      expect(config).toEqual({
        gateway: {
          url: 'http://localhost:5001',
          namespace: 'default'
        },
        tasks: {
          localPath: './tasks/',
          remoteFetch: true
        },
        templates: {
          customPath: './templates/'
        }
      });
    });

    it('should return a new object each time', () => {
      const config1 = getDefaultConfig();
      const config2 = getDefaultConfig();

      expect(config1).not.toBe(config2);
      expect(config1).toEqual(config2);
    });
  });

  describe('mergeConfigs', () => {
    it('should merge partial config into defaults', () => {
      const defaults = getDefaultConfig();
      const partial = {
        gateway: {
          url: 'http://custom:8080'
        }
      };

      const merged = mergeConfigs(defaults, partial);

      expect(merged.gateway.url).toBe('http://custom:8080');
      expect(merged.gateway.namespace).toBe('default'); // preserved from defaults
    });

    it('should handle nested object merging', () => {
      const defaults = getDefaultConfig();
      const partial = {
        tasks: {
          localPath: './custom-tasks/'
        }
      };

      const merged = mergeConfigs(defaults, partial);

      expect(merged.tasks.localPath).toBe('./custom-tasks/');
      expect(merged.tasks.remoteFetch).toBe(true); // preserved from defaults
    });

    it('should handle complete replacement of nested objects', () => {
      const defaults = getDefaultConfig();
      const partial = {
        gateway: {
          url: 'http://new-gateway:9000',
          namespace: 'production'
        }
      };

      const merged = mergeConfigs(defaults, partial);

      expect(merged.gateway.url).toBe('http://new-gateway:9000');
      expect(merged.gateway.namespace).toBe('production');
    });

    it('should not modify original objects', () => {
      const defaults = getDefaultConfig();
      const partial = {
        gateway: {
          url: 'http://modified:8080'
        }
      };

      const originalUrl = defaults.gateway.url;
      mergeConfigs(defaults, partial);

      expect(defaults.gateway.url).toBe(originalUrl);
    });
  });

  describe('loadConfig', () => {
    it('should return default config when no .workflowrc exists', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('ENOENT'));

      const config = await loadConfig('/project');

      expect(config).toEqual(getDefaultConfig());
    });

    it('should load and parse YAML config file', async () => {
      const yamlContent = `
gateway:
  url: http://prod-gateway:5001
  namespace: production
tasks:
  localPath: ./prod-tasks/
`;
      vi.mocked(fs.readFile).mockResolvedValue(yamlContent);

      const config = await loadConfig('/project');

      expect(config.gateway.url).toBe('http://prod-gateway:5001');
      expect(config.gateway.namespace).toBe('production');
      expect(config.tasks.localPath).toBe('./prod-tasks/');
      // Defaults should be preserved for unspecified fields
      expect(config.tasks.remoteFetch).toBe(true);
    });

    it('should look for config in current directory by default', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('ENOENT'));

      await loadConfig();

      expect(fs.readFile).toHaveBeenCalledWith(
        expect.stringContaining('.workflowrc'),
        'utf-8'
      );
    });

    it('should look for config in specified directory', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('ENOENT'));

      await loadConfig('/custom/path');

      expect(fs.readFile).toHaveBeenCalledWith(
        '/custom/path/.workflowrc',
        'utf-8'
      );
    });

    it('should handle empty config file', async () => {
      vi.mocked(fs.readFile).mockResolvedValue('');

      const config = await loadConfig('/project');

      expect(config).toEqual(getDefaultConfig());
    });

    it('should handle config with only whitespace', async () => {
      vi.mocked(fs.readFile).mockResolvedValue('   \n\n   ');

      const config = await loadConfig('/project');

      expect(config).toEqual(getDefaultConfig());
    });

    it('should return defaults on unparseable config file', async () => {
      // Simulate read error by mocking parseConfigContent to throw
      vi.mocked(fs.readFile).mockImplementation(() => {
        throw new Error('Parse error');
      });

      const config = await loadConfig('/project');

      // Should fall back to defaults rather than throwing
      expect(config).toEqual(getDefaultConfig());
    });

    it('should support JSON config files', async () => {
      const jsonContent = JSON.stringify({
        gateway: {
          url: 'http://json-gateway:5001'
        }
      });
      vi.mocked(fs.readFile).mockResolvedValue(jsonContent);

      const config = await loadConfig('/project');

      expect(config.gateway.url).toBe('http://json-gateway:5001');
    });

    it('should search parent directories for config', async () => {
      // First call (current dir) fails, second call (parent) succeeds
      vi.mocked(fs.readFile)
        .mockRejectedValueOnce(new Error('ENOENT'))
        .mockRejectedValueOnce(new Error('ENOENT'))
        .mockResolvedValueOnce('gateway:\n  url: http://parent-config:5001');

      const config = await loadConfig('/project/deep/nested', { searchParents: true });

      expect(config.gateway.url).toBe('http://parent-config:5001');
    });

    it('should stop at filesystem root when searching parents', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('ENOENT'));

      const config = await loadConfig('/', { searchParents: true });

      expect(config).toEqual(getDefaultConfig());
    });

    it('should not search parents by default', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('ENOENT'));

      await loadConfig('/project/deep/nested');

      // Should only try once - the exact path
      expect(fs.readFile).toHaveBeenCalledTimes(1);
    });
  });

  describe('Config Types', () => {
    it('should have correct gateway config structure', async () => {
      const config = getDefaultConfig();

      expect(config.gateway).toHaveProperty('url');
      expect(config.gateway).toHaveProperty('namespace');
      expect(typeof config.gateway.url).toBe('string');
      expect(typeof config.gateway.namespace).toBe('string');
    });

    it('should have correct tasks config structure', async () => {
      const config = getDefaultConfig();

      expect(config.tasks).toHaveProperty('localPath');
      expect(config.tasks).toHaveProperty('remoteFetch');
      expect(typeof config.tasks.localPath).toBe('string');
      expect(typeof config.tasks.remoteFetch).toBe('boolean');
    });

    it('should have correct templates config structure', async () => {
      const config = getDefaultConfig();

      expect(config.templates).toHaveProperty('customPath');
      expect(typeof config.templates.customPath).toBe('string');
    });
  });
});
