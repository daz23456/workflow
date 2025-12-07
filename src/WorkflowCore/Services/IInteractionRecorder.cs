using WorkflowCore.Models;

namespace WorkflowCore.Services;

/// <summary>
/// Interface for recording and retrieving task interactions.
/// </summary>
public interface IInteractionRecorder
{
    /// <summary>
    /// Record a new interaction.
    /// </summary>
    void RecordInteraction(RecordedInteraction interaction);

    /// <summary>
    /// Get the most recent interaction for a task.
    /// </summary>
    RecordedInteraction? GetLatestInteraction(string taskName);

    /// <summary>
    /// Get all interactions for a task.
    /// </summary>
    IReadOnlyList<RecordedInteraction> GetAllInteractions(string taskName);

    /// <summary>
    /// Get interactions for a task in a specific environment.
    /// </summary>
    IReadOnlyList<RecordedInteraction> GetInteractionsByEnvironment(string taskName, string environment);

    /// <summary>
    /// Find an interaction matching a specific request body.
    /// </summary>
    RecordedInteraction? FindMatchingInteraction(string taskName, string? requestBody);

    /// <summary>
    /// Clear all interactions for a task.
    /// </summary>
    void ClearInteractions(string taskName);
}
