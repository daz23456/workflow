#!/usr/bin/env node
/**
 * Workflow CLI
 * Generate WorkflowTask CRDs from OpenAPI specifications
 */
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { parseOpenApiSpec } from './openapi-parser.js';
import { generateTasksFromSpec, writeTasksToFiles } from './crd-generator.js';
const program = new Command();
program
    .name('workflow-cli')
    .description('CLI tool for workflow orchestration - generate WorkflowTask CRDs from OpenAPI specs')
    .version('0.1.0');
/**
 * Import command - generate CRDs from OpenAPI spec
 */
program
    .command('import')
    .description('Import an OpenAPI spec and generate WorkflowTask CRDs')
    .argument('<type>', 'Import type (currently only "openapi" is supported)')
    .argument('<source>', 'URL or file path to OpenAPI spec (e.g., http://localhost:5100/swagger/v1/swagger.json)')
    .option('-b, --base-url <url>', 'Override base URL for generated tasks')
    .option('-o, --output <dir>', 'Output directory for YAML files', './crds')
    .option('-n, --namespace <ns>', 'Kubernetes namespace', 'default')
    .option('-p, --prefix <prefix>', 'Task name prefix')
    .option('-t, --tags <tags>', 'Only import endpoints with these tags (comma-separated)')
    .option('-x, --exclude-tags <tags>', 'Exclude endpoints with these tags (comma-separated)')
    .option('-s, --single-file', 'Output all tasks to a single file', false)
    .option('-d, --dry-run', 'Print output without writing files', false)
    .action(async (type, source, options) => {
    if (type !== 'openapi') {
        console.error(chalk.red(`Unknown import type: ${type}. Only "openapi" is supported.`));
        process.exit(1);
    }
    const importOptions = {
        source,
        baseUrl: options.baseUrl,
        output: options.output,
        namespace: options.namespace,
        prefix: options.prefix,
        tags: options.tags?.split(',').map((t) => t.trim()),
        excludeTags: options.excludeTags?.split(',').map((t) => t.trim()),
        singleFile: options.singleFile,
        dryRun: options.dryRun
    };
    await importOpenApi(importOptions);
});
/**
 * Main import function
 */
async function importOpenApi(options) {
    console.log(chalk.blue('\n🔧 Workflow CLI - OpenAPI Import\n'));
    const spinner = ora('Fetching OpenAPI spec...').start();
    try {
        // Parse the OpenAPI spec
        spinner.text = `Parsing ${options.source}...`;
        const spec = await parseOpenApiSpec(options.source);
        spinner.succeed(`Parsed OpenAPI spec: ${spec.title} v${spec.version}`);
        // Determine base URL
        const baseUrl = options.baseUrl || spec.baseUrl;
        console.log(chalk.gray(`  Base URL: ${baseUrl}`));
        console.log(chalk.gray(`  Endpoints found: ${spec.endpoints.length}`));
        // Generate tasks
        spinner.start('Generating WorkflowTask CRDs...');
        const tasks = generateTasksFromSpec(spec, {
            baseUrl,
            namespace: options.namespace || 'default',
            prefix: options.prefix,
            tags: options.tags,
            excludeTags: options.excludeTags
        });
        spinner.succeed(`Generated ${tasks.length} WorkflowTask CRDs`);
        if (tasks.length === 0) {
            console.log(chalk.yellow('\n⚠️  No tasks generated. Check your tag filters.'));
            return;
        }
        // Print summary
        console.log(chalk.blue('\n📋 Generated Tasks:\n'));
        for (const task of tasks) {
            console.log(chalk.green(`  ✓ ${task.name}`));
            console.log(chalk.gray(`    ${task.method} ${task.path}`));
        }
        // Dry run - just print YAML
        if (options.dryRun) {
            console.log(chalk.blue('\n📄 Generated YAML (dry run):\n'));
            console.log(chalk.gray('---'));
            for (const task of tasks) {
                console.log(task.yaml);
                console.log(chalk.gray('---'));
            }
            return;
        }
        // Write files
        const outputDir = options.output || './crds';
        spinner.start(`Writing files to ${outputDir}...`);
        await writeTasksToFiles(tasks, outputDir, options.singleFile);
        spinner.succeed(`Written to ${outputDir}`);
        // Final summary
        console.log(chalk.green('\n✅ Import complete!\n'));
        console.log(chalk.gray(`  Tasks generated: ${tasks.length}`));
        console.log(chalk.gray(`  Output directory: ${outputDir}`));
        console.log(chalk.gray(`  Namespace: ${options.namespace || 'default'}`));
        if (options.singleFile) {
            console.log(chalk.gray(`  File: ${outputDir}/workflow-tasks.yaml`));
        }
        else {
            console.log(chalk.gray(`  Files: task-*.yaml`));
        }
        console.log(chalk.blue('\n💡 Next steps:'));
        console.log(chalk.gray('  1. Review generated CRDs'));
        console.log(chalk.gray('  2. Apply to Kubernetes: kubectl apply -f ' + outputDir));
        console.log(chalk.gray('  3. Create workflows using these tasks\n'));
    }
    catch (error) {
        spinner.fail('Import failed');
        if (error instanceof Error) {
            console.error(chalk.red(`\n❌ Error: ${error.message}`));
            if (process.env.DEBUG) {
                console.error(error.stack);
            }
        }
        process.exit(1);
    }
}
// Parse CLI args
program.parse();
//# sourceMappingURL=cli.js.map