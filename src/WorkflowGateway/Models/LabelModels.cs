namespace WorkflowGateway.Models;

/// <summary>
/// Response for GET /api/v1/labels
/// </summary>
public class LabelListResponse
{
    public List<TagInfo> Tags { get; set; } = new();
    public List<CategoryInfo> Categories { get; set; } = new();
}

/// <summary>
/// Tag information with usage counts
/// </summary>
public class TagInfo
{
    public string Value { get; set; } = string.Empty;
    public int WorkflowCount { get; set; }
    public int TaskCount { get; set; }
}

/// <summary>
/// Category information with usage count
/// </summary>
public class CategoryInfo
{
    public string Value { get; set; } = string.Empty;
    public int WorkflowCount { get; set; }
}

/// <summary>
/// Response for GET /api/v1/labels/stats
/// </summary>
public class LabelStatsResponse
{
    public int TotalTags { get; set; }
    public int TotalCategories { get; set; }
    public int WorkflowsWithTags { get; set; }
    public int WorkflowsWithCategories { get; set; }
    public int TasksWithTags { get; set; }
    public int TasksWithCategories { get; set; }
    public List<TagInfo> TopTags { get; set; } = new();
    public List<CategoryInfo> TopCategories { get; set; } = new();
}

/// <summary>
/// Request for PATCH /api/v1/workflows/{name}/labels
/// </summary>
public class UpdateLabelsRequest
{
    public List<string>? AddTags { get; set; }
    public List<string>? RemoveTags { get; set; }
    public List<string>? AddCategories { get; set; }
    public List<string>? RemoveCategories { get; set; }
}

/// <summary>
/// Response for label update operations
/// </summary>
public class UpdateLabelsResponse
{
    public bool Success { get; set; }
    public string EntityName { get; set; } = string.Empty;
    public List<string> CurrentTags { get; set; } = new();
    public List<string> CurrentCategories { get; set; } = new();
    public string? Message { get; set; }
}

/// <summary>
/// Request for bulk label operations
/// </summary>
public class BulkLabelsRequest
{
    public List<string> EntityNames { get; set; } = new();
    public List<string>? AddTags { get; set; }
    public List<string>? RemoveTags { get; set; }
    public List<string>? AddCategories { get; set; }
    public List<string>? RemoveCategories { get; set; }
    public bool DryRun { get; set; }
}

/// <summary>
/// Response for bulk label operations
/// </summary>
public class BulkLabelsResponse
{
    public bool Success { get; set; }
    public int AffectedEntities { get; set; }
    public bool IsDryRun { get; set; }
    public List<BulkLabelChange> Changes { get; set; } = new();
    public string? Message { get; set; }
}

/// <summary>
/// Individual entity change in bulk operation
/// </summary>
public class BulkLabelChange
{
    public string Name { get; set; } = string.Empty;
    public List<string> AddedTags { get; set; } = new();
    public List<string> RemovedTags { get; set; } = new();
    public List<string> AddedCategories { get; set; } = new();
    public List<string> RemovedCategories { get; set; } = new();
}
