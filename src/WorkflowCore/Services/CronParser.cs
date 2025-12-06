using NCrontab;

namespace WorkflowCore.Services;

/// <summary>
/// NCrontab-based implementation of cron expression parsing.
/// Supports standard 5-field cron expressions (minute hour day month weekday).
/// </summary>
public class CronParser : ICronParser
{
    /// <inheritdoc />
    public bool IsValid(string cronExpression)
    {
        if (string.IsNullOrWhiteSpace(cronExpression))
            return false;

        try
        {
            CrontabSchedule.Parse(cronExpression);
            return true;
        }
        catch
        {
            return false;
        }
    }

    /// <inheritdoc />
    public DateTime? GetNextOccurrence(string cronExpression, DateTime baseTime)
    {
        if (string.IsNullOrWhiteSpace(cronExpression))
            return null;

        try
        {
            var schedule = CrontabSchedule.Parse(cronExpression);
            return schedule.GetNextOccurrence(baseTime);
        }
        catch
        {
            return null;
        }
    }

    /// <inheritdoc />
    public List<DateTime> GetNextOccurrences(string cronExpression, DateTime baseTime, int count)
    {
        if (string.IsNullOrWhiteSpace(cronExpression) || count <= 0)
            return new List<DateTime>();

        try
        {
            var schedule = CrontabSchedule.Parse(cronExpression);
            var occurrences = new List<DateTime>();
            var current = baseTime;

            for (int i = 0; i < count; i++)
            {
                current = schedule.GetNextOccurrence(current);
                occurrences.Add(current);
            }

            return occurrences;
        }
        catch
        {
            return new List<DateTime>();
        }
    }

    /// <inheritdoc />
    public string GetDescription(string cronExpression)
    {
        if (string.IsNullOrWhiteSpace(cronExpression))
            return "Invalid cron expression";

        if (!IsValid(cronExpression))
            return "Invalid cron expression";

        // Parse the cron expression to provide human-readable description
        var parts = cronExpression.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length != 5)
            return "Invalid cron expression";

        var minute = parts[0];
        var hour = parts[1];
        var dayOfMonth = parts[2];
        var month = parts[3];
        var dayOfWeek = parts[4];

        // Common patterns
        if (minute == "*" && hour == "*" && dayOfMonth == "*" && month == "*" && dayOfWeek == "*")
            return "Every minute";

        if (minute == "0" && hour == "*" && dayOfMonth == "*" && month == "*" && dayOfWeek == "*")
            return "Every hour";

        if (minute == "0" && hour == "0" && dayOfMonth == "*" && month == "*" && dayOfWeek == "*")
            return "Every day at midnight";

        if (minute.StartsWith("*/"))
        {
            var interval = minute.Substring(2);
            return $"Every {interval} minutes";
        }

        if (hour.StartsWith("*/"))
        {
            var interval = hour.Substring(2);
            return $"Every {interval} hours";
        }

        // Generic description
        return $"Cron: {cronExpression}";
    }

    /// <inheritdoc />
    public bool IsDue(string cronExpression, DateTime? lastRun, DateTime now)
    {
        if (!IsValid(cronExpression))
            return false;

        // If never run, it's due
        if (lastRun == null)
            return true;

        // Get the next occurrence after the last run
        var nextOccurrence = GetNextOccurrence(cronExpression, lastRun.Value);

        if (nextOccurrence == null)
            return false;

        // Check if the next occurrence is at or before now
        return nextOccurrence.Value <= now;
    }
}
