using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using CalendarBackend.db;
using CalendarBackend.model;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// --- CONFIGURATION ---
var jwtKey = "ThisIsASecretKeyForMyCalendarApp12345!";
var jwtIssuer = "CalendarApp";

builder.Services.AddDbContext<CalendarDb>(options =>
    options.UseSqlite("Data Source=calendar.db"));

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll",
        b => b.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());
});

// --- AUTHENTICATION SETUP ---
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            
            ValidateIssuer = false,
            ValidateAudience = false,
            
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(5)
        };
    });

builder.Services.AddAuthorization();

var app = builder.Build();

var colorPool = new[]
{
    "#D32F2F", "#7B1FA2", "#303F9F", "#0288D1",
    "#00796B", "#388E3C", "#F57C00", "#E64A19",
    "#5D4037", "#455A64", "#C2185B", "#1976D2"
};

// --- DB SEEDING ---
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<CalendarDb>();
    db.Database.EnsureCreated();

    if (!db.Locations.Any())
    {
        db.Locations.AddRange(
            new LocationEntity { Name = "Lipinki Łużyckie Łączna 43", Color = "#D32F2F" },
            new LocationEntity { Name = "London Downing Street 10", Color = "#1976D2" },
            new LocationEntity { Name = "London Diagon Alley 20", Color = "#388E3C" }
        );
        db.SaveChanges();
    }
}

app.UseCors("AllowAll");
app.UseAuthentication();
app.UseAuthorization();

// --- ENDPOINTS ---

app.MapPost("/api/login", (LoginRequest req) =>
{
    if (req.Username != "admin" || req.Password != "123") return Results.Unauthorized();
    var claims = new[] { new Claim(ClaimTypes.Name, req.Username) };
    var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
    var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

    // FIXED: Use UtcNow and set NotBefore to the past to ensure immediate validity
    var token = new JwtSecurityToken(
        claims: claims,
        notBefore: DateTime.UtcNow.AddMinutes(-1),
        expires: DateTime.UtcNow.AddHours(2),
        signingCredentials: creds
    );

    return Results.Ok(new { token = new JwtSecurityTokenHandler().WriteToken(token) });
});

app.MapGet("/api/events", async (CalendarDb db) => await db.Events.ToListAsync());
app.MapGet("/api/locations", async (CalendarDb db) => await db.Locations.ToListAsync());

// POST EVENT (Public, but checks for Admin token to auto-approve)
app.MapPost("/api/events", async (CalendarDb db, CalendarEvent newEvent, ClaimsPrincipal user) =>
{
    bool isAdmin = user.Identity?.IsAuthenticated ?? false;

    // Admin = Approved, Guest = Pending
    newEvent.Status = isAdmin ? "approved" : "pending";

    newEvent.Title = $"{newEvent.FirstName} {newEvent.LastName} {newEvent.PhoneNumber}";

    db.Events.Add(newEvent);
    await db.SaveChangesAsync();
    return Results.Created($"/api/events/{newEvent.Id}", newEvent);
});

// PROTECTED ENDPOINTS (Require Authorization)

app.MapPut("/api/events/{id}", async (CalendarDb db, int id, CalendarEvent input) =>
{
    var ev = await db.Events.FindAsync(id);
    if (ev is null) return Results.NotFound();

    ev.FirstName = input.FirstName;
    ev.LastName = input.LastName;
    ev.PhoneNumber = input.PhoneNumber;
    ev.Title = $"{input.FirstName} {input.LastName} {input.PhoneNumber}";

    ev.Start = input.Start;
    ev.End = input.End;
    ev.Email = input.Email;
    ev.Location = input.Location;
    ev.Notes = input.Notes;
    ev.Status = input.Status;

    await db.SaveChangesAsync();
    return Results.NoContent();
}).RequireAuthorization();

app.MapDelete("/api/events/{id}", async (CalendarDb db, int id) =>
{
    if (await db.Events.FindAsync(id) is not CalendarEvent ev) return Results.NotFound();
    db.Events.Remove(ev);
    await db.SaveChangesAsync();
    return Results.Ok(ev);
}).RequireAuthorization();

app.MapPost("/api/locations", async (CalendarDb db, LocationEntity loc) =>
{
    var random = new Random();
    loc.Color = colorPool[random.Next(colorPool.Length)];
    db.Locations.Add(loc);
    await db.SaveChangesAsync();
    return Results.Created($"/api/locations/{loc.Id}", loc);
}).RequireAuthorization();

app.MapDelete("/api/locations/{name}", async (CalendarDb db, string name) =>
{
    var loc = await db.Locations.FirstOrDefaultAsync(x => x.Name == name);
    if (loc == null) return Results.NotFound();
    db.Locations.Remove(loc);
    db.Events.RemoveRange(db.Events.Where(e => e.Location == name));
    await db.SaveChangesAsync();
    return Results.Ok();
}).RequireAuthorization();

app.Run("http://localhost:5000");