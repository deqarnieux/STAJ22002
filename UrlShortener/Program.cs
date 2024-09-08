using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.OpenApi.Models;
using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;



public class UrlShortenerContext : DbContext
{
    public UrlShortenerContext(DbContextOptions<UrlShortenerContext> options) : base(options) { }

    public DbSet<UrlMapping> UrlMappings { get; set; }
}

public class UrlMapping
{
    public int Id { get; set; }
    public string ShortUrl { get; set; }
    public string LongUrl { get; set; }
}


namespace UrlShortener
{
  public class Program
    {
        public static void Main(string[] args)
        {
          CreateHostBuilder(args).Build().Run();
        }

        public static IHostBuilder CreateHostBuilder(string[] args) =>
            Host.CreateDefaultBuilder(args)
                .ConfigureWebHostDefaults(webBuilder =>
                {
                    webBuilder.UseStartup<Startup>();
                });
    }



public class Startup
{
    public Startup(IConfiguration configuration)
    {
        Configuration = configuration;
    }

    public IConfiguration Configuration { get; }

    public void ConfigureServices(IServiceCollection services)
    {
        services.AddControllers();
        services.AddDbContext<UrlShortenerContext>(options =>
            options.UseSqlServer(Configuration.GetConnectionString("DefaultConnection")));
        services.AddScoped<IUrlRepository, UrlRepository>();
        services.AddSwaggerGen(c =>
        {
            c.SwaggerDoc("v1", new OpenApiInfo { Title = "URL Shortener API", Version = "v1" });
        });
    }

    public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
    {
        

        if (env.IsDevelopment())
        {
            app.UseDeveloperExceptionPage();
        }

        app.UseSwagger();
        app.UseSwaggerUI(c =>
        {
            c.SwaggerEndpoint("/swagger/v1/swagger.json", "URL Shortener API V1");
            c.RoutePrefix = string.Empty; // Swagger UI'yi kök URL'de çalıştırmak için
        });

        app.UseRouting();
        app.UseEndpoints(endpoints =>
        {
            endpoints.MapControllers();
        });
    }
}



    public interface IUrlRepository
    {
        string ShortenUrl(string longUrl);
        string GetLongUrl(string shortUrl);
    }

    public class UrlRepository : IUrlRepository
{
    private readonly UrlShortenerContext _context;
    private readonly Random _random = new();

    public UrlRepository(UrlShortenerContext context)
    {
        _context = context;
    }

    public string ShortenUrl(string longUrl)
    {
        var shortUrl = GenerateShortUrl();
        var urlMapping = new UrlMapping { ShortUrl = shortUrl, LongUrl = longUrl };
        _context.UrlMappings.Add(urlMapping);
        _context.SaveChanges();
        return shortUrl;
    }

    public string GetLongUrl(string shortUrl)
    {
        var urlMapping = _context.UrlMappings.SingleOrDefault(u => u.ShortUrl == shortUrl);
        return urlMapping?.LongUrl;
    }

    private string GenerateShortUrl()
    {
        const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        var shortUrl = new char[6];
        for (int i = 0; i < shortUrl.Length; i++)
        {
            shortUrl[i] = chars[_random.Next(chars.Length)];
        }
        return new string(shortUrl);
    }
}



    [ApiController]
    [Route("[controller]")]
    public class UrlsController : ControllerBase
    {
        private readonly IUrlRepository _urlRepository;

        public UrlsController(IUrlRepository urlRepository)
        {
            _urlRepository = urlRepository;
        }

        [HttpPost("shorten")]
        public IActionResult ShortenUrl([FromBody] UrlDto urlDto)
        {
            var shortUrl = _urlRepository.ShortenUrl(urlDto.LongUrl);
            return Ok(new { ShortUrl = shortUrl });
        }

        [HttpGet("{shortUrl}")]
        public IActionResult GetLongUrl(string shortUrl)
        {
            var longUrl = _urlRepository.GetLongUrl(shortUrl);
            if (longUrl == null)
            {
                return NotFound();
            }
            return Redirect(longUrl);
        }
    }

    public class UrlDto
    {
        public string LongUrl { get; set; }
    }
}