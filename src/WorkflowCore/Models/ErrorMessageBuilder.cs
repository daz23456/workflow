namespace WorkflowCore.Models;

public static class ErrorMessageBuilder
{
    public static ValidationError TypeMismatch(
        string taskId,
        string field,
        string expected,
        string actual,
        string? suggestedFix = null)
    {
        return new ValidationError
        {
            TaskId = taskId,
            Field = field,
            Message = $"Type mismatch: expected '{expected}', got '{actual}'",
            SuggestedFix = suggestedFix
        };
    }

    public static ValidationError MissingRequiredField(
        string taskId,
        string field,
        List<string>? availableFields = null)
    {
        var message = $"Required field '{field}' is missing";
        string? suggestion = null;

        if (availableFields?.Any() == true)
        {
            suggestion = $"Available fields: {string.Join(", ", availableFields)}";
        }

        return new ValidationError
        {
            TaskId = taskId,
            Field = field,
            Message = message,
            SuggestedFix = suggestion
        };
    }

    public static ValidationError InvalidTemplate(
        string taskId,
        string field,
        string template,
        string reason)
    {
        return new ValidationError
        {
            TaskId = taskId,
            Field = field,
            Message = $"Invalid template '{template}': {reason}",
            SuggestedFix = "Check template syntax: {{input.field}} or {{tasks.taskId.output.field}}"
        };
    }

    public static ValidationError CircularDependency(
        string workflowId,
        List<string> cyclePath)
    {
        return new ValidationError
        {
            TaskId = workflowId,
            Message = $"Circular dependency detected: {string.Join(" → ", cyclePath)}",
            SuggestedFix = "Remove or reorder task dependencies to break the cycle"
        };
    }
}
