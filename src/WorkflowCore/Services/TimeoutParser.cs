namespace WorkflowCore.Services;

public static class TimeoutParser
{
    public static TimeSpan? Parse(string? timeoutString)
    {
        if (string.IsNullOrWhiteSpace(timeoutString))
        {
            return null;
        }

        timeoutString = timeoutString.Trim();

        // Support formats: "30s", "5m", "2h", "1.5m"
        if (timeoutString.EndsWith("ms", StringComparison.OrdinalIgnoreCase))
        {
            var value = timeoutString.Substring(0, timeoutString.Length - 2);
            if (double.TryParse(value, out var ms))
            {
                return TimeSpan.FromMilliseconds(ms);
            }
        }
        else if (timeoutString.EndsWith("s", StringComparison.OrdinalIgnoreCase))
        {
            var value = timeoutString.Substring(0, timeoutString.Length - 1);
            if (double.TryParse(value, out var seconds))
            {
                return TimeSpan.FromSeconds(seconds);
            }
        }
        else if (timeoutString.EndsWith("m", StringComparison.OrdinalIgnoreCase))
        {
            var value = timeoutString.Substring(0, timeoutString.Length - 1);
            if (double.TryParse(value, out var minutes))
            {
                return TimeSpan.FromMinutes(minutes);
            }
        }
        else if (timeoutString.EndsWith("h", StringComparison.OrdinalIgnoreCase))
        {
            var value = timeoutString.Substring(0, timeoutString.Length - 1);
            if (double.TryParse(value, out var hours))
            {
                return TimeSpan.FromHours(hours);
            }
        }

        throw new FormatException($"Invalid timeout format: '{timeoutString}'. Expected formats: '30s', '5m', '2h', '500ms'");
    }
}
