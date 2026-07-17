using Microsoft.AspNetCore.Mvc;
using TaskManager.Models;
using TaskManager.Services;

namespace TaskManager.Controllers;

[Route("api/auth")]
[ApiController]
public class AuthController : ControllerBase
{
    private readonly IStore _store;

    public AuthController(IStore store) => _store = store;

    [HttpPost("signup")]
    public IActionResult Signup([FromBody] SignupRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Username) ||
            string.IsNullOrWhiteSpace(req.Email) ||
            string.IsNullOrWhiteSpace(req.Password))
        {
            return BadRequest(new { error = "All fields are required." });
        }

        if (_store.UsernameExists(req.Username))
        {
            return Conflict(new { error = "Username already exists." });
        }

        _store.CreateUser(req.Username, req.Email, req.Password);
        return Ok(new { username = req.Username });
    }

    [HttpPost("login")]
    public IActionResult Login([FromBody] LoginRequest req)
    {
        var user = _store.Authenticate(req.Username, req.Password);
        if (user is null)
        {
            return Unauthorized(new { error = "Invalid username or password." });
        }

        return Ok(new { username = user.Username, displayName = user.DisplayName });
    }

    [HttpPost("name")]
    public IActionResult SetName([FromBody] NameRequest req)
    {
        var user = _store.GetUser(req.Username);
        if (user is null)
        {
            return NotFound(new { error = "User not found." });
        }

        user.DisplayName = req.DisplayName;
        _store.SaveUser(user);
        return Ok(new { displayName = user.DisplayName });
    }

    public class SignupRequest
    {
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    public class LoginRequest
    {
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    public class NameRequest
    {
        public string Username { get; set; } = string.Empty;
        public string DisplayName { get; set; } = string.Empty;
    }
}
