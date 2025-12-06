namespace WorkflowCore.Services;

/// <summary>
/// Interface for parsing and evaluating cron expressions.
/// Used by ScheduleTriggerService to determine when workflows should execute.
/// </summary>
public interface ICronParser
{
    /// <summary>
    /// Validates if the cron expression is syntactically correct.
    /// </summary>
    /// <param name="cronExpression">The cron expression to validate (5 fields: minute hour day month weekday)</param>
    /// <returns>True if valid, false otherwise</returns>
    bool IsValid(string cronExpression);

    /// <summary>
    /// Gets the next occurrence after the specified base time.
    /// </summary>
    /// <param name="cronExpression">The cron expression</param>
    /// <param name="baseTime">The time to calculate from</param>
    /// <returns>The next occurrence, or null if invalid expression</returns>
    DateTime? GetNextOccurrence(string cronExpression, DateTime baseTime);

    /// <summary>
    /// Gets multiple upcoming occurrences for preview/scheduling purposes.
    /// </summary>
    /// <param name="cronExpression">The cron expression</param>
    /// <param name="baseTime">The time to calculate from</param>
    /// <param name="count">Number of occurrences to return</param>
    /// <returns>List of upcoming occurrences (empty if invalid expression)</returns>
    List<DateTime> GetNextOccurrences(string cronExpression, DateTime baseTime, int count);

    /// <summary>
    /// Gets a human-readable description of the cron schedule.
    /// </summary>
    /// <param name="cronExpression">The cron expression</param>
    /// <returns>Human-readable description (e.g., "Every hour", "Every day at midnight")</returns>
    string GetDescription(string cronExpression);

    /// <summary>
    /// Determines if a schedule is due to run based on last execution time.
    /// </summary>
    /// <param name="cronExpression">The cron expression</param>
    /// <param name="lastRun">The last time the schedule was executed (null if never)</param>
    /// <param name="now">The current time to check against</param>
    /// <returns>True if the schedule should execute now</returns>
    bool IsDue(string cronExpression, DateTime? lastRun, DateTime now);
}
