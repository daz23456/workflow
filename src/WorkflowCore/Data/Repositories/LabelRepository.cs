using Microsoft.EntityFrameworkCore;
using WorkflowCore.Models;

namespace WorkflowCore.Data.Repositories;

/// <summary>
/// Repository implementation for label data operations.
/// Optimized for PostgreSQL GIN index queries on array columns.
/// </summary>
public class LabelRepository : ILabelRepository
{
    private readonly WorkflowDbContext _context;

    public LabelRepository(WorkflowDbContext context)
    {
        _context = context;
    }

    /// <inheritdoc />
    public async Task<List<WorkflowLabelEntity>> GetWorkflowsByTagsAsync(
        IEnumerable<string> tags,
        bool matchAll = false,
        string? @namespace = null)
    {
        var tagList = tags.Select(t => t.ToLowerInvariant()).ToList();

        // If no tags specified, return all workflows
        if (tagList.Count == 0)
        {
            var query = _context.WorkflowLabels.AsQueryable();
            if (!string.IsNullOrEmpty(@namespace))
            {
                query = query.Where(w => w.Namespace == @namespace);
            }
            return await query.ToListAsync();
        }

        // Query with tag filtering
        var workflowQuery = _context.WorkflowLabels.AsQueryable();

        if (!string.IsNullOrEmpty(@namespace))
        {
            workflowQuery = workflowQuery.Where(w => w.Namespace == @namespace);
        }

        // Load data and filter in memory for case-insensitive matching
        // Note: In PostgreSQL with GIN indexes, this would use array operators
        var workflows = await workflowQuery.ToListAsync();

        if (matchAll)
        {
            // All tags must be present (case-insensitive)
            return workflows
                .Where(w => tagList.All(tag =>
                    w.Tags.Any(t => t.ToLowerInvariant() == tag)))
                .ToList();
        }
        else
        {
            // Any tag matches (case-insensitive)
            return workflows
                .Where(w => w.Tags.Any(t =>
                    tagList.Contains(t.ToLowerInvariant())))
                .ToList();
        }
    }

    /// <inheritdoc />
    public async Task<List<WorkflowLabelEntity>> GetWorkflowsByCategoriesAsync(
        IEnumerable<string> categories,
        string? @namespace = null)
    {
        var categoryList = categories.Select(c => c.ToLowerInvariant()).ToList();

        var query = _context.WorkflowLabels.AsQueryable();

        if (!string.IsNullOrEmpty(@namespace))
        {
            query = query.Where(w => w.Namespace == @namespace);
        }

        // If no categories specified, return all workflows
        if (categoryList.Count == 0)
        {
            return await query.ToListAsync();
        }

        // Load and filter in memory for case-insensitive matching
        var workflows = await query.ToListAsync();

        return workflows
            .Where(w => w.Categories.Any(c =>
                categoryList.Contains(c.ToLowerInvariant())))
            .ToList();
    }

    /// <inheritdoc />
    public async Task<List<TaskLabelEntity>> GetTasksByTagsAsync(
        IEnumerable<string> tags,
        bool matchAll = false,
        string? @namespace = null)
    {
        var tagList = tags.Select(t => t.ToLowerInvariant()).ToList();

        var query = _context.TaskLabels.AsQueryable();

        if (!string.IsNullOrEmpty(@namespace))
        {
            query = query.Where(t => t.Namespace == @namespace);
        }

        // If no tags specified, return all tasks
        if (tagList.Count == 0)
        {
            return await query.ToListAsync();
        }

        // Load and filter in memory for case-insensitive matching
        var tasks = await query.ToListAsync();

        if (matchAll)
        {
            return tasks
                .Where(t => tagList.All(tag =>
                    t.Tags.Any(tt => tt.ToLowerInvariant() == tag)))
                .ToList();
        }
        else
        {
            return tasks
                .Where(t => t.Tags.Any(tt =>
                    tagList.Contains(tt.ToLowerInvariant())))
                .ToList();
        }
    }

    /// <inheritdoc />
    public async Task<List<TaskLabelEntity>> GetTasksByCategoryAsync(
        string category,
        string? @namespace = null)
    {
        var lowerCategory = category.ToLowerInvariant();

        var query = _context.TaskLabels.AsQueryable();

        if (!string.IsNullOrEmpty(@namespace))
        {
            query = query.Where(t => t.Namespace == @namespace);
        }

        // Load and filter in memory for case-insensitive matching
        var tasks = await query.ToListAsync();

        return tasks
            .Where(t => t.Category?.ToLowerInvariant() == lowerCategory)
            .ToList();
    }

    /// <inheritdoc />
    public async Task<LabelStatistics> GetAllLabelsAsync()
    {
        var result = new LabelStatistics();

        // Get all workflow labels
        var workflowLabels = await _context.WorkflowLabels.ToListAsync();

        // Get all task labels
        var taskLabels = await _context.TaskLabels.ToListAsync();

        // Aggregate tag statistics
        var tagStats = new Dictionary<string, TagStatistic>(StringComparer.OrdinalIgnoreCase);

        foreach (var wl in workflowLabels)
        {
            foreach (var tag in wl.Tags)
            {
                var lowerTag = tag.ToLowerInvariant();
                if (!tagStats.TryGetValue(lowerTag, out var stat))
                {
                    stat = new TagStatistic { Value = tag };
                    tagStats[lowerTag] = stat;
                }
                stat.WorkflowCount++;
            }
        }

        foreach (var tl in taskLabels)
        {
            foreach (var tag in tl.Tags)
            {
                var lowerTag = tag.ToLowerInvariant();
                if (!tagStats.TryGetValue(lowerTag, out var stat))
                {
                    stat = new TagStatistic { Value = tag };
                    tagStats[lowerTag] = stat;
                }
                stat.TaskCount++;
            }
        }

        result.Tags = tagStats.Values.OrderByDescending(t => t.WorkflowCount + t.TaskCount).ToList();

        // Aggregate category statistics
        var categoryStats = new Dictionary<string, CategoryStatistic>(StringComparer.OrdinalIgnoreCase);

        foreach (var wl in workflowLabels)
        {
            foreach (var category in wl.Categories)
            {
                var lowerCategory = category.ToLowerInvariant();
                if (!categoryStats.TryGetValue(lowerCategory, out var stat))
                {
                    stat = new CategoryStatistic { Value = category };
                    categoryStats[lowerCategory] = stat;
                }
                stat.WorkflowCount++;
            }
        }

        result.Categories = categoryStats.Values.OrderByDescending(c => c.WorkflowCount).ToList();

        return result;
    }

    /// <inheritdoc />
    public async Task<WorkflowLabelEntity> SaveWorkflowLabelsAsync(WorkflowLabelEntity labels)
    {
        var existing = await _context.WorkflowLabels
            .FirstOrDefaultAsync(w =>
                w.WorkflowName == labels.WorkflowName &&
                w.Namespace == labels.Namespace);

        if (existing != null)
        {
            // Update existing record
            existing.Tags = labels.Tags;
            existing.Categories = labels.Categories;
            existing.SyncedAt = labels.SyncedAt;
            existing.VersionHash = labels.VersionHash;
            _context.WorkflowLabels.Update(existing);
        }
        else
        {
            // Add new record
            _context.WorkflowLabels.Add(labels);
        }

        await _context.SaveChangesAsync();
        return existing ?? labels;
    }

    /// <inheritdoc />
    public async Task<TaskLabelEntity> SaveTaskLabelsAsync(TaskLabelEntity labels)
    {
        var existing = await _context.TaskLabels
            .FirstOrDefaultAsync(t =>
                t.TaskName == labels.TaskName &&
                t.Namespace == labels.Namespace);

        if (existing != null)
        {
            // Update existing record
            existing.Tags = labels.Tags;
            existing.Category = labels.Category;
            existing.SyncedAt = labels.SyncedAt;
            existing.VersionHash = labels.VersionHash;
            _context.TaskLabels.Update(existing);
        }
        else
        {
            // Add new record
            _context.TaskLabels.Add(labels);
        }

        await _context.SaveChangesAsync();
        return existing ?? labels;
    }

    /// <inheritdoc />
    public async Task DeleteWorkflowLabelsAsync(string workflowName, string @namespace)
    {
        var existing = await _context.WorkflowLabels
            .FirstOrDefaultAsync(w =>
                w.WorkflowName == workflowName &&
                w.Namespace == @namespace);

        if (existing != null)
        {
            _context.WorkflowLabels.Remove(existing);
            await _context.SaveChangesAsync();
        }
    }

    /// <inheritdoc />
    public async Task DeleteTaskLabelsAsync(string taskName, string @namespace)
    {
        var existing = await _context.TaskLabels
            .FirstOrDefaultAsync(t =>
                t.TaskName == taskName &&
                t.Namespace == @namespace);

        if (existing != null)
        {
            _context.TaskLabels.Remove(existing);
            await _context.SaveChangesAsync();
        }
    }

    /// <inheritdoc />
    public async Task UpdateLabelUsageStatsAsync()
    {
        // Clear existing stats
        _context.LabelUsageStats.RemoveRange(_context.LabelUsageStats);

        var now = DateTime.UtcNow;
        var stats = new List<LabelUsageStatEntity>();

        // Get all workflow labels
        var workflowLabels = await _context.WorkflowLabels.ToListAsync();

        // Get all task labels
        var taskLabels = await _context.TaskLabels.ToListAsync();

        // Aggregate workflow tag stats
        var workflowTagCounts = workflowLabels
            .SelectMany(w => w.Tags)
            .GroupBy(t => t.ToLowerInvariant())
            .ToDictionary(g => g.Key, g => g.Count());

        foreach (var kvp in workflowTagCounts)
        {
            stats.Add(new LabelUsageStatEntity
            {
                LabelType = "Tag",
                LabelValue = kvp.Key,
                EntityType = "Workflow",
                UsageCount = kvp.Value,
                LastUsedAt = now,
                UpdatedAt = now
            });
        }

        // Aggregate task tag stats
        var taskTagCounts = taskLabels
            .SelectMany(t => t.Tags)
            .GroupBy(t => t.ToLowerInvariant())
            .ToDictionary(g => g.Key, g => g.Count());

        foreach (var kvp in taskTagCounts)
        {
            stats.Add(new LabelUsageStatEntity
            {
                LabelType = "Tag",
                LabelValue = kvp.Key,
                EntityType = "Task",
                UsageCount = kvp.Value,
                LastUsedAt = now,
                UpdatedAt = now
            });
        }

        // Aggregate workflow category stats
        var workflowCategoryCounts = workflowLabels
            .SelectMany(w => w.Categories)
            .GroupBy(c => c.ToLowerInvariant())
            .ToDictionary(g => g.Key, g => g.Count());

        foreach (var kvp in workflowCategoryCounts)
        {
            stats.Add(new LabelUsageStatEntity
            {
                LabelType = "Category",
                LabelValue = kvp.Key,
                EntityType = "Workflow",
                UsageCount = kvp.Value,
                LastUsedAt = now,
                UpdatedAt = now
            });
        }

        // Add all stats
        _context.LabelUsageStats.AddRange(stats);
        await _context.SaveChangesAsync();
    }
}
