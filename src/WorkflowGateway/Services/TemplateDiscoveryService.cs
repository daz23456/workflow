using System.Globalization;
using WorkflowCore.Models;
using WorkflowGateway.Models;

namespace WorkflowGateway.Services;

public interface ITemplateDiscoveryService
{
    Task<List<TemplateMetadata>> DiscoverTemplatesAsync(string? @namespace = null, string? category = null, string? difficulty = null);
    Task<TemplateMetadata?> GetTemplateByNameAsync(string name, string? @namespace = null);
}

public class TemplateDiscoveryService : ITemplateDiscoveryService
{
    private readonly IWorkflowDiscoveryService _workflowDiscoveryService;

    public TemplateDiscoveryService(IWorkflowDiscoveryService workflowDiscoveryService)
    {
        _workflowDiscoveryService = workflowDiscoveryService ?? throw new ArgumentNullException(nameof(workflowDiscoveryService));
    }

    public async Task<List<TemplateMetadata>> DiscoverTemplatesAsync(string? @namespace = null, string? category = null, string? difficulty = null)
    {
        var workflows = await _workflowDiscoveryService.DiscoverWorkflowsAsync(@namespace);

        var templates = workflows
            .Where(IsTemplate)
            .Select(ConvertToTemplateMetadata)
            .Where(t => t != null)
            .Cast<TemplateMetadata>()
            .ToList();

        // Apply filters
        if (!string.IsNullOrEmpty(category))
        {
            templates = templates.Where(t => t.Category.ToString().Equals(category, StringComparison.OrdinalIgnoreCase)
                                          || ConvertCategoryToAnnotationValue(t.Category).Equals(category, StringComparison.OrdinalIgnoreCase))
                                  .ToList();
        }

        if (!string.IsNullOrEmpty(difficulty))
        {
            templates = templates.Where(t => t.Difficulty.ToString().Equals(difficulty, StringComparison.OrdinalIgnoreCase))
                                  .ToList();
        }

        return templates;
    }

    public async Task<TemplateMetadata?> GetTemplateByNameAsync(string name, string? @namespace = null)
    {
        var workflow = await _workflowDiscoveryService.GetWorkflowByNameAsync(name, @namespace);

        if (workflow == null || !IsTemplate(workflow))
        {
            return null;
        }

        return ConvertToTemplateMetadata(workflow);
    }

    private static bool IsTemplate(WorkflowResource workflow)
    {
        return workflow.Metadata?.Annotations?.TryGetValue("workflow.example.com/template", out var value) == true
               && value == "true";
    }

    private static TemplateMetadata? ConvertToTemplateMetadata(WorkflowResource workflow)
    {
        var annotations = workflow.Metadata?.Annotations;
        if (annotations == null)
        {
            return null;
        }

        // Parse category
        if (!annotations.TryGetValue("workflow.example.com/category", out var categoryStr))
        {
            return null;
        }

        if (!TryParseCategory(categoryStr, out var category))
        {
            return null;
        }

        // Parse difficulty
        if (!annotations.TryGetValue("workflow.example.com/difficulty", out var difficultyStr))
        {
            return null;
        }

        if (!Enum.TryParse<TemplateDifficulty>(difficultyStr, ignoreCase: true, out var difficulty))
        {
            return null;
        }

        // Parse tags
        var tags = new List<string>();
        if (annotations.TryGetValue("workflow.example.com/tags", out var tagsStr) && !string.IsNullOrEmpty(tagsStr))
        {
            tags = tagsStr.Split(',', StringSplitOptions.RemoveEmptyEntries)
                         .Select(t => t.Trim())
                         .ToList();
        }

        // Parse estimated time
        var estimatedTime = 5; // Default
        if (annotations.TryGetValue("workflow.example.com/estimatedTime", out var timeStr))
        {
            if (int.TryParse(timeStr, out var parsedTime))
            {
                estimatedTime = parsedTime;
            }
        }

        // Calculate task count
        var taskCount = workflow.Spec.Tasks?.Count ?? 0;

        // Detect parallel execution
        var hasParallelExecution = DetectParallelExecution(workflow);

        return new TemplateMetadata
        {
            Name = workflow.Metadata?.Name ?? "",
            Category = category,
            Difficulty = difficulty,
            Description = workflow.Spec.Description ?? "",
            Tags = tags,
            EstimatedSetupTime = estimatedTime,
            TaskCount = taskCount,
            HasParallelExecution = hasParallelExecution,
            Namespace = workflow.Metadata?.Namespace ?? "default"
        };
    }

    private static bool TryParseCategory(string categoryStr, out TemplateCategory category)
    {
        // Handle both PascalCase (enum name) and kebab-case (annotation value)
        switch (categoryStr.ToLowerInvariant())
        {
            case "api-composition":
            case "apicomposition":
                category = TemplateCategory.ApiComposition;
                return true;
            case "data-processing":
            case "dataprocessing":
                category = TemplateCategory.DataProcessing;
                return true;
            case "real-time":
            case "realtime":
                category = TemplateCategory.RealTime;
                return true;
            case "integrations":
                category = TemplateCategory.Integrations;
                return true;
            default:
                category = default;
                return false;
        }
    }

    private static string ConvertCategoryToAnnotationValue(TemplateCategory category)
    {
        return category switch
        {
            TemplateCategory.ApiComposition => "api-composition",
            TemplateCategory.DataProcessing => "data-processing",
            TemplateCategory.RealTime => "real-time",
            TemplateCategory.Integrations => "integrations",
            _ => category.ToString().ToLowerInvariant()
        };
    }

    private static bool DetectParallelExecution(WorkflowResource workflow)
    {
        var tasks = workflow.Spec.Tasks;
        if (tasks == null || tasks.Count <= 1)
        {
            return false;
        }

        // Parallel execution occurs when there are 2+ tasks that can run simultaneously.
        // This happens when there are tasks with no dependencies.

        // Find tasks with no dependencies
        var tasksWithNoDeps = tasks.Where(t => t.DependsOn == null || t.DependsOn.Count == 0).ToList();

        // If there are 2+ tasks with no dependencies, they run in parallel
        if (tasksWithNoDeps.Count >= 2)
        {
            return true;
        }

        // Check if any tasks at the same dependency level exist
        // (i.e., tasks that depend on the same task(s) but not on each other)
        var taskById = tasks.ToDictionary(t => t.Id);

        foreach (var task in tasks)
        {
            var deps = task.DependsOn ?? new List<string>();
            if (deps.Count == 0) continue; // Already checked above

            // Find other tasks with the same dependencies
            var tasksWithSameDeps = tasks.Where(t =>
                t.Id != task.Id &&
                t.DependsOn != null &&
                t.DependsOn.Count == deps.Count &&
                t.DependsOn.All(deps.Contains) &&
                !deps.Contains(t.Id) // t doesn't depend on task
            ).ToList();

            if (tasksWithSameDeps.Any())
            {
                return true;
            }
        }

        return false;
    }
}
