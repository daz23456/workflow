namespace WorkflowCore.Models;

/// <summary>
/// Container for all label statistics returned by GetAllLabelsAsync.
/// </summary>
public class LabelStatistics
{
    /// <summary>
    /// All unique tags with their usage counts.
    /// </summary>
    public List<TagStatistic> Tags { get; set; } = new();

    /// <summary>
    /// All unique categories with their usage counts.
    /// </summary>
    public List<CategoryStatistic> Categories { get; set; } = new();
}

/// <summary>
/// Statistics for a single tag.
/// </summary>
public class TagStatistic
{
    /// <summary>
    /// The tag value.
    /// </summary>
    public string Value { get; set; } = string.Empty;

    /// <summary>
    /// Number of workflows using this tag.
    /// </summary>
    public int WorkflowCount { get; set; }

    /// <summary>
    /// Number of tasks using this tag.
    /// </summary>
    public int TaskCount { get; set; }
}

/// <summary>
/// Statistics for a single category.
/// </summary>
public class CategoryStatistic
{
    /// <summary>
    /// The category value.
    /// </summary>
    public string Value { get; set; } = string.Empty;

    /// <summary>
    /// Number of workflows using this category.
    /// </summary>
    public int WorkflowCount { get; set; }
}
