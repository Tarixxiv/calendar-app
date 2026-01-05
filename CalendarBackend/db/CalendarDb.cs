using CalendarBackend.model;
using Microsoft.EntityFrameworkCore;

namespace CalendarBackend.db;

public class CalendarDb(DbContextOptions<CalendarDb> options) : DbContext(options)
{
    public DbSet<CalendarEvent> Events => Set<CalendarEvent>();
    public DbSet<LocationEntity> Locations => Set<LocationEntity>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var utcConverter = new Microsoft.EntityFrameworkCore.Storage.ValueConversion.ValueConverter<DateTime, DateTime>(
            v => v.ToUniversalTime(),
            v => DateTime.SpecifyKind(v, DateTimeKind.Utc));

        modelBuilder.Entity<CalendarEvent>()
            .Property(e => e.Start)
            .HasConversion(utcConverter);

        modelBuilder.Entity<CalendarEvent>()
            .Property(e => e.End)
            .HasConversion(utcConverter);
    }
}