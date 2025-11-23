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
                var task = availableTasks[step.TaskRef];
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

        return Task.FromResult(new ValidationResult
        {
            IsValid = errors.Count == 0,
            Errors = errors
        });
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
}
