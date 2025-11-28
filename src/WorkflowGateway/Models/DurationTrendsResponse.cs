using WorkflowCore.Models;

namespace WorkflowGateway.Models;

/// <summary>
/// Response model for duration trends over time.
/// Contains aggregated performance metrics grouped by date.
/// </summary>
public class DurationTrendsResponse
{
    /// <summary>
    /// Type of entity being analyzed ("Workflow" or "Task").
    /// </summary>
    public string EntityType { get; set; } = "";

    /// <summary>
    /// Name of the workflow or task being analyzed.
    /// </summary>
    public string EntityName { get; set; } = "";

    /// <summary>
    /// Number of days covered by this trends data.
    /// </summary>
    public int DaysBack { get; set; }

    /// <summary>
    /// List of data points, one per day, containing duration statistics.
    /// Ordered by date ascending (oldest to newest).
    /// </summary>
    public List<DurationDataPoint> DataPoints { get; set; } = new();
}
