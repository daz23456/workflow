/**
 * Configuration Loader
 * Loads and manages .workflowrc configuration files
 */
import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'yaml';
/**
 * Config file name
 */
export const CONFIG_FILE_NAME = '.workflowrc';
/**
 * Get the default configuration
 */
export function getDefaultConfig() {
    return {
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
    };
}
/**
 * Deep merge two configuration objects
 * The partial config overrides values in defaults
 */
export function mergeConfigs(defaults, partial) {
    return {
        gateway: {
            ...defaults.gateway,
            ...(partial.gateway || {})
        },
        tasks: {
            ...defaults.tasks,
            ...(partial.tasks || {})
        },
        templates: {
            ...defaults.templates,
            ...(partial.templates || {})
        }
    };
}
/**
 * Parse configuration content (YAML or JSON)
 */
function parseConfigContent(content) {
    const trimmed = content.trim();
    if (!trimmed) {
        return null;
    }
    // Try JSON first (it's a valid YAML subset)
    try {
        if (trimmed.startsWith('{')) {
            return JSON.parse(trimmed);
        }
    }
    catch {
        // Not JSON, try YAML
    }
    // Parse as YAML
    const parsed = yaml.parse(trimmed);
    return parsed;
}
/**
 * Try to read config from a specific directory
 */
async function tryReadConfig(dir) {
    const configPath = path.join(dir, CONFIG_FILE_NAME);
    try {
        const content = await fs.readFile(configPath, 'utf-8');
        return parseConfigContent(content);
    }
    catch {
        return null;
    }
}
/**
 * Load configuration from a directory
 * Optionally searches parent directories for .workflowrc
 */
export async function loadConfig(directory, options = {}) {
    const defaults = getDefaultConfig();
    const startDir = directory || process.cwd();
    const { searchParents = false } = options;
    // Try current directory first
    let partial = await tryReadConfig(startDir);
    if (partial) {
        return mergeConfigs(defaults, partial);
    }
    // If searching parents, walk up the directory tree
    if (searchParents) {
        let currentDir = startDir;
        let previousDir = '';
        while (currentDir !== previousDir) {
            const parentDir = path.dirname(currentDir);
            if (parentDir === currentDir) {
                // Reached root
                break;
            }
            partial = await tryReadConfig(parentDir);
            if (partial) {
                return mergeConfigs(defaults, partial);
            }
            previousDir = currentDir;
            currentDir = parentDir;
        }
    }
    // No config found, return defaults
    return defaults;
}
//# sourceMappingURL=config.js.map