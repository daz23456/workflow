namespace WorkflowCore.Models;

/// <summary>
/// Represents a group of tasks that can execute in parallel at a given execution level.
/// </summary>
public class ParallelGroup
{
    /// <summary>
    /// The execution level (0-based). Tasks at level 0 have no dependencies.
    /// Tasks at level N depend on tasks from earlier levels.
    /// </summary>
    public int Level { get; set; }

    /// <summary>
    /// The task IDs that can execute in parallel at this level.
    /// </summary>
    public List<string> TaskIds { get; set; } = new List<string>();
}
