import express from "express";

import axios from "axios";

import nodemailer from "nodemailer";

import fs from 'fs';

import path from 'path';

 

 

const __dirname = path.resolve(); // ES modüllerinde __dirname çözümü

 

const app = express();

app.use(express.json());

const {WEBHOOK_VERIFY_TOKEN, GRAPH_API_TOKEN, PORT, EMAIL_USER, EMAIL_PASS,ACCUWEATHER_API_KEY,WHATSAPP_API_URL,WHATSAPP_TOKEN} = process.env;

 

var userState = {};

var userName = {};

var userEmail = {};

var userSecim = {};

var userMessages = {};

var userPhone = {};

var userSurName = {};

var userFirma = {};

var filepath = {};

var accessToken = null;

var instanceUniqueId = null;

 

app.post("/webhook", (req, res) =>

{

  console.log("Incoming webhook message:", JSON.stringify(req.body, null, 2));

 

  const message = req.body.entry?.[0]?.changes[0]?.value?.messages?.[0];

  if (message?.type != null)

  {

    const business_phone_number_id = req.body.entry?.[0].changes?.[0].value?.metadata?.phone_number_id;

    const userId = message.from;

 

    if (!userState[userId])

    {

      userPhone[userId] = formatPhoneNumber(message.from)

      userState[userId] = "main_menu";

      sendMessage(business_phone_number_id, userId, message.id, "Merhaba, Chip Computer'a hoşgeldiniz. İsminizi öğrenebilir miyim?")

        .then(() => markMessageAsRead(business_phone_number_id, message.id));

    }

    else if (userState[userId] === "main_menu")

    {

      userState[userId] = "demo_menu";

      userName[userId] = message.text.body;

      sendMessage(business_phone_number_id, userId, message.id, `Merhaba ${userName[userId]}! Lütfen aşağıdaki menüden istediğiniz işlemi seçin:\n1. Demo ve Satış Talebi Oluşturma\n2. Json Deneme\n3. Logo Flow Swagger\n4. Finans Departmanına Ulaşman\n5. Hava Durumu(Rest Deneme)\n6. Fotoğraf gönderimi(Deneme)`)

        .then(() => markMessageAsRead(business_phone_number_id, message.id));

    }

    else if (userState[userId] === "demo_menu")

    {

      switch (message.text.body)

      {

        case "1":

          userState[userId] = "demo_sales";

          sendMessage(business_phone_number_id, userId, message.id, "Demo ve Satış Talebi için seçenekler:\n1. Demo Talebi Oluştur\n2. Satış Departmanına Ulaş\n #. Önceki Menüye Dön")

            .then(() => markMessageAsRead(business_phone_number_id, message.id));

          break;

        case "2":

          userState[userId] = "json";

          sendMessage(business_phone_number_id, userId, message.id, "Demo Talep Formu için Ad SoyAd bilgilerinizi giriniz.")

            .then(() => markMessageAsRead(business_phone_number_id, message.id));

          break;

        case "3":

          userState[userId] = "Token";

           // Kullanım örneği

          getToken().then(function(accessToken) {

          if (accessToken) {

              console.log('Access Token:', accessToken);

            //Token bekleniyor

              sendMessage(business_phone_number_id, userId, message.id, "Tokenınız:"+ accessToken)

              .then(() => markMessageAsRead(business_phone_number_id, message.id));

              console.log(`TOKEN ALINDI > `+ accessToken);

          } else {

            sendMessage(business_phone_number_id, userId, message.id, "Token alınamadı!")

              .then(() => markMessageAsRead(business_phone_number_id, message.id));

              console.log('Access Token alınamadı.');

          }

          });

 

         

          break;

        case "4":

          userState[userId] = null;

          sendMessage(business_phone_number_id, userId, message.id, "Finans departmanına ulaşmak için lütfen finans formunu doldurun.")

            .then(() => markMessageAsRead(business_phone_number_id, message.id));

          break;

        case "5":

          userState[userId] = "city_menu";

          sendMessage(business_phone_number_id, userId, message.id, `Lütfen aşağıdaki şehirlerden birini seçin:\n1. İstanbul\n2. Antalya\n3. İzmir\n4. Ankara\n5. Bursa`)

            .then(() => markMessageAsRead(business_phone_number_id, message.id));

          break;

        case "6":

          userState[userId] = "PhotoUpload";

          sendMessage(business_phone_number_id, userId, message.id, "Lütfen göndermek istediğiniz fotoğrafı yükleyin.")

            .then(() => markMessageAsRead(business_phone_number_id, message.id));

        break;

        default:

          sendMessage(business_phone_number_id, userId, message.id, "Geçersiz seçenek. Lütfen 1, 2, 3, 4, 5 veya 6'yı seçin.")

            .then(() => markMessageAsRead(business_phone_number_id, message.id));

      }     

    }

    else if (userState[userId] === "Token")

    {

      userState[userId] = null;

    }

    else if (userState[userId] === "json")

    {

      userSurName[userId] = message.text.body;

      userState[userId] = "json2";

      getToken();

      sendMessage(business_phone_number_id, userId, message.id, "Email adresinizi giriniz.")

        .then(() => markMessageAsRead(business_phone_number_id, message.id));

    }

    else if (userState[userId] === "json2")

    {

      userEmail[userId] = message.text.body;

      userState[userId] = "json3";

      sendMessage(business_phone_number_id, userId, message.id, "Firma Adınızı giriniz.")

        .then(() => markMessageAsRead(business_phone_number_id, message.id));  

    }

    else if (userState[userId] === "json3")

    {

      userState[userId] = "json4";

      userFirma[userId] = message.text.body;

      sendMessage(business_phone_number_id, userId, message.id, "Girmek istediğiniz mesajı giriniz.")

        .then(() => markMessageAsRead(business_phone_number_id, message.id));   

    } 

    else if (userState[userId] === "json4")

    {  

      userState[userId] = null;

      userMessages[userId] = message.text.body; 

      instanceUniqueId = saveDataToJson(userId,userSurName[userId],userEmail[userId],userPhone[userId],userFirma[userId],userMessages[userId],accessToken);

     

      console.log("instanceUniqueId > " + instanceUniqueId);

           

      

      sendMessage(business_phone_number_id, userId, message.id, `${instanceUniqueId} İş No ile ilgili süreç başlamıştır.`)

        .then(() => markMessageAsRead(business_phone_number_id, message.id));

 

   

    }

    else if (userState[userId] == "PhotoUpload")

    {

      if (message?.type === "image")

      {       

        async function processImage(message)

        {

          try

          {

            sendPhotoEmail(userId, message.image.id);

            sendMessage(business_phone_number_id, userId, message.id, "Fotoğrafınız başarıyla gönderildi.");

            markMessageAsRead(business_phone_number_id, message.id);

            userState[userId] = null; // Durumu sıfırla

          }

          catch (error)

          {

            sendMessage(business_phone_number_id, userId, message.id, "Fotoğraf gönderilirken bir hata oluştu. Lütfen tekrar deneyin.")

            .then(() => markMessageAsRead(business_phone_number_id, message.id));

            userState[userId] = null; // Durumu sıfırla

          }

        }

        processImage(message);

      }

      else

      {

        sendMessage(business_phone_number_id, userId, message.id, "Fotoğraf yüklenemedi. Lütfen tekrar deneyin.")

          .then(() => markMessageAsRead(business_phone_number_id, message.id));

      }       

    }

    else if (userState[userId] === "demo_sales")

    {

      switch (message.text.body)

      {

        case "1":

          userState[userId] = "demo_request";

          sendMessage(business_phone_number_id, userId, message.id, "Demo Talebi Oluştur:\n1. LOGO TIGER / WINGS\n2. LOGO BORDRO / JHR\n3. LOGO FLOW\n4. LOGO CRM\n5. LOGO MIND\n6. E-FLOW\n #. Önceki Menüye Dön")

            .then(() => markMessageAsRead(business_phone_number_id, message.id));

          break;

        case "2":

          userState[userId] = null;

          sendMessage(business_phone_number_id, userId, message.id, "Satış Departmanına Ulaş:\n1. Kaan Arıkan - kaan.arikan@chipcomputer.com +90 531 664 9945\n2. Kerem Kus - kerem.kus@chipcomputer.com +90 532 204 7550")

            .then(() => markMessageAsRead(business_phone_number_id, message.id));

          break;

        case "#":

          userState[userId] = "demo_menu";

          sendMessage(business_phone_number_id, userId, message.id, `Merhaba ${userName[userId]}! Lütfen aşağıdaki menüden istediğiniz işlemi seçin:\n1. Demo ve Satış Talebi Oluşturma\n2. Destek Kaydı Oluşturma\n3. Danışman Bilgisine Ulaşma\n4. Finans Departmanına Ulaşma`)

            .then(() => markMessageAsRead(business_phone_number_id, message.id));

          break;

        default:

          sendMessage(business_phone_number_id, userId, message.id, "Geçersiz seçenek. Lütfen 1, 2 veya #'i seçin.")

            .then(() => markMessageAsRead(business_phone_number_id, message.id));

      }

    }

    else if (userState[userId] === "demo_request")

    {

      switch (message.text.body)

      {

        case "1":

          userSecim[userId] = "LOGO TIGER";

          userState[userId] = "demo_confirmation";

          sendMessage(business_phone_number_id, userId, message.id, "LOGO TIGER / WINGS demo talebi için e-mail adresinizi giriniz.")

            .then(() => markMessageAsRead(business_phone_number_id, message.id));

         

          break;

        case "2":

          userSecim[userId] = "LOGO BORDRO";

          userState[userId] = "demo_confirmation";

          sendMessage(business_phone_number_id, userId, message.id, "LOGO BORDRO / JHR demo talebi için e-mail adresinizi giriniz.")

            .then(() => markMessageAsRead(business_phone_number_id, message.id));

          break;

        case "3":

          userSecim[userId] = "LOGO FLOW";

          userState[userId] = "demo_confirmation";

          sendMessage(business_phone_number_id, userId, message.id, "LOGO FLOW demo talebi için e-mail adresinizi giriniz.")

            .then(() => markMessageAsRead(business_phone_number_id, message.id));

          break;

        case "4":

          userSecim[userId] = "LOGO CRM";

          userState[userId] = "demo_confirmation";

          sendMessage(business_phone_number_id, userId, message.id, "LOGO CRM demo talebi için e-mail adresinizi giriniz.")

            .then(() => markMessageAsRead(business_phone_number_id, message.id));

          break;

        case "5":

          userSecim[userId] = "LOGO MIND";

          userState[userId] = "demo_confirmation";

          sendMessage(business_phone_number_id, userId, message.id, "LOGO MIND demo talebi için e-mail adresinizi giriniz.")

            .then(() => markMessageAsRead(business_phone_number_id, message.id));

          break;

        case "6":

          userSecim[userId] = "E-FLOW";

          userState[userId] = "demo_confirmation";

          sendMessage(business_phone_number_id, userId, message.id, "E-FLOW demo talebi için e-mail adresinizi giriniz.")

            .then(() => markMessageAsRead(business_phone_number_id, message.id));

          break;

        case "#":

          userState[userId] = "demo_sales";

          sendMessage(business_phone_number_id, userId, message.id, "Demo ve Satış Talebi için seçenekler:\n1. Demo Talebi Oluştur\n2. Satış Departmanına Ulaş\n#. Ana Menüye Dön")

            .then(() => markMessageAsRead(business_phone_number_id, message.id));

          break;

        default:

          sendMessage(business_phone_number_id, userId, message.id, "Geçersiz seçenek. Lütfen 1-6 arasında bir sayı veya #'ı seçin.")

            .then(() => markMessageAsRead(business_phone_number_id, message.id));

      }

    }

    else if (userState[userId] === "demo_confirmation")

    {

      userEmail[userId] = message.text.body;

      if (isValidEmail(userEmail[userId]))

      {

        userEmail[userId] = message.text.body;

        sendDemoRequestEmail(userId, message.from) // Telefon numarasını buraya ekledik

          .then(() => sendMessage(business_phone_number_id, userId, message.id, `Demo talebiniz için ${userEmail[userId]} e-mail adresi ile iletişime geçilecektir teşekkürler.`))

          .then(() => markMessageAsRead(business_phone_number_id, message.id));

          userState[userId] = null;

 

      }

      else

      {

        sendMessage(business_phone_number_id, userId, message.id, "Geçersiz e-posta adresi. Lütfen geçerli bir e-posta adresi girin.")

          .then(() => markMessageAsRead(business_phone_number_id, message.id));

      }

    }

     else if (userState[userId] === "city_menu")

    {

      const cityMap =

      {

       "1": "istanbul",

       "2": "antalya",

       "3": "izmir",

       "4": "ankara",

       "5": "bursa"

      }; 

        const city = cityMap[message.text.body];

      if (city)

      {

        getWeatherInfo(city).then(weatherInfo =>

        {

            sendMessage(business_phone_number_id, userId, message.id, weatherInfo)

            .then(() => markMessageAsRead(business_phone_number_id, message.id));

            userState[userId] = null; // Durumu sıfırla

        });

      }

      else

      {

        sendMessage(business_phone_number_id, userId, message.id, "Geçersiz şehir seçimi. Lütfen 1, 2, 3, 4 veya 5'i seçin.")

        .then(() => markMessageAsRead(business_phone_number_id, message.id));

      }

    }

  }

  res.sendStatus(200);

});

 

  app.get("/webhook", (req, res) =>

  {

    const mode = req.query["hub.mode"];

    const token = req.query["hub.verify_token"];

    const challenge = req.query["hub.challenge"];

 

    if (mode && token)

    {

      if (mode === "subscribe" && token === WEBHOOK_VERIFY_TOKEN)

      {

      //  console.log("WEBHOOK_VERIFIED");

        res.status(200).send(challenge);

      }

      else

      {

        res.sendStatus(403);

      }

    }

  });

 

  app.listen(PORT || 3000, () =>

  {

    //console.log(`Server is running on port ${PORT || 3000}`);

  });

function isValidEmail(email)

{

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  return emailRegex.test(email);

}

 

function formatPhoneNumber(phoneNumber)

{

  return `+${phoneNumber.slice(0, 2)} ${phoneNumber.slice(2, 5)} ${phoneNumber.slice(5, 8)} ${phoneNumber.slice(8, 12)}`;

}

 

function markMessageAsRead(phoneNumberId, messageId)

{

  return axios

  ({

    method: "POST",

    url: `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,

    headers:

    {

      Authorization: `Bearer ${GRAPH_API_TOKEN}`,

    },

    data:

    {

      messaging_product: "whatsapp",

      status: "read",

      message_id: messageId,

    },

  })

  .catch(error => console.error(`Mesaj okundu olarak işaretlenemedi: ${error}`));

}

 

function sendMessage(phoneNumberId, to, messageId, text)

{

  return axios({

    method: "POST",

    url: `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,

    headers: {

      Authorization: `Bearer ${GRAPH_API_TOKEN}`,

    },

    data: {

      messaging_product: "whatsapp",

      to,

      text: { body: text },

      context: {

        message_id: messageId,

      },

    },

  })

  .catch(error => console.error(`Mesaj gönderilemedi: ${error}`));

}

 

async function getWeatherInfo(city)

{

  try

  {

    const locationKeys = {

      "istanbul": "318251",

      "antalya": "323456",

      "izmir": "329371",

      "ankara": "327382",

      "bursa": "326453"

    };

    const locationKey = locationKeys[city];

    const response = await axios.get(`http://dataservice.accuweather.com/currentconditions/v1/${locationKey}?apikey=${'GSsMP2MO4yZiMC5cemKpNZxrMwDCfq4R&language=tr-tr'}`);

    const weatherData = response.data[0];

    return `${city.charAt(0).toUpperCase() + city.slice(1)} Hava Durumu:\nSıcaklık: ${weatherData.Temperature.Metric.Value}°C\nHava Durumu: ${weatherData.WeatherText}`;

  }

  catch (error)

  {

    console.error("Hava durumu bilgisi alınamadı:", error);

    return "Hava durumu bilgisi alınamadı. Lütfen daha sonra tekrar deneyin.";

  }

}

 

const transporter = nodemailer.createTransport

({

  host: 'smtp.office365.com',

    port: 587,

    secure: false, // true for 465, false for other ports

    auth:

    {

      user: EMAIL_USER, // Microsoft 365 e-posta adresiniz

      pass: EMAIL_PASS, // Microsoft 365 uygulama şifreniz

    },

});

 

function sendDemoRequestEmail(userId,phone)

{

  const mailOptions =

  {

    from: EMAIL_USER, // Gönderen e-posta adresi

    to: EMAIL, // Alıcı e-posta adresi

    cc: userEmail[userId], // Kullanıcının e-posta adresi

    subject: 'Yeni Demo Talebi',

    text: `${userName[userId]} adlı kullanıcının demo talebi:\nÜrün: ${userSecim[userId]}\nEmail: ${userEmail[userId]}\nTelefon Numarası:`+formatPhoneNumber(phone),

  };

 

  return transporter.sendMail(mailOptions)

    .then(info => console.log(`Demo talebi e-postası gönderildi: ${info.response}`))

    .catch(error => console.error(`Demo talebi e-postası gönderilemedi: ${error}`));

}

 

async function sendPhotoEmail(userId, FotoId)

{ 

  const mailOptions =

  {

    from: EMAIL_USER,

    to: EMAIL,

    subject: 'Kullanıcıdan Yeni Fotoğraf',

    text: `${userName[userId]} adlı kullanıcıdan yeni fotoğraf:${FotoId}\nTelefon Numarası: ${formatPhoneNumber(userId)}`,

  };

 

  try

  {

    let info = await transporter.sendMail(mailOptions);

    console.log(`Fotoğraf e-postası gönderildi: ${info.response}`);

  }

  catch (error)

  {

    console.error(`Fotoğraf e-postası gönderilemedi: ${error}`);

  }

}

 

 

 

function getToken()

{

    const postData = JSON.stringify({

        'ExternalIdpProviderType': '0',

        'Username': 'baglanti.linki'

    });

 

    // axios.post işlemi döndüren Promise'i yakalayın

    const responsePromise = axios.post(`https://logoflowdev.chipcomputer.com/v1_0/NAF.LFlow.WAS/api/login/impersonated`, postData, {

        headers: {

            'Accept': 'application/json',

            'Content-Type': 'application/json',

            'Content-Length': Buffer.byteLength(postData),

            'Host': LINK,

            'client_id': ID,

            'client_secret': KEY

        }

    });

 

    // Promise'i beklemek için Promise.prototype.then kullanılır

    return responsePromise.then(function(response) {

        accessToken = response.data.AccessToken;

        console.log(`getToken | TOKEN ALINDI > ` + accessToken);

        return accessToken;

    }).catch(function(error) {

        console.error('Error while getting token:', error);

        return `getToken | Alınamadı > `+ error;

    });

}

 

 

function saveDataToJson(userId, userName, userEmail, userPhone, userFirma, userMessage, accessToken) {

    var userData = JSON.stringify({

        "storageid": 2066,

        "description": "WhatsApp Bot " + userPhone,

        "storagePublishType": "0",

        "ExtraParameters": [

            { "Key": "AdSoyad", "Value": userName },

            { "Key": "EPostaAdresi", "Value": userEmail },

            { "Key": "TelefonNumarasi", "Value": userPhone },

            { "Key": "FirmaAdi", "Value": userFirma },

            { "Key": "Mesaj", "Value": userMessage },

            { "Key": "SMSKodu", "Value": "1234" },

            { "Key": "smsDogrulama", "Value": "1234" }

        ]

    });

 

    const headers = {

        "Content-Length": Buffer.byteLength(userData),

        "Host": LINK,

        "Accept": "application/json",

        "Authorization": `Bearer ${accessToken}`, // Assuming Bearer token format

        "Content-Type": "application/json"

    };

 

    // Perform the POST request using axios

    axios.post(

        "https://logoflowdev.chipcomputer.com/v1_0/NAF.LFlow.WAS/api/workflow/start/withparams",

        userData, // userData as the body

        { headers } // headers as the options

    )

    .then(function(response) {

        // Parsing the ExecutionResultObjectJSON to get InstanceUniqueId

        const executionResultObject = JSON.parse(response.data.ExecutionResult.ExecutionResultObjectJSON);

        instanceUniqueId = executionResultObject.WorkflowContext.InstanceUniqueId;

        console.log('InstanceUniqueId:', '' + instanceUniqueId);

        return '' + instanceUniqueId;

    })

    .catch(function(error) {

        console.error("Veri gönderilirken hata oluştu:", error.message);

    });

 

    // Note: If you need to use the data elsewhere, you might need to handle the asynchronous nature differently.

}