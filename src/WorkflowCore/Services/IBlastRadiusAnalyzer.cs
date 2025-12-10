using WorkflowCore.Models;

namespace WorkflowCore.Services;

/// <summary>
/// Analyzes the blast radius of task changes by traversing the dependency graph.
/// </summary>
public interface IBlastRadiusAnalyzer
{
    /// <summary>
    /// Analyzes the blast radius for a task change.
    /// </summary>
    /// <param name="taskName">The task being analyzed.</param>
    /// <param name="maxDepth">Maximum depth to traverse (use int.MaxValue for unlimited).</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>The blast radius result with all affected workflows and tasks.</returns>
    Task<BlastRadiusResult> AnalyzeAsync(
        string taskName,
        int maxDepth = 1,
        CancellationToken cancellationToken = default);
}
