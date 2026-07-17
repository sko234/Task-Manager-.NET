using TaskManager.Models;

namespace TaskManager.Services;

public interface IStore
{
    User? GetUser(string username);
    User? Authenticate(string username, string password);
    bool UsernameExists(string username);
    User CreateUser(string username, string email, string password);
    void SaveUser(User user);
    Dictionary<string, List<TaskItem>> GetTasks(string username);
    void SaveTasks(string username, Dictionary<string, List<TaskItem>> tasks);
}

public class InMemoryStore : IStore
{
    private readonly Dictionary<string, User> _users = new(StringComparer.OrdinalIgnoreCase);
    private readonly Dictionary<string, Dictionary<string, List<TaskItem>>> _tasks = new(StringComparer.OrdinalIgnoreCase);
    private readonly object _lock = new();

    public User? GetUser(string username)
    {
        lock (_lock)
        {
            return _users.TryGetValue(username, out var user) ? Clone(user) : null;
        }
    }

    public User? Authenticate(string username, string password)
    {
        lock (_lock)
        {
            if (_users.TryGetValue(username, out var user) && user.Password == password)
            {
                return Clone(user);
            }
            return null;
        }
    }

    public bool UsernameExists(string username)
    {
        lock (_lock)
        {
            return _users.ContainsKey(username);
        }
    }

    public User CreateUser(string username, string email, string password)
    {
        lock (_lock)
        {
            var user = new User { Username = username, Email = email, Password = password };
            _users[username] = user;
            return Clone(user);
        }
    }

    public void SaveUser(User user)
    {
        lock (_lock)
        {
            _users[user.Username] = Clone(user);
        }
    }

    public Dictionary<string, List<TaskItem>> GetTasks(string username)
    {
        lock (_lock)
        {
            if (_tasks.TryGetValue(username, out var existing))
            {
                return CloneTasks(existing);
            }

            var demo = DemoTasks.Create(username);
            _tasks[username] = CloneTasks(demo);
            return demo;
        }
    }

    public void SaveTasks(string username, Dictionary<string, List<TaskItem>> tasks)
    {
        lock (_lock)
        {
            _tasks[username] = CloneTasks(tasks);
        }
    }

    private static User Clone(User u) =>
        new() { Username = u.Username, Email = u.Email, Password = u.Password, DisplayName = u.DisplayName };

    private static Dictionary<string, List<TaskItem>> CloneTasks(Dictionary<string, List<TaskItem>> src) =>
        src.ToDictionary(
            kv => kv.Key,
            kv => kv.Value.Select(t => new TaskItem
            {
                Id = t.Id,
                Name = t.Name,
                Category = t.Category,
                DueDate = t.DueDate,
                Priority = t.Priority,
                Completed = t.Completed
            }).ToList());
}
