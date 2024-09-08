using HtmlAgilityPack;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Xml.Linq;

class Program
{
    static void Main()
    {
        // Kullanıcıdan yıl ve ay bilgilerini alıyoruz
        Console.Write("Yıl girin (YYYY): ");
        string yearInput = Console.ReadLine();
        Console.Write("Ay girin (MM): ");
        string monthInput = Console.ReadLine();

        // Yıl ve ay bilgilerinin geçerli olup olmadığını kontrol ediyoruz
        if (!int.TryParse(yearInput, out int year) || !int.TryParse(monthInput, out int month) ||
            month < 1 || month > 12 || year < 1000 || year > 9999)
        {
            Console.WriteLine("Geçersiz yıl veya ay formatı.");
            return;
        }

        // URL şablonunu oluşturuyoruz
        var urlTemplate = "https://teknoloji.gib.gov.tr/yardim-ve-kaynaklar/vergi-takvimi?date_filter%5Bvalue%5D%5Bmonth%5D={0}&date_filter%5Bvalue%5D%5Byear%5D={1}";
        var url = string.Format(urlTemplate, month, year);

        // HTML içeriğini çekmek için HtmlAgilityPack kullanıyoruz
        var web = new HtmlWeb();
        var doc = web.Load(url);

        // Tabloyu içeren div'in XPath'ini kullanarak tabloyu seçiyoruz
        var tableDiv = doc.DocumentNode.SelectSingleNode("//div[@class='view-content']//table"); // Tabloyu içeren div'i seçiyoruz

        if (tableDiv != null)
        {
            // Tablodaki satırları seçiyoruz
            var rows = tableDiv.SelectNodes(".//tr");

            // XML dosya adını oluşturuyoruz
            string fileName = $"{year}-{month:D2}-data.xml"; // Ay'ı iki haneli yapmak için :D2 formatını kullanıyoruz

            // XML belgesini oluşturuyoruz
            var xdoc = new XDocument(
                new XElement("Root", // Kök elemanı
                    from row in rows.Skip(1) // İlk satırı atlıyoruz (başlık satırı olabilir)
                    let cells = row.SelectNodes(".//td")
                    select new XElement("Row", // Her satır için bir Row elemanı oluşturuyoruz
                        from cell in cells.Select((cell, index) => new { cell, index })
                        select new XElement($"Cell{cell.index + 1}", cell.cell.InnerText.Trim())
                    )
                )
            );

            // XML belgesini dosyaya kaydediyoruz
            xdoc.Save(fileName);

            Console.WriteLine($"Tablo verileri XML formatına dönüştürüldü ve '{fileName}' olarak kaydedildi.");
        }
        else
        {
            Console.WriteLine("Tablo bulunamadı.");
        }
    }
}
