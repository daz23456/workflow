/**
 * Configuration Loader
 * Loads and manages .workflowrc configuration files
 */
/**
 * Config file name
 */
export declare const CONFIG_FILE_NAME = ".workflowrc";
/**
 * Gateway configuration
 */
export interface GatewayConfig {
    url: string;
    namespace: string;
}
/**
 * Tasks configuration
 */
export interface TasksConfig {
    localPath: string;
    remoteFetch: boolean;
}
/**
 * Templates configuration
 */
export interface TemplatesConfig {
    customPath: string;
}
/**
 * Complete workflow CLI configuration
 */
export interface WorkflowConfig {
    gateway: GatewayConfig;
    tasks: TasksConfig;
    templates: TemplatesConfig;
}
/**
 * Partial configuration (for merging)
 */
export type PartialConfig = {
    gateway?: Partial<GatewayConfig>;
    tasks?: Partial<TasksConfig>;
    templates?: Partial<TemplatesConfig>;
};
/**
 * Options for loadConfig
 */
export interface LoadConfigOptions {
    searchParents?: boolean;
}
/**
 * Get the default configuration
 */
export declare function getDefaultConfig(): WorkflowConfig;
/**
 * Deep merge two configuration objects
 * The partial config overrides values in defaults
 */
export declare function mergeConfigs(defaults: WorkflowConfig, partial: PartialConfig): WorkflowConfig;
/**
 * Load configuration from a directory
 * Optionally searches parent directories for .workflowrc
 */
export declare function loadConfig(directory?: string, options?: LoadConfigOptions): Promise<WorkflowConfig>;
//# sourceMappingURL=config.d.ts.map