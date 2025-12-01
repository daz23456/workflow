using WorkflowCore.Models;
using WorkflowCore.Services;

namespace WorkflowOperator.Webhooks;

public class WorkflowValidationWebhook
{
    private readonly ITemplateParser _templateParser;
    private readonly IExecutionGraphBuilder _graphBuilder;

    public WorkflowValidationWebhook(
        ITemplateParser templateParser,
        IExecutionGraphBuilder graphBuilder)
    {
        _templateParser = templateParser ?? throw new ArgumentNullException(nameof(templateParser));
        _graphBuilder = graphBuilder ?? throw new ArgumentNullException(nameof(graphBuilder));
    }

    public async Task<AdmissionResult> ValidateAsync(
        WorkflowResource workflow,
        List<WorkflowTaskResource> availableTasks)
    {
        // Validate workflow has tasks
        if (workflow.Spec.Tasks == null || workflow.Spec.Tasks.Count == 0)
        {
            return AdmissionResult.Deny("Workflow must have at least one task");
        }

        // Build task lookup
        var taskLookup = availableTasks.ToDictionary(t => t.Metadata.Name, t => t);

        // Validate all task references exist
        foreach (var step in workflow.Spec.Tasks)
        {
            if (!taskLookup.ContainsKey(step.TaskRef))
            {
                var errorMessage = BuildTaskNotFoundError(step.TaskRef, taskLookup.Keys.ToList());
                return AdmissionResult.Deny(errorMessage);
            }

            // Validate templates in inputs
            foreach (var (inputKey, inputTemplate) in step.Input)
            {
                var parseResult = _templateParser.Parse(inputTemplate);
                if (!parseResult.IsValid)
                {
                    var errors = string.Join("; ", parseResult.Errors);
                    return AdmissionResult.Deny(
                        $"Invalid template in task '{step.Id}', input '{inputKey}': {errors}");
                }
            }
        }

        // Validate execution graph (detect circular dependencies)
        var graphResult = _graphBuilder.Build(workflow);
        if (!graphResult.IsValid)
        {
            var errors = string.Join("; ", graphResult.Errors.Select(e => e.Message));
            return AdmissionResult.Deny($"Workflow validation failed: {errors}");
        }

        return await Task.FromResult(AdmissionResult.Allow());
    }

    /// <summary>
    /// Builds a helpful error message with fuzzy-matched suggestions
    /// </summary>
    private static string BuildTaskNotFoundError(string taskRef, List<string> availableTaskNames)
    {
        var suggestions = FindSimilarTasks(taskRef, availableTaskNames, maxSuggestions: 5);

        if (suggestions.Count > 0)
        {
            var suggestionList = string.Join(", ", suggestions.Select(s => $"'{s}'"));
            return $"Task reference '{taskRef}' not found. Did you mean: {suggestionList}?";
        }

        // No close matches - show a sample of available tasks
        if (availableTaskNames.Count == 0)
        {
            return $"Task reference '{taskRef}' not found. No tasks are currently registered.";
        }

        var sample = availableTaskNames.Take(5).ToList();
        var sampleList = string.Join(", ", sample.Select(s => $"'{s}'"));
        var suffix = availableTaskNames.Count > 5 ? $" (and {availableTaskNames.Count - 5} more)" : "";

        return $"Task reference '{taskRef}' not found. Available tasks include: {sampleList}{suffix}";
    }

    /// <summary>
    /// Finds similar task names using multiple matching strategies
    /// </summary>
    private static List<string> FindSimilarTasks(string input, List<string> candidates, int maxSuggestions)
    {
        var inputLower = input.ToLowerInvariant();

        var scored = candidates
            .Select(candidate => new
            {
                Name = candidate,
                Score = CalculateSimilarityScore(inputLower, candidate.ToLowerInvariant())
            })
            .Where(x => x.Score > 0)
            .OrderByDescending(x => x.Score)
            .Take(maxSuggestions)
            .Select(x => x.Name)
            .ToList();

        return scored;
    }

    /// <summary>
    /// Calculates a similarity score between two strings (higher = more similar)
    /// </summary>
    private static double CalculateSimilarityScore(string input, string candidate)
    {
        double score = 0;

        // Exact prefix match (highest value) - e.g., "fetch" matches "fetch-user-data"
        if (candidate.StartsWith(input))
        {
            score += 100;
        }
        else if (input.StartsWith(candidate))
        {
            score += 80;
        }

        // Contains match - e.g., "user" matches "fetch-user-data"
        if (candidate.Contains(input))
        {
            score += 50;
        }
        else if (input.Contains(candidate))
        {
            score += 40;
        }

        // Word overlap - e.g., "fetch-users" matches "fetch-user-data"
        var inputWords = input.Split('-', '_', '.').Where(w => w.Length > 0).ToHashSet();
        var candidateWords = candidate.Split('-', '_', '.').Where(w => w.Length > 0).ToHashSet();
        var commonWords = inputWords.Intersect(candidateWords).Count();
        if (commonWords > 0)
        {
            score += commonWords * 30;
        }

        // Levenshtein distance for typo detection
        var distance = LevenshteinDistance(input, candidate);
        var maxLen = Math.Max(input.Length, candidate.Length);
        if (maxLen > 0)
        {
            var similarity = 1.0 - ((double)distance / maxLen);
            if (similarity > 0.5) // Only count if reasonably similar
            {
                score += similarity * 40;
            }
        }

        return score;
    }

    /// <summary>
    /// Calculates the Levenshtein distance between two strings
    /// </summary>
    private static int LevenshteinDistance(string s1, string s2)
    {
        var m = s1.Length;
        var n = s2.Length;
        var d = new int[m + 1, n + 1];

        for (var i = 0; i <= m; i++) d[i, 0] = i;
        for (var j = 0; j <= n; j++) d[0, j] = j;

        for (var i = 1; i <= m; i++)
        {
            for (var j = 1; j <= n; j++)
            {
                var cost = s1[i - 1] == s2[j - 1] ? 0 : 1;
                d[i, j] = Math.Min(
                    Math.Min(d[i - 1, j] + 1, d[i, j - 1] + 1),
                    d[i - 1, j - 1] + cost);
            }
        }

        return d[m, n];
    }
}
