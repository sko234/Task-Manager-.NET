using TaskManager.Models;

namespace TaskManager.Services;

public static class DemoTasks
{
    public static Dictionary<string, List<TaskItem>> Create(string username)
    {
        var today = DateTime.Today;
        var offset = (int days) => today.AddDays(days).ToString("yyyy-MM-dd");

        return new Dictionary<string, List<TaskItem>>
        {
            ["today"] = new List<TaskItem>
            {
                new() { Id = "demo1", Name = "Complete project proposal", Category = "Work", DueDate = offset(0), Priority = "High", Completed = false },
                new() { Id = "demo2", Name = "Gym workout", Category = "Health", DueDate = offset(0), Priority = "Medium", Completed = false },
                new() { Id = "demo3", Name = "Read documentation", Category = "Learning", DueDate = offset(0), Priority = "Low", Completed = true }
            },
            ["week"] = new List<TaskItem>
            {
                new() { Id = "demo4", Name = "Team meeting", Category = "Work", DueDate = offset(2), Priority = "High", Completed = false },
                new() { Id = "demo5", Name = "Grocery shopping", Category = "Personal", DueDate = offset(3), Priority = "Medium", Completed = false },
                new() { Id = "demo6", Name = "Code review", Category = "Work", DueDate = offset(5), Priority = "High", Completed = false }
            }
        };
    }
}
