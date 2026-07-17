using Microsoft.AspNetCore.Mvc;
using TaskManager.Services;

namespace TaskManager.Controllers;

public class HomeController : Controller
{
    public IActionResult Index() => View();
}
