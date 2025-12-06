using System.Text.RegularExpressions;
using WorkflowCore.Models;

namespace WorkflowCore.Services;

public interface IWorkflowValidator
{
    Task<ValidationResult> ValidateAsync(
        WorkflowResource workflow,
        Dictionary<string, WorkflowTaskResource> availableTasks);
}

public class WorkflowValidator : IWorkflowValidator
{
    private readonly ITemplateParser _templateParser;
    private readonly ITypeCompatibilityChecker _typeChecker;

    // Valid identifier pattern: starts with letter or underscore, followed by alphanumeric or underscore
    private static readonly Regex IdentifierRegex = new(@"^[a-zA-Z_][a-zA-Z0-9_]*$", RegexOptions.Compiled);

    // Maximum nesting depth for forEach (default: 3)
    private const int MaxForEachNestingDepth = 3;

    public WorkflowValidator(
        ITemplateParser templateParser,
        ITypeCompatibilityChecker typeChecker)
    {
        _templateParser = templateParser ?? throw new ArgumentNullException(nameof(templateParser));
        _typeChecker = typeChecker ?? throw new ArgumentNullException(nameof(typeChecker));
    }

    public Task<ValidationResult> ValidateAsync(
        WorkflowResource workflow,
        Dictionary<string, WorkflowTaskResource> availableTasks)
    {
        var errors = new List<ValidationError>();
        var warnings = new List<string>();

        // Validate all task references exist
        foreach (var step in workflow.Spec.Tasks)
        {
            if (!availableTasks.ContainsKey(step.TaskRef))
            {
                errors.Add(ErrorMessageBuilder.MissingRequiredField(
                    step.Id,
                    "taskRef",
                    availableTasks.Keys.ToList()
                ));
                errors[^1].Message = $"Task reference '{step.TaskRef}' not found";
                continue;
            }

            var task = availableTasks[step.TaskRef];

            // Validate transform tasks have Transform property
            if (task.Spec.Type == "transform")
            {
                if (task.Spec.Transform == null || string.IsNullOrEmpty(task.Spec.Transform.Query))
                {
                    errors.Add(new ValidationError
                    {
                        TaskId = step.Id,
                        Field = "transform",
                        Message = "Transform definition is required for transform tasks",
                        SuggestedFix = "Add a 'transform' property with a 'query' field containing a valid JSONPath expression"
                    });
                    continue;
                }
            }

            // Validate control flow: Condition
            ValidateCondition(step, errors);

            // Validate control flow: Switch
            ValidateSwitch(step, availableTasks, errors, warnings);

            // Validate control flow: ForEach
            ValidateForEach(step, errors);

            // Validate templates in inputs
            foreach (var (inputKey, inputTemplate) in step.Input)
            {
                var parseResult = _templateParser.Parse(inputTemplate);
                if (!parseResult.IsValid)
                {
                    errors.AddRange(parseResult.Errors.Select(e =>
                        ErrorMessageBuilder.InvalidTemplate(step.Id, inputKey, inputTemplate, e)));
                    continue;
                }

                // Validate type compatibility
                if (task.Spec.InputSchema?.Properties?.ContainsKey(inputKey) == true)
                {
                    var targetProperty = task.Spec.InputSchema.Properties[inputKey];

                    foreach (var expr in parseResult.Expressions)
                    {
                        var sourceProperty = ResolveExpressionType(expr, workflow, availableTasks);
                        if (sourceProperty != null)
                        {
                            var compatResult = _typeChecker.CheckCompatibility(sourceProperty, targetProperty);
                            if (!compatResult.IsCompatible)
                            {
                                errors.AddRange(compatResult.Errors.Select(e =>
                                    new ValidationError
                                    {
                                        TaskId = step.Id,
                                        Field = inputKey,
                                        Message = e.Message,
                                        SuggestedFix = e.SuggestedFix
                                    }));
                            }
                        }
                    }
                }
            }
        }

        // Validate output mappings
        if (workflow.Spec.Output != null)
        {
            foreach (var (outputKey, outputTemplate) in workflow.Spec.Output)
            {
                var parseResult = _templateParser.Parse(outputTemplate);
                if (!parseResult.IsValid)
                {
                    errors.AddRange(parseResult.Errors.Select(e =>
                        ErrorMessageBuilder.InvalidTemplate("output", outputKey, outputTemplate, e)));
                    continue;
                }

                // Validate that task references in output exist
                foreach (var expr in parseResult.Expressions)
                {
                    if (expr.Type == TemplateExpressionType.TaskOutput && expr.TaskId != null)
                    {
                        var taskExists = workflow.Spec.Tasks.Any(t => t.Id == expr.TaskId);
                        if (!taskExists)
                        {
                            errors.Add(new ValidationError
                            {
                                TaskId = "output",
                                Field = outputKey,
                                Message = $"Output mapping references non-existent task '{expr.TaskId}'",
                                SuggestedFix = $"Ensure task '{expr.TaskId}' is defined in the workflow tasks"
                            });
                        }
                    }
                }
            }
        }

        // Validate forEach nesting depth
        ValidateForEachNestingDepth(workflow, errors);

        return Task.FromResult(new ValidationResult
        {
            IsValid = errors.Count == 0,
            Errors = errors,
            Warnings = warnings
        });
    }

    private void ValidateCondition(WorkflowTaskStep step, List<ValidationError> errors)
    {
        if (step.Condition == null)
        {
            return;
        }

        // Validate condition.if is not empty
        if (string.IsNullOrWhiteSpace(step.Condition.If))
        {
            errors.Add(new ValidationError
            {
                TaskId = step.Id,
                Field = "condition.if",
                Message = "Condition 'if' expression is empty",
                SuggestedFix = "Provide a valid condition expression, e.g., '{{input.approved}} == true'"
            });
            return;
        }

        // Validate templates within the condition expression
        var parseResult = _templateParser.Parse(step.Condition.If);
        if (!parseResult.IsValid)
        {
            foreach (var error in parseResult.Errors)
            {
                errors.Add(new ValidationError
                {
                    TaskId = step.Id,
                    Field = "condition.if",
                    Message = error,
                    SuggestedFix = "Fix the template syntax in the condition expression"
                });
            }
        }
    }

    private void ValidateSwitch(
        WorkflowTaskStep step,
        Dictionary<string, WorkflowTaskResource> availableTasks,
        List<ValidationError> errors,
        List<string> warnings)
    {
        if (step.Switch == null)
        {
            return;
        }

        // Validate switch.value is not empty
        if (string.IsNullOrWhiteSpace(step.Switch.Value))
        {
            errors.Add(new ValidationError
            {
                TaskId = step.Id,
                Field = "switch.value",
                Message = "Switch 'value' expression is empty",
                SuggestedFix = "Provide a valid template expression, e.g., '{{input.paymentMethod}}'"
            });
        }
        else
        {
            // Validate template syntax in value
            var valueParseResult = _templateParser.Parse(step.Switch.Value);
            if (!valueParseResult.IsValid)
            {
                foreach (var error in valueParseResult.Errors)
                {
                    errors.Add(new ValidationError
                    {
                        TaskId = step.Id,
                        Field = "switch.value",
                        Message = error,
                        SuggestedFix = "Fix the template syntax in the switch value expression"
                    });
                }
            }
        }

        // Validate at least one case
        if (step.Switch.Cases.Count == 0)
        {
            errors.Add(new ValidationError
            {
                TaskId = step.Id,
                Field = "switch.cases",
                Message = "Switch must have at least one case",
                SuggestedFix = "Add at least one case with 'match' and 'taskRef' properties"
            });
        }
        else
        {
            // Validate unique match values
            var matchValues = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            for (int i = 0; i < step.Switch.Cases.Count; i++)
            {
                var switchCase = step.Switch.Cases[i];

                if (!matchValues.Add(switchCase.Match))
                {
                    errors.Add(new ValidationError
                    {
                        TaskId = step.Id,
                        Field = "switch.cases",
                        Message = $"Duplicate switch case match value: '{switchCase.Match}'",
                        SuggestedFix = "Ensure all case match values are unique"
                    });
                }

                // Validate case taskRef exists
                if (!availableTasks.ContainsKey(switchCase.TaskRef))
                {
                    errors.Add(new ValidationError
                    {
                        TaskId = step.Id,
                        Field = $"switch.cases[{i}].taskRef",
                        Message = $"Switch case taskRef '{switchCase.TaskRef}' not found in available tasks",
                        SuggestedFix = $"Ensure task '{switchCase.TaskRef}' is registered as a WorkflowTask"
                    });
                }
            }
        }

        // Validate default taskRef if provided
        if (step.Switch.Default != null)
        {
            if (!availableTasks.ContainsKey(step.Switch.Default.TaskRef))
            {
                errors.Add(new ValidationError
                {
                    TaskId = step.Id,
                    Field = "switch.default.taskRef",
                    Message = $"Switch default taskRef '{step.Switch.Default.TaskRef}' not found in available tasks",
                    SuggestedFix = $"Ensure task '{step.Switch.Default.TaskRef}' is registered as a WorkflowTask"
                });
            }
        }
        else if (step.Switch.Cases.Count > 0)
        {
            // Warn if no default case
            warnings.Add($"Task '{step.Id}': switch has no default case. If no cases match, the switch will fail.");
        }
    }

    private void ValidateForEach(WorkflowTaskStep step, List<ValidationError> errors)
    {
        if (step.ForEach == null)
        {
            return;
        }

        // Validate forEach.items is not empty
        if (string.IsNullOrWhiteSpace(step.ForEach.Items))
        {
            errors.Add(new ValidationError
            {
                TaskId = step.Id,
                Field = "forEach.items",
                Message = "ForEach 'items' template expression is empty",
                SuggestedFix = "Provide a valid template expression that resolves to an array, e.g., '{{input.orderIds}}'"
            });
        }
        else
        {
            // Validate template syntax in items
            var itemsParseResult = _templateParser.Parse(step.ForEach.Items);
            if (!itemsParseResult.IsValid)
            {
                foreach (var error in itemsParseResult.Errors)
                {
                    errors.Add(new ValidationError
                    {
                        TaskId = step.Id,
                        Field = "forEach.items",
                        Message = error,
                        SuggestedFix = "Fix the template syntax in the forEach items expression"
                    });
                }
            }
        }

        // Validate forEach.itemVar is not empty
        if (string.IsNullOrWhiteSpace(step.ForEach.ItemVar))
        {
            errors.Add(new ValidationError
            {
                TaskId = step.Id,
                Field = "forEach.itemVar",
                Message = "ForEach 'itemVar' (variable name) is empty",
                SuggestedFix = "Provide a valid identifier for the item variable, e.g., 'order'"
            });
        }
        else if (!IdentifierRegex.IsMatch(step.ForEach.ItemVar))
        {
            // Validate itemVar is a valid identifier
            errors.Add(new ValidationError
            {
                TaskId = step.Id,
                Field = "forEach.itemVar",
                Message = $"ForEach 'itemVar' must be a valid identifier. Got: '{step.ForEach.ItemVar}'",
                SuggestedFix = "Use a valid identifier (letters, numbers, underscores; must start with letter or underscore)"
            });
        }

        // Validate maxConcurrency is non-negative
        if (step.ForEach.MaxConcurrency < 0)
        {
            errors.Add(new ValidationError
            {
                TaskId = step.Id,
                Field = "forEach.maxConcurrency",
                Message = $"ForEach 'maxConcurrency' must be a positive number or 0 (unlimited). Got: {step.ForEach.MaxConcurrency}",
                SuggestedFix = "Set maxConcurrency to 0 for unlimited parallelism, or a positive number to limit concurrent executions"
            });
        }
    }

    private PropertyDefinition? ResolveExpressionType(
        TemplateExpression expr,
        WorkflowResource workflow,
        Dictionary<string, WorkflowTaskResource> availableTasks)
    {
        if (expr.Type == TemplateExpressionType.TaskOutput && expr.TaskId != null)
        {
            var taskStep = workflow.Spec.Tasks.FirstOrDefault(t => t.Id == expr.TaskId);
            if (taskStep != null && availableTasks.ContainsKey(taskStep.TaskRef))
            {
                var task = availableTasks[taskStep.TaskRef];
                return GetPropertyAtPath(task.Spec.OutputSchema, expr.Path);
            }
        }

        return null;
    }

    private PropertyDefinition? GetPropertyAtPath(SchemaDefinition? schema, string path)
    {
        if (schema?.Properties == null || string.IsNullOrEmpty(path))
        {
            return null;
        }

        var parts = path.Split('.');
        PropertyDefinition? current = null;

        foreach (var part in parts)
        {
            if (current == null)
            {
                if (!schema.Properties.ContainsKey(part))
                {
                    return null;
                }
                current = schema.Properties[part];
            }
            else
            {
                if (current.Properties == null || !current.Properties.ContainsKey(part))
                {
                    return null;
                }
                current = current.Properties[part];
            }
        }

        return current;
    }

    /// <summary>
    /// Validates that forEach nesting depth does not exceed the maximum allowed.
    /// Nesting is determined by DependsOn relationships between forEach tasks.
    /// </summary>
    private void ValidateForEachNestingDepth(WorkflowResource workflow, List<ValidationError> errors)
    {
        // Build a map of task ID to task for quick lookup
        var taskMap = workflow.Spec.Tasks.ToDictionary(t => t.Id);

        // Find all tasks with forEach
        var forEachTasks = workflow.Spec.Tasks.Where(t => t.ForEach != null).ToList();
        if (forEachTasks.Count == 0)
        {
            return;
        }

        // Calculate nesting depth for each forEach task by following DependsOn chain
        foreach (var task in forEachTasks)
        {
            var depth = CalculateForEachNestingDepth(task, taskMap, new HashSet<string>());
            if (depth > MaxForEachNestingDepth)
            {
                errors.Add(new ValidationError
                {
                    TaskId = task.Id,
                    Field = "forEach",
                    Message = $"ForEach nesting depth of {depth} exceeds maximum allowed depth of {MaxForEachNestingDepth}",
                    SuggestedFix = $"Reduce nesting to max {MaxForEachNestingDepth} levels. Options: (1) Flatten nested arrays with a transform task before iteration, (2) Extract inner forEach into a separate sub-workflow, or (3) Process nested data in a single task with custom logic."
                });
            }
        }
    }

    /// <summary>
    /// Calculates the nesting depth for a forEach task by following DependsOn chain.
    /// </summary>
    private int CalculateForEachNestingDepth(
        WorkflowTaskStep task,
        Dictionary<string, WorkflowTaskStep> taskMap,
        HashSet<string> visited)
    {
        // Prevent infinite recursion from circular dependencies
        if (!visited.Add(task.Id))
        {
            return 0;
        }

        // If no forEach, this task doesn't contribute to nesting
        if (task.ForEach == null)
        {
            return 0;
        }

        // If no dependencies, this is the root level
        if (task.DependsOn == null || task.DependsOn.Count == 0)
        {
            return 1;
        }

        // Find the maximum depth of parent forEach tasks
        int maxParentDepth = 0;
        foreach (var depId in task.DependsOn)
        {
            if (taskMap.TryGetValue(depId, out var parentTask))
            {
                // Only count if parent has forEach (we're counting forEach nesting, not all dependencies)
                if (parentTask.ForEach != null)
                {
                    var parentDepth = CalculateForEachNestingDepth(parentTask, taskMap, visited);
                    maxParentDepth = Math.Max(maxParentDepth, parentDepth);
                }
            }
        }

        return maxParentDepth + 1;
    }
}
