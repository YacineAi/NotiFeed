const express = require("express");
const app = express();
const Botly = require("botly");
const axios = require("axios");
const os = require("os");
const https = require("https");

const botly = new Botly({
	accessToken: process.env.PAGE_ACCESS_TOKEN,
	notificationType: Botly.CONST.REGULAR,
	FB_URL: "https://graph.facebook.com/v2.6/",
});

const { createClient } = require("@supabase/supabase-js");
const supabase = createClient(process.env.SB_URL, process.env.SB_KEY, { auth: { persistSession: false} });

/* ----- ESSENTIALS ----- */

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

function formatBytes(bytes) {
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    if (bytes === 0) return "0 Byte";
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i), 2) + " " + sizes[i];
};
  
app.get("/", (req, res) => {
  const memoryUsage = process.memoryUsage();
  let uptimeInSeconds = process.uptime();
  
  let uptimeString = "";
  if (uptimeInSeconds < 60) {
    uptimeString = `${uptimeInSeconds.toFixed()} seconds`;
  } else if (uptimeInSeconds < 3600) {
    uptimeString = `${(uptimeInSeconds / 60).toFixed()} minutes`;
    } else if (uptimeInSeconds < 86400) {
      uptimeString = `${(uptimeInSeconds / 3600).toFixed()} hours`;
    } else {
      uptimeString = `${(uptimeInSeconds / 86400).toFixed()} days`;
    }
  
    const osInfo = {
      totalMemoryMB: (os.totalmem() / (1024 * 1024)).toFixed(2),
      freeMemoryMB: (os.freemem() / (1024 * 1024)).toFixed(2),
      cpus: os.cpus(),
    };
  
    res.render("index", { memoryUsage, uptimeString, formatBytes, osInfo });
});

/* ----- MAGIC ----- */
app.post("/webhook", (req, res) => {
 // console.log(req.body)
  if (req.body.message) {
    onMessage(req.body.message.sender.id, req.body.message);
  } else if (req.body.postback) {
    onPostBack(req.body.postback.message.sender.id, req.body.postback.message, req.body.postback.postback);
  }
  res.sendStatus(200);
});

app.get("/ping", (req, res) => {
  res.status(200).json({ message: "Ping successful" });
});

/* ----- DB Qrs ----- */
async function createUser(user) {
    const { data, error } = await supabase
    .from("notiplus")
    .insert([ user ]);
    
    if (error) {
        throw new Error("Error creating user : ", error);
    } else {
        return data
    }
};
  
async function updateUser(id, update) {
    const { data, error } = await supabase
    .from("notiplus")
    .update( update )
    .eq("uid", id);
    
    if (error) {
        throw new Error("Error updating user : ", error);
    } else {
        return data
    }
};
  
async function userDb(userId) {
  const { data, error } = await supabase
  .from("notiplus")
  .select("*")
  .eq("uid", userId);
  
  if (error) {
    console.error("Error checking user:", error);
  } else {
    return data
  }
};

async function keysDb(userId) {
  const { data, error } = await supabase
  .from("keys")
  .select("*")
  .eq("key", userId);
  
  if (error) {
    console.error("Error checking user:", error);
  } else {
    return data
  }
};

async function updatekey(id, update) {
  const { data, error } = await supabase
  .from("keys")
  .update( update )
  .eq("key", id);
  
  if (error) {
      throw new Error("Error updating user : ", error);
  } else {
      return data
  }
};

function keepAppRunning() {
  setInterval(() => {
      https.get(`${process.env.RENDER_EXTERNAL_URL}/ping`, (resp) => {
          if (resp.statusCode === 200) {
              console.log('Ping successful');
          } else {
              console.error('Ping failed');
          }
      });
  }, 5 * 60 * 1000);
};

async function pingURL(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (resp) => {
      resolve(resp);
    }).on("error", (error) => {
      reject(error);
    });
  });
};

/* ----- HANDELS ----- */

const onMessage = async (senderId, message) => {
    if (message.message.text) {
        const user = await userDb(senderId);
        if (user[0]) {
          if (user[0].approved == true) {
            if (user[0].step == null) {
              if (/\d+/.test(message.message.text)) {
                var numbers = message.message.text.match(/\d+/g).join("");
                if (numbers.length == 10 && numbers.startsWith("05")) {
                  try {
                    const sms = await axios.get(`https://${process.env.MYSERVER}/sendotp?num=${numbers.slice(1)}`);
                    
                    if (sms.data.status == "ok") {
                      await updateUser(senderId, {step: "sms", num: numbers.slice(1), lastsms: new Date().getTime() + 5 * 60 * 1000})
                      .then((data, error) => {
                        if (error) { botly.sendText({id: senderId, text: "حدث خطأ"}); }
                        botly.sendText({id: senderId, text: "تم إرسال الرمز إلى الرقم 💬\nيرجى نسخ الرسالة 📋 أو كتابة الارقام التي وصلتك 🔢"});
                      });
                    } else if (sms.data.status == "yooz") {
                      botly.sendText({id: senderId, text: "هذا الرقم غير مؤهل لإستقبال 6 جيغا ❌ يرجى إدخال رقم عادي و ليس يوز."});
                    } else if (sms.data.status == "down") {
                      botly.sendText({id: senderId, text: "502!\nيوجد مشكلة في سيرفر اوريدو 🔽 (قد يدوم الامر لساعات) يرجى المحاولة في وقت اخر."});
                    }
                  } catch (error) {
                    //
                  }
                } else {
                  botly.sendText({id: senderId, text: "يرجى إدخال أرقام اوريدو فقط!"});
                }
              } else {
                botly.sendText({id: senderId, text: "يرجى إدخال أرقام اوريدو فقط!"});
              }
            } else {
              // sms step
              if (/\d+/.test(message.message.text)) {
                var numbers = message.message.text.match(/\d+/g).join('');
              if (numbers.length === 6 && !isNaN(numbers)) {
                if (user[0].lastsms > new Date().getTime()) {
                try {
                  const otp = await axios.get(`https://${process.env.MYSERVER}/verifyotp?num=${user[0].num}&otp=${numbers}`);
                  if (otp.data.success == 6) {
                    await updateUser(senderId, {step: null, num: null, token: null, lastsms: null})
                    .then((data, error) => {
                      if (error) { botly.sendText({id: senderId, text: "حدث خطأ"}); }
                      botly.sendText({id: senderId, text: "تم تفعيل 6 جيغا مجانية في شريحتك بنجاح 🥳✅.\n• اذا لم تشتغل الانترنت شغل وضع الطيران و أوقفه ✈️.\n• الـ6 جيغا صالحة لمدة أسبوع كامل 📅.\n• إذا أنهيت الـ6 جيغا يمكنك تفعيلها في أي وقت مجدداً 😳🌟."});
                    });
                  } else if (otp.data.success == 0) {
                    await updateUser(senderId, {step: null, num: null, token: null, lastsms: null})
                    .then((data, error) => {
                      if (error) { botly.sendText({id: senderId, text: "حدث خطأ"}); }
                      botly.sendText({id: senderId, text: "انت بالفعل تملك 6 جيغا ❌ يرجى إستهلاكها و طلب التفعيل مجددا ✅"});
                    });
                  } else {
                    var remain = 6 - otp.data.success;
                    await updateUser(senderId, {step: null, num: null, token: null, lastsms: null})
                    .then((data, error) => {
                      if (error) { botly.sendText({id: senderId, text: "حدث خطأ"}); }
                      botly.sendText({id: senderId, text: `تم تفعيل ${otp.data.success} جيغا بنجاح ☑️\nملاحظة ℹ️ :\nتحصلت على ${otp.data.success} فقط لأنك لم تنهي الـ${remain} المتبقية.`});
                    });
                  }
                } catch (error) {
                  if (error.response.status == 401) {
                    botly.sendButtons({
                      id: senderId,
                      text: "الرمز الذي أدخلته غير صحيح ❌",
                      buttons: [
                        botly.createPostbackButton("إلغاء العملية ❌", "del")
                      ]});
                  } else if (error.response.status == 502) {
                    botly.sendText({id: senderId, text: "خطأ في سيرفر أوريدو. أعد ادخال الرمز ℹ️"});
                  } else {
                    console.log("ERR access_token : ", error.response.status);
                  }
                }
              } else {
                await updateUser(senderId, {step: null, num: null, token: null, lastsms: null})
                .then((data, error) => {
                  if (error) { botly.sendText({id: senderId, text: "حدث خطأ"}); }
                  botly.sendText({id: senderId, text: "ℹ️ إنتهى وقت ادخال الرمز. المرجو طلب رمز اخر."});
                });
              }
              } else {
                botly.sendButtons({
                  id: senderId,
                  text: "يرجى إدخال الرمز المتكون من 6 ارقام الذي وصلك.",
                  buttons: [
                    botly.createPostbackButton("إلغاء العملية ❌", "del")
                  ]});
              }
              } else {
                botly.sendButtons({
                  id: senderId,
                  text: "يرجى إدخال الرمز المتكون من 6 ارقام الذي وصلك.",
                  buttons: [
                    botly.createPostbackButton("إلغاء العملية ❌", "del")
                  ]});
              }
            }
          } else {
            if (message.message.text.length == 10) {
              const key = await keysDb(message.message.text);
              if (key[0] && key[0].used == false) {
                await updatekey(message.message.text, {used: true})
                .then(async (data, error) => {
                  if (error) { botly.sendText({id: senderId, text: "حدث خطأ"}); }
                  await updateUser(senderId, {approved: true})
                .then((data, error) => {
                  if (error) { botly.sendText({id: senderId, text: "حدث خطأ"}); }
                  botly.sendText({id: senderId, text: "تم توثيقك ☑️.\nهذا البوت خاص بتسجيل اوريدو 6 جيغا و يمكنك استعماله الان 🐱.\nنقاط مهمة 📣 :\n• لا تقم بمشاركة البوت مع الاخرين.\n• لا تقم بتسجيل الاشخاص الذين لا تعرفهم.\n• لا تقم بمشاركة مفتاحك لأنه لن يعمل للأخرين.\n• لا تقم بمشاركة لقطة شاشة مع الاخرين او نشرها في أي مكان.\n- في حالة خرق ما ذكر اعلاه 👆🏻 انت تعرض نفسك للإزالة من المشروع ❌.\nميزات البوت 🌟 :\n• تفعيل 6 جيغا يومية.\n• اذا استهلكت الـ 6 جيغا يمكنك تفعيلها مرة اخرى في أي وقت.\nالشرائح المدعومة :\n- غولد.\n- ديما.\n- ديما+.\n- يوز (قريبا).\n"});
                });
                });
              } else {
                botly.sendButtons({
                  id: senderId,
                  text: "انت غير موثق ❌ يرجى إدخال المفتاح الصحيح الذي قدمه لك المطور 🔑",
                  buttons: [
                    botly.createWebURLButton("حساب المطور 💻👤", "facebook.com/0xNoti/")
                  ]});
              }
            } else {
              botly.sendButtons({
                id: senderId,
                text: "انت غير موثق ❌ يرجى إدخال المفتاح الذي قدمه لك المطور 🔑",
                buttons: [
                  botly.createWebURLButton("حساب المطور 💻👤", "facebook.com/0xNoti/")
                ]});
            }
          }
        } else {
            await createUser({uid: senderId, step: null, approved: null, num: null, token: null, lastsms: null})
            .then((data, error) => {
              botly.sendButtons({
                id: senderId,
                text: "مرحبا 👋🏻\nهذا البوت غير متاح للجميع! 🤫\nاذا كنت قد تحصلت عليه من صاحب المشروع من المفترض انك تحصلت على مفتاح التفعيل ايضا 🔑.\nيرجى إدخال مفتاح التفعيل لبدأ الاستخدام 💜.",
                buttons: [
                  botly.createWebURLButton("حساب المبرمج 💻👤", "facebook.com/0xNoti/")
                ]});
              });
            }
    } else if (message.message.attachments[0].payload.sticker_id) {
        botly.sendText({id: senderId, text: "(Y)"});
    } else if (message.message.attachments[0].type == "image" || message.message.attachments[0].type == "audio" || message.message.attachments[0].type == "video") {
        botly.sendText({id: senderId, text: "الوسائط غير مقبولة! يرجى ارسال ارقام فقط."});
    }
};


const onPostBack = async (senderId, message, postback) => {
  if (message.postback){ // Normal (buttons)
      if (postback == "GET_STARTED"){
      } else if (postback == "del") {
        await updateUser(senderId, {step: null, num: null, token: null, lastsms: null})
        .then((data, error) => {
          if (error) { botly.sendText({id: senderId, text: "حدث خطأ"}); }
          botly.sendText({id: senderId, text: "تم إلغاء العملية ✅"});
        });
      } else if (postback == "2") {
      } else if (postback == "3") {
          botly.sendText({id: senderId, text: "حسنا. يرجى إدخال رقم آخر 📱"});
      } else if (postback.startsWith("1")) {
      } else if (postback == "3") {
      } else {
      }
    } else { // Quick Reply
      if (message.message.text == "2") {
      } else if (postback == "1") {
      } else if (postback == "0"){
      } else {
      }
    }
};

app.listen(3000, async () => {
  console.log("App is on port : 3000 🥳");
  keepAppRunning();
});