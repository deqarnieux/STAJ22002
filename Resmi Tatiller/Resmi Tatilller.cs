using System;
using System.Net.Http;
using System.Threading.Tasks;
using HtmlAgilityPack;
using System.Xml.Linq;
using System.Globalization;
using System.Text.RegularExpressions;

class Program
{
    static async Task Main(string[] args)
    {
        string url = "https://www.takvim.com/2026_takvimi.html"; // Hedef URL
        string xmlFilePath = "turkish_holidays.xml"; // XML dosyasının kaydedileceği yol

        using (HttpClient client = new HttpClient())
        {
            // Web isteği yap
            HttpResponseMessage response = await client.GetAsync(url);
            response.EnsureSuccessStatusCode();
            string htmlContent = await response.Content.ReadAsStringAsync();

            // HTML'i parse et
            HtmlDocument htmlDocument = new HtmlDocument();
            htmlDocument.LoadHtml(htmlContent);

            // <h1> etiketinden yılı al
            var yearNode = htmlDocument.DocumentNode.SelectSingleNode("//h1");
            int year = 0;
            if (yearNode != null)
            {
                var yearMatch = Regex.Match(yearNode.InnerText, @"\d{4}");
                if (yearMatch.Success)
                {
                    year = int.Parse(yearMatch.Value);
                }
            }

            if (year == 0)
            {
                Console.WriteLine("Yıl bilgisi bulunamadı.");
                return;
            }

            // İkinci <p> etiketini seç
            var paragraphNode = htmlDocument.DocumentNode.SelectSingleNode("//p[2]");

            if (paragraphNode != null)
            {
                // İçeriği <br> etiketlerine göre böler (varsa)
                var holidayParts = Regex.Split(paragraphNode.InnerHtml, "<br\\s*/?>");

                XElement rootElement = new XElement("ResmiTatil");

                foreach (var part in holidayParts)
                {
                    string content = HtmlEntity.DeEntitize(part).Trim(); // HTML özel karakterlerini decode et ve boşlukları temizle

                    // Tarih ve tatil ismini ayır
                    var match = Regex.Match(content, @"(\d{1,2} \w+)\s+(.+)"); // "1 Ocak Yılbaşı" formatı için

                    if (match.Success)
                    {
                        string holidayDate = match.Groups[1].Value.Trim();
                        string holidayName = match.Groups[2].Value.Trim();

                        // Tarihi DateTime olarak parse et, yılı ekle
                        string dateString = $"{holidayDate} {year}"; // Yılı ekle
                        if (DateTime.TryParseExact(dateString, "d MMMM yyyy", new CultureInfo("tr-TR"), DateTimeStyles.None, out DateTime parsedDate))
                        {
                            // Tarihi "yyyy-MM-dd" formatında yaz
                            string formattedDate = parsedDate.ToString("yyyy-MM-dd");

                            // İçeriği uygun bir XML yapısına dönüştür
                            XElement holidayElement = new XElement("Tatil",
                                new XElement("Isim", holidayName),
                                new XElement("Tarih", formattedDate)
                            );

                            rootElement.Add(holidayElement);
                        }
                    }
                }

                // XML belgesi oluştur
                XDocument xmlDocument = new XDocument(new XDeclaration("1.0", "utf-8", "yes"), rootElement);

                // XML belgesini düzenli (indented) olarak kaydet
                xmlDocument.Save(xmlFilePath, SaveOptions.None);
                Console.WriteLine($"Resmi tatiller XML dosyası başarıyla kaydedildi: {xmlFilePath}");
            }
            else
            {
                Console.WriteLine("Belirtilen <p> etiketi bulunamadı.");
            }
        }
    }
}
