namespace TaskManager.Models;

public class TaskItem
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string DueDate { get; set; } = string.Empty;
    public string Priority { get; set; } = string.Empty;
    public bool Completed { get; set; }
}
