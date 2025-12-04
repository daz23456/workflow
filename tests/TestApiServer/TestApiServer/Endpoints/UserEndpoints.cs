namespace TestApiServer.Endpoints;

/// <summary>
/// User & Auth endpoints - profiles, preferences, login/logout, JWT validation
/// </summary>
public static class UserEndpoints
{
    // In-memory user store (supplements ChainableEndpoints._users)
    private static readonly Dictionary<string, UserProfile> _profiles = new()
    {
        ["1"] = new UserProfile { UserId = "1", DisplayName = "Alice Smith", Avatar = "https://example.com/avatars/1.png", Bio = "Software engineer", Location = "San Francisco", Website = "https://alice.dev", JoinedAt = DateTime.UtcNow.AddYears(-2) },
        ["2"] = new UserProfile { UserId = "2", DisplayName = "Bob Jones", Avatar = "https://example.com/avatars/2.png", Bio = "Product manager", Location = "New York", Website = null, JoinedAt = DateTime.UtcNow.AddYears(-1) },
        ["3"] = new UserProfile { UserId = "3", DisplayName = "Charlie Brown", Avatar = "https://example.com/avatars/3.png", Bio = "Designer", Location = "London", Website = "https://charlie.design", JoinedAt = DateTime.UtcNow.AddMonths(-6) }
    };

    private static readonly Dictionary<string, UserPreferences> _preferences = new()
    {
        ["1"] = new UserPreferences { UserId = "1", Theme = "dark", Language = "en", Timezone = "America/Los_Angeles", EmailNotifications = true, PushNotifications = true },
        ["2"] = new UserPreferences { UserId = "2", Theme = "light", Language = "en", Timezone = "America/New_York", EmailNotifications = true, PushNotifications = false },
        ["3"] = new UserPreferences { UserId = "3", Theme = "auto", Language = "en-GB", Timezone = "Europe/London", EmailNotifications = false, PushNotifications = true }
    };

    private static readonly Dictionary<string, SessionInfo> _sessions = new();
    private static readonly Dictionary<string, string> _refreshTokens = new();

    public static void MapUserEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/users")
            .WithTags("Users");

        // GET /api/users - List all users
        group.MapGet("/", (int? limit, int? offset) =>
        {
            var profiles = _profiles.Values
                .Skip(offset ?? 0)
                .Take(limit ?? 10)
                .ToArray();

            return Results.Ok(new { users = profiles, total = _profiles.Count });
        })
            .WithName("ListUsers")
            .WithOpenApi();

        // GET /api/users/{id}/profile - Get user profile
        group.MapGet("/{id}/profile", (string id) =>
        {
            if (!_profiles.TryGetValue(id, out var profile))
                return Results.NotFound(new { error = $"User {id} not found" });

            return Results.Ok(profile);
        })
            .WithName("GetUserProfile")
            .WithOpenApi();

        // PUT /api/users/{id}/profile - Update user profile
        group.MapPut("/{id}/profile", (string id, UpdateProfileRequest request) =>
        {
            if (!_profiles.TryGetValue(id, out var profile))
                return Results.NotFound(new { error = $"User {id} not found" });

            if (request.DisplayName != null) profile.DisplayName = request.DisplayName;
            if (request.Bio != null) profile.Bio = request.Bio;
            if (request.Location != null) profile.Location = request.Location;
            if (request.Website != null) profile.Website = request.Website;
            if (request.Avatar != null) profile.Avatar = request.Avatar;

            return Results.Ok(profile);
        })
            .WithName("UpdateUserProfile")
            .WithOpenApi();

        // GET /api/users/{id}/preferences - Get user preferences
        group.MapGet("/{id}/preferences", (string id) =>
        {
            if (!_preferences.TryGetValue(id, out var prefs))
                return Results.NotFound(new { error = $"User {id} preferences not found" });

            return Results.Ok(prefs);
        })
            .WithName("GetUserPreferences")
            .WithOpenApi();

        // PUT /api/users/{id}/preferences - Update user preferences
        group.MapPut("/{id}/preferences", (string id, UpdatePreferencesRequest request) =>
        {
            if (!_preferences.TryGetValue(id, out var prefs))
                return Results.NotFound(new { error = $"User {id} preferences not found" });

            if (request.Theme != null) prefs.Theme = request.Theme;
            if (request.Language != null) prefs.Language = request.Language;
            if (request.Timezone != null) prefs.Timezone = request.Timezone;
            if (request.EmailNotifications.HasValue) prefs.EmailNotifications = request.EmailNotifications.Value;
            if (request.PushNotifications.HasValue) prefs.PushNotifications = request.PushNotifications.Value;

            return Results.Ok(prefs);
        })
            .WithName("UpdateUserPreferences")
            .WithOpenApi();

        // POST /api/users/register - Register new user
        group.MapPost("/register", (RegisterRequest request) =>
        {
            // Check if email already exists
            if (_profiles.Values.Any(p => p.DisplayName.Contains(request.Email.Split('@')[0], StringComparison.OrdinalIgnoreCase)))
                return Results.BadRequest(new { error = "Email already registered" });

            var userId = Guid.NewGuid().ToString("N")[..8];
            var profile = new UserProfile
            {
                UserId = userId,
                DisplayName = request.Name,
                Avatar = $"https://example.com/avatars/default.png",
                Bio = "",
                Location = "",
                Website = null,
                JoinedAt = DateTime.UtcNow
            };
            _profiles[userId] = profile;

            var prefs = new UserPreferences
            {
                UserId = userId,
                Theme = "auto",
                Language = "en",
                Timezone = "UTC",
                EmailNotifications = true,
                PushNotifications = true
            };
            _preferences[userId] = prefs;

            return Results.Created($"/api/users/{userId}", new
            {
                userId,
                email = request.Email,
                name = request.Name,
                createdAt = DateTime.UtcNow.ToString("O")
            });
        })
            .WithName("RegisterUser")
            .WithOpenApi();

        // POST /api/users/login - Login
        group.MapPost("/login", (LoginRequest request) =>
        {
            // Simulate login validation - accept any user
            var user = _profiles.Values.FirstOrDefault(p => p.UserId == request.UserId || p.DisplayName.Contains(request.Email?.Split('@')[0] ?? "", StringComparison.OrdinalIgnoreCase));
            if (user == null)
                return Results.Unauthorized();

            var sessionId = Guid.NewGuid().ToString("N");
            var accessToken = $"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.{Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes($"{{\"sub\":\"{user.UserId}\",\"exp\":{DateTimeOffset.UtcNow.AddHours(1).ToUnixTimeSeconds()}}}"))}.signature";
            var refreshToken = Guid.NewGuid().ToString("N");

            _sessions[sessionId] = new SessionInfo
            {
                SessionId = sessionId,
                UserId = user.UserId,
                AccessToken = accessToken,
                CreatedAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddHours(1)
            };
            _refreshTokens[refreshToken] = user.UserId;

            return Results.Ok(new
            {
                accessToken,
                refreshToken,
                tokenType = "Bearer",
                expiresIn = 3600,
                userId = user.UserId
            });
        })
            .WithName("Login")
            .WithOpenApi();

        // POST /api/users/logout - Logout
        group.MapPost("/logout", (LogoutRequest request) =>
        {
            if (request.SessionId != null)
                _sessions.Remove(request.SessionId);
            if (request.RefreshToken != null)
                _refreshTokens.Remove(request.RefreshToken);

            return Results.Ok(new { message = "Logged out successfully" });
        })
            .WithName("Logout")
            .WithOpenApi();

        // POST /api/users/refresh - Refresh access token
        group.MapPost("/refresh", (RefreshTokenRequest request) =>
        {
            if (!_refreshTokens.TryGetValue(request.RefreshToken, out var userId))
                return Results.Unauthorized();

            var newAccessToken = $"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.{Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes($"{{\"sub\":\"{userId}\",\"exp\":{DateTimeOffset.UtcNow.AddHours(1).ToUnixTimeSeconds()}}}"))}.signature";

            return Results.Ok(new
            {
                accessToken = newAccessToken,
                tokenType = "Bearer",
                expiresIn = 3600
            });
        })
            .WithName("RefreshToken")
            .WithOpenApi();

        // POST /api/users/validate-token - Validate JWT token
        group.MapPost("/validate-token", (ValidateTokenRequest request) =>
        {
            // Simple token validation (check format and expiry simulation)
            if (string.IsNullOrEmpty(request.Token) || !request.Token.StartsWith("eyJ"))
                return Results.BadRequest(new { valid = false, error = "Invalid token format" });

            try
            {
                var parts = request.Token.Split('.');
                if (parts.Length != 3)
                    return Results.BadRequest(new { valid = false, error = "Invalid token structure" });

                var payload = System.Text.Encoding.UTF8.GetString(Convert.FromBase64String(parts[1]));
                // Simplified validation - just return valid
                return Results.Ok(new { valid = true, userId = "1" });
            }
            catch
            {
                return Results.BadRequest(new { valid = false, error = "Token validation failed" });
            }
        })
            .WithName("ValidateToken")
            .WithOpenApi();

        // GET /api/users/{id}/sessions - List active sessions
        group.MapGet("/{id}/sessions", (string id) =>
        {
            var sessions = _sessions.Values.Where(s => s.UserId == id).ToArray();
            return Results.Ok(new { sessions });
        })
            .WithName("ListUserSessions")
            .WithOpenApi();

        // DELETE /api/users/{id}/sessions/{sessionId} - Revoke session
        group.MapDelete("/{id}/sessions/{sessionId}", (string id, string sessionId) =>
        {
            if (!_sessions.TryGetValue(sessionId, out var session) || session.UserId != id)
                return Results.NotFound(new { error = "Session not found" });

            _sessions.Remove(sessionId);
            return Results.Ok(new { message = "Session revoked" });
        })
            .WithName("RevokeSession")
            .WithOpenApi();

        // POST /api/users/reset-password - Request password reset
        group.MapPost("/reset-password", (ResetPasswordRequest request) =>
        {
            // Simulate password reset email
            return Results.Ok(new
            {
                message = "Password reset email sent",
                email = request.Email,
                expiresIn = 3600
            });
        })
            .WithName("ResetPassword")
            .WithOpenApi();

        // DELETE /api/users/{id} - Delete user account
        group.MapDelete("/{id}", (string id) =>
        {
            if (!_profiles.Remove(id))
                return Results.NotFound(new { error = $"User {id} not found" });

            _preferences.Remove(id);

            return Results.Ok(new { message = "User account deleted", userId = id });
        })
            .WithName("DeleteUser")
            .WithOpenApi();
    }
}

// User models
public class UserProfile
{
    public string UserId { get; set; } = "";
    public string DisplayName { get; set; } = "";
    public string Avatar { get; set; } = "";
    public string Bio { get; set; } = "";
    public string Location { get; set; } = "";
    public string? Website { get; set; }
    public DateTime JoinedAt { get; set; }
}

public class UserPreferences
{
    public string UserId { get; set; } = "";
    public string Theme { get; set; } = "";
    public string Language { get; set; } = "";
    public string Timezone { get; set; } = "";
    public bool EmailNotifications { get; set; }
    public bool PushNotifications { get; set; }
}

public class SessionInfo
{
    public string SessionId { get; set; } = "";
    public string UserId { get; set; } = "";
    public string AccessToken { get; set; } = "";
    public DateTime CreatedAt { get; set; }
    public DateTime ExpiresAt { get; set; }
}

public record UpdateProfileRequest(string? DisplayName, string? Bio, string? Location, string? Website, string? Avatar);
public record UpdatePreferencesRequest(string? Theme, string? Language, string? Timezone, bool? EmailNotifications, bool? PushNotifications);
public record RegisterRequest(string Email, string Password, string Name);
public record LoginRequest(string? Email, string? UserId, string? Password);
public record LogoutRequest(string? SessionId, string? RefreshToken);
public record RefreshTokenRequest(string RefreshToken);
public record ValidateTokenRequest(string Token);
public record ResetPasswordRequest(string Email);
