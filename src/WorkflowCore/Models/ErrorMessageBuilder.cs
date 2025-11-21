namespace WorkflowCore.Models;

public static class ErrorMessageBuilder
{
    public static string TypeMismatch(string fieldName, string expectedType, string actualType)
    {
        return $"Field '{fieldName}' has a type mismatch: expected '{expectedType}' but got '{actualType}'.";
    }

    public static string MissingRequiredField(string taskId, string fieldName, List<string> availableFields)
    {
        var message = $"Task '{taskId}' is missing required field '{fieldName}'.";

        // Find similar fields (simple case-insensitive contains check for suggestions)
        var suggestions = availableFields
            .Where(f => f.Equals(fieldName, StringComparison.OrdinalIgnoreCase) ||
                       LevenshteinDistance(f.ToLower(), fieldName.ToLower()) <= 2)
            .ToList();

        if (suggestions.Any())
        {
            message += $" Did you mean: {string.Join(", ", suggestions.Select(s => $"'{s}'"))}? (suggestion)";
        }
        else if (availableFields.Any())
        {
            message += $" Available fields: {string.Join(", ", availableFields.Select(f => $"'{f}'"))}.";
        }

        return message;
    }

    public static string CircularDependency(List<string> cyclePath)
    {
        var cycle = string.Join(" -> ", cyclePath);
        return $"Circular dependency detected: {cycle}";
    }

    // Simple Levenshtein distance for field name suggestions
    private static int LevenshteinDistance(string source, string target)
    {
        if (string.IsNullOrEmpty(source))
        {
            return string.IsNullOrEmpty(target) ? 0 : target.Length;
        }

        if (string.IsNullOrEmpty(target))
        {
            return source.Length;
        }

        int[,] distance = new int[source.Length + 1, target.Length + 1];

        for (int i = 0; i <= source.Length; i++)
        {
            distance[i, 0] = i;
        }

        for (int j = 0; j <= target.Length; j++)
        {
            distance[0, j] = j;
        }

        for (int i = 1; i <= source.Length; i++)
        {
            for (int j = 1; j <= target.Length; j++)
            {
                int cost = (target[j - 1] == source[i - 1]) ? 0 : 1;

                distance[i, j] = Math.Min(
                    Math.Min(distance[i - 1, j] + 1, distance[i, j - 1] + 1),
                    distance[i - 1, j - 1] + cost);
            }
        }

        return distance[source.Length, target.Length];
    }
}
