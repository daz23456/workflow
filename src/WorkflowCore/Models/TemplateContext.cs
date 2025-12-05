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
/// Supports nesting via Parent reference for nested forEach loops.
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

    /// <summary>
    /// Parent forEach context for nested loops.
    /// Null if this is the outermost forEach.
    /// </summary>
    public ForEachContext? Parent { get; set; }

    /// <summary>
    /// Gets the nesting depth of this context.
    /// 1 for outermost, 2 for first nested level, etc.
    /// </summary>
    public int NestingDepth
    {
        get
        {
            int depth = 1;
            var current = Parent;
            while (current != null)
            {
                depth++;
                current = current.Parent;
            }
            return depth;
        }
    }

    /// <summary>
    /// Gets an ancestor context by levels up (1 = parent, 2 = grandparent, etc.).
    /// Returns null if the requested level doesn't exist.
    /// </summary>
    public ForEachContext? GetAncestor(int levels)
    {
        if (levels < 1) return null;

        var current = Parent;
        for (int i = 1; i < levels && current != null; i++)
        {
            current = current.Parent;
        }
        return current;
    }

    /// <summary>
    /// Gets the root (outermost) forEach context.
    /// Returns this context if it has no parent.
    /// </summary>
    public ForEachContext GetRoot()
    {
        var current = this;
        while (current.Parent != null)
        {
            current = current.Parent;
        }
        return current;
    }
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
