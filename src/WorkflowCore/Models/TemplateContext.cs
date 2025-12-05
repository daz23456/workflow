using System.Collections.Concurrent;

namespace WorkflowCore.Models;

public class TemplateContext
{
    public Dictionary<string, object> Input { get; set; } = new();
    public ConcurrentDictionary<string, Dictionary<string, object>> TaskOutputs { get; set; } = new();

    /// <summary>
    /// Context for forEach iteration. Set during forEach execution.
    /// </summary>
    public ForEachContext? ForEach { get; set; }
}

/// <summary>
/// Context for a forEach iteration, providing access to current item and index.
/// </summary>
public class ForEachContext
{
    /// <summary>
    /// The variable name for the current item (from ForEachSpec.ItemVar).
    /// </summary>
    public string ItemVar { get; set; } = string.Empty;

    /// <summary>
    /// The current item being iterated.
    /// </summary>
    public object? CurrentItem { get; set; }

    /// <summary>
    /// The current iteration index (0-based).
    /// </summary>
    public int Index { get; set; }

    /// <summary>
    /// Parent task ID for tracking nested forEach.
    /// </summary>
    public string? ParentTaskId { get; set; }
}

public class TemplateResolutionException : Exception
{
    public string? TemplatePath { get; }

    public TemplateResolutionException(string message, string? templatePath = null)
        : base(message)
    {
        TemplatePath = templatePath;
    }

    public TemplateResolutionException(string message, Exception innerException, string? templatePath = null)
        : base(message, innerException)
    {
        TemplatePath = templatePath;
    }
}
