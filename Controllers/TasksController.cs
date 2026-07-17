using Microsoft.AspNetCore.Mvc;
using TaskManager.Models;
using TaskManager.Services;

namespace TaskManager.Controllers;

[Route("api/tasks")]
[ApiController]
public class TasksController : ControllerBase
{
    private readonly IStore _store;

    public TasksController(IStore store) => _store = store;

    [HttpGet("{username}")]
    public IActionResult GetAll(string username)
    {
        if (_store.GetUser(username) is null)
        {
            return NotFound(new { error = "User not found." });
        }

        return Ok(_store.GetTasks(username));
    }

    [HttpPost("{username}")]
    public IActionResult Add(string username, [FromBody] TaskItem task)
    {
        if (_store.GetUser(username) is null)
        {
            return NotFound(new { error = "User not found." });
        }

        var tasks = _store.GetTasks(username);
        var list = tasks.TryGetValue(task.Category == "week" ? "week" : "today", out var existing)
            ? existing
            : tasks.GetValueOrDefault("today")!;

        var period = DeterminePeriod(task.DueDate);
        if (!tasks.ContainsKey(period))
        {
            tasks[period] = new List<TaskItem>();
        }

        task.Id = "task_" + DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        task.Completed = false;
        tasks[period].Add(task);
        _store.SaveTasks(username, tasks);

        return Ok(tasks);
    }

    [HttpPut("{username}/{id}")]
    public IActionResult Update(string username, string id, [FromBody] TaskItem task)
    {
        if (_store.GetUser(username) is null)
        {
            return NotFound(new { error = "User not found." });
        }

        var tasks = _store.GetTasks(username);
        foreach (var kv in tasks)
        {
            var existing = kv.Value.FirstOrDefault(t => t.Id == id);
            if (existing is not null)
            {
                existing.Name = task.Name;
                existing.Category = task.Category;
                existing.DueDate = task.DueDate;
                existing.Priority = task.Priority;
                _store.SaveTasks(username, tasks);
                return Ok(tasks);
            }
        }

        return NotFound(new { error = "Task not found." });
    }

    [HttpDelete("{username}/{id}")]
    public IActionResult Remove(string username, string id)
    {
        if (_store.GetUser(username) is null)
        {
            return NotFound(new { error = "User not found." });
        }

        var tasks = _store.GetTasks(username);
        bool removed = false;
        foreach (var kv in tasks)
        {
            var count = kv.Value.RemoveAll(t => t.Id == id);
            if (count > 0) removed = true;
        }

        if (!removed)
        {
            return NotFound(new { error = "Task not found." });
        }

        _store.SaveTasks(username, tasks);
        return Ok(tasks);
    }

    [HttpPost("{username}/toggle/{id}")]
    public IActionResult Toggle(string username, string id)
    {
        if (_store.GetUser(username) is null)
        {
            return NotFound(new { error = "User not found." });
        }

        var tasks = _store.GetTasks(username);
        foreach (var kv in tasks)
        {
            var existing = kv.Value.FirstOrDefault(t => t.Id == id);
            if (existing is not null)
            {
                existing.Completed = !existing.Completed;
                _store.SaveTasks(username, tasks);
                return Ok(tasks);
            }
        }

        return NotFound(new { error = "Task not found." });
    }

    private static string DeterminePeriod(string dueDate)
    {
        if (DateTime.TryParse(dueDate, out var date))
        {
            var days = (date.Date - DateTime.Today).TotalDays;
            return days > 1 ? "week" : "today";
        }
        return "today";
    }
}
