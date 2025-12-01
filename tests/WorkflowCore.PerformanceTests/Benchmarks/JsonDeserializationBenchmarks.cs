using System.Text.Json;
using BenchmarkDotNet.Attributes;

namespace WorkflowCore.PerformanceTests.Benchmarks;

/// <summary>
/// Benchmarks comparing JSON handling strategies for workflow task outputs.
/// Tests the hypothesis: can we skip full deserialization when just passing data through?
/// </summary>
[MemoryDiagnoser]
[SimpleJob(warmupCount: 3, iterationCount: 10)]
public class JsonDeserializationBenchmarks
{
    private string _smallJson = null!;
    private string _mediumJson = null!;
    private string _largeJson = null!;
    private string _weatherApiJson = null!;

    [GlobalSetup]
    public void Setup()
    {
        // Small JSON (~200 bytes) - typical simple API response
        _smallJson = """
        {
            "id": 12345,
            "name": "John Doe",
            "email": "john@example.com",
            "active": true
        }
        """;

        // Medium JSON (~2KB) - typical nested API response
        _mediumJson = GenerateMediumJson();

        // Large JSON (~50KB) - like weather API with forecast data
        _largeJson = GenerateLargeJson();

        // Real-world weather API response structure
        _weatherApiJson = GenerateWeatherJson();
    }

    // ==================== SCENARIO 1: Pass entire output through ====================
    // Template: {{tasks.fetch.output}} - just need the whole thing as string

    [Benchmark(Description = "Small: Full Deserialize then Serialize")]
    public string Small_FullDeserializeThenSerialize()
    {
        var dict = JsonSerializer.Deserialize<Dictionary<string, object>>(_smallJson);
        return JsonSerializer.Serialize(dict);
    }

    [Benchmark(Description = "Small: Keep Raw String (no deserialize)")]
    public string Small_KeepRawString()
    {
        // Just validate it's valid JSON, but don't deserialize
        using var doc = JsonDocument.Parse(_smallJson);
        return _smallJson; // Return original string
    }

    [Benchmark(Description = "Medium: Full Deserialize then Serialize")]
    public string Medium_FullDeserializeThenSerialize()
    {
        var dict = JsonSerializer.Deserialize<Dictionary<string, object>>(_mediumJson);
        return JsonSerializer.Serialize(dict);
    }

    [Benchmark(Description = "Medium: Keep Raw String (no deserialize)")]
    public string Medium_KeepRawString()
    {
        using var doc = JsonDocument.Parse(_mediumJson);
        return _mediumJson;
    }

    [Benchmark(Description = "Large: Full Deserialize then Serialize")]
    public string Large_FullDeserializeThenSerialize()
    {
        var dict = JsonSerializer.Deserialize<Dictionary<string, object>>(_largeJson);
        return JsonSerializer.Serialize(dict);
    }

    [Benchmark(Description = "Large: Keep Raw String (no deserialize)")]
    public string Large_KeepRawString()
    {
        using var doc = JsonDocument.Parse(_largeJson);
        return _largeJson;
    }

    // ==================== SCENARIO 2: Extract nested field ====================
    // Template: {{tasks.fetch.output.location.city}} - need to navigate

    [Benchmark(Description = "Weather: Full Deserialize + Navigate to city")]
    public string Weather_FullDeserialize_NavigateCity()
    {
        var dict = JsonSerializer.Deserialize<Dictionary<string, object>>(_weatherApiJson);
        // This actually returns JsonElement, not a real nested dictionary!
        var location = (JsonElement)dict!["location"];
        return location.GetProperty("city").GetString()!;
    }

    [Benchmark(Description = "Weather: JsonDocument Navigate to city")]
    public string Weather_JsonDocument_NavigateCity()
    {
        using var doc = JsonDocument.Parse(_weatherApiJson);
        return doc.RootElement
            .GetProperty("location")
            .GetProperty("city")
            .GetString()!;
    }

    [Benchmark(Description = "Weather: Full Deserialize + Navigate to temp")]
    public string Weather_FullDeserialize_NavigateTemp()
    {
        var dict = JsonSerializer.Deserialize<Dictionary<string, object>>(_weatherApiJson);
        var conditions = (JsonElement)dict!["current_condition"];
        return conditions[0].GetProperty("temp_C").GetString()!;
    }

    [Benchmark(Description = "Weather: JsonDocument Navigate to temp")]
    public string Weather_JsonDocument_NavigateTemp()
    {
        using var doc = JsonDocument.Parse(_weatherApiJson);
        return doc.RootElement
            .GetProperty("current_condition")[0]
            .GetProperty("temp_C")
            .GetString()!;
    }

    // ==================== Helper methods to generate test data ====================

    private static string GenerateMediumJson()
    {
        var items = new List<object>();
        for (int i = 0; i < 50; i++)
        {
            items.Add(new
            {
                id = i,
                name = $"Item {i}",
                description = $"This is a description for item {i} with some extra text to make it longer",
                tags = new[] { "tag1", "tag2", "tag3" },
                metadata = new { created = DateTime.UtcNow, updated = DateTime.UtcNow }
            });
        }
        return JsonSerializer.Serialize(new { items, total = 50, page = 1 });
    }

    private static string GenerateLargeJson()
    {
        var forecast = new List<object>();
        for (int day = 0; day < 14; day++)
        {
            var hourly = new List<object>();
            for (int hour = 0; hour < 24; hour++)
            {
                hourly.Add(new
                {
                    time = $"{hour:D2}:00",
                    temp_C = 15 + (hour % 10),
                    temp_F = 59 + (hour % 10) * 2,
                    humidity = 50 + (hour % 30),
                    wind_kph = 10 + (hour % 20),
                    condition = hour < 12 ? "Sunny" : "Cloudy",
                    precipitation_mm = hour > 18 ? 2.5 : 0,
                    uv_index = hour > 6 && hour < 18 ? 5 : 0
                });
            }
            forecast.Add(new
            {
                date = DateTime.UtcNow.AddDays(day).ToString("yyyy-MM-dd"),
                day = new { maxtemp_C = 22, mintemp_C = 12, avgtemp_C = 17, condition = "Partly Cloudy" },
                hourly
            });
        }
        return JsonSerializer.Serialize(new
        {
            location = new { city = "London", country = "UK", lat = 51.5, lon = -0.1 },
            current_condition = new[] { new { temp_C = "15", humidity = "80", wind_kph = "12" } },
            forecast
        });
    }

    private static string GenerateWeatherJson()
    {
        return """
        {
            "location": {
                "city": "London",
                "country": "United Kingdom",
                "lat": 51.517,
                "lon": -0.106,
                "timezone": "Europe/London"
            },
            "current_condition": [
                {
                    "temp_C": "15",
                    "temp_F": "59",
                    "humidity": "80",
                    "weatherDesc": [{"value": "Partly cloudy"}],
                    "windspeedKmph": "12",
                    "winddir16Point": "SW"
                }
            ],
            "weather": [
                {
                    "date": "2025-11-30",
                    "maxtempC": "18",
                    "mintempC": "10",
                    "hourly": [
                        {"time": "0", "tempC": "12"},
                        {"time": "300", "tempC": "11"},
                        {"time": "600", "tempC": "10"}
                    ]
                }
            ]
        }
        """;
    }
}
