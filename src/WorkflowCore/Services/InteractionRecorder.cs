using System.Collections.Concurrent;
using WorkflowCore.Models;

namespace WorkflowCore.Services;

/// <summary>
/// Records and retrieves task interactions for golden file testing.
/// </summary>
public class InteractionRecorder : IInteractionRecorder
{
    private readonly ConcurrentDictionary<string, List<RecordedInteraction>> _interactionsByTask = new();

    /// <inheritdoc />
    public void RecordInteraction(RecordedInteraction interaction)
    {
        var interactions = _interactionsByTask.GetOrAdd(interaction.TaskName, _ => new List<RecordedInteraction>());
        lock (interactions)
        {
            interactions.Add(interaction);
        }
    }

    /// <inheritdoc />
    public RecordedInteraction? GetLatestInteraction(string taskName)
    {
        if (_interactionsByTask.TryGetValue(taskName, out var interactions))
        {
            lock (interactions)
            {
                return interactions.OrderByDescending(i => i.RecordedAt).FirstOrDefault();
            }
        }
        return null;
    }

    /// <inheritdoc />
    public IReadOnlyList<RecordedInteraction> GetAllInteractions(string taskName)
    {
        if (_interactionsByTask.TryGetValue(taskName, out var interactions))
        {
            lock (interactions)
            {
                return interactions.ToList();
            }
        }
        return Array.Empty<RecordedInteraction>();
    }

    /// <inheritdoc />
    public IReadOnlyList<RecordedInteraction> GetInteractionsByEnvironment(string taskName, string environment)
    {
        if (_interactionsByTask.TryGetValue(taskName, out var interactions))
        {
            lock (interactions)
            {
                return interactions.Where(i => i.Environment == environment).ToList();
            }
        }
        return Array.Empty<RecordedInteraction>();
    }

    /// <inheritdoc />
    public RecordedInteraction? FindMatchingInteraction(string taskName, string? requestBody)
    {
        if (_interactionsByTask.TryGetValue(taskName, out var interactions))
        {
            lock (interactions)
            {
                return interactions.FirstOrDefault(i => i.MatchesRequest(requestBody));
            }
        }
        return null;
    }

    /// <inheritdoc />
    public void ClearInteractions(string taskName)
    {
        if (_interactionsByTask.TryGetValue(taskName, out var interactions))
        {
            lock (interactions)
            {
                interactions.Clear();
            }
        }
    }
}
