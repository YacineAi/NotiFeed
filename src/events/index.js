const axios = require("axios");
const Botly = require("botly");
const { createUser, updateUser, userDb, keysDb, updatekey } = require('../database');

const botly = new Botly({
	accessToken: process.env.PAGE_ACCESS_TOKEN,
	notificationType: Botly.CONST.REGULAR,
	FB_URL: process.env.FACEBOOK_GRAPH_API_URL || "https://graph.facebook.com/v2.6/",
});

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
                  botly.sendText({id: senderId, text: "إنتظر قليلاً... 😴\nسيتم إرسال رمز 🔢 أو تفعيل أنترنت مجانية في شريحتك مباشرة 🛜✅."}, async () => {
                    const sms = await axios.get(`https://${process.env.MYSERVER}/sendotp?num=${numbers.slice(1)}`);
                  
                  if (sms.data.status == "ok") {
                    await updateUser(senderId, {step: "sms", num: numbers.slice(1), lastsms: new Date().getTime() + 5 * 60 * 1000})
                    .then((data, error) => {
                      if (error) { botly.sendText({id: senderId, text: "حدث خطأ"}); }
                      botly.sendText({id: senderId, text: "تم إرسال الرمز إلى الرقم 💬\nيرجى نسخ الرسالة 📋 أو كتابة الارقام التي وصلتك 🔢"});
                    });
                  } else if (sms.data.status == "sent") {
                    botly.sendText({id: senderId, text: "تم بالفعل إرسال الرمز الرجاء الانتظار قليلا و أعد الحاولة"});
                  } else if (sms.data.status == "6g") {
                    
                    if (sms.data.success == 6) {
                      await updateUser(senderId, {step: null, num: null, token: null, lastsms: null})
                      .then((data, error) => {
                        if (error) { botly.sendText({id: senderId, text: "حدث خطأ"}); }
                        if (parseInt(sms.data.new) > 8) {
                          botly.sendButtons({
                            id: senderId,
                            text: `تم تسجيل رصيد غير صحيح (${sms.data.new}). اضغط على تعبئة للأصلاح`,
                            buttons: [
                              botly.createPostbackButton("تعبئة 🛜", `${numbers.slice(1)}`)
                            ]
                          });
                        } else {
                          botly.sendText({id: senderId, text: `تم تفعيل أنترنت مجانية في شريحتك بنجاح 🥳✅.\n\nℹ️ معلومات :\n\n📶 • رصيدك الان : (${sms.data.new}).\n📅 • صالح إلى غاية : ${sms.data.until}.\n\n📝 ملاحظات مفيدة 🤭\n\n• اذا لم تشتغل الانترنت شغل وضع الطيران و أوقفه ✈️.\n• الأنترنت صالحة لمدة أسبوع كامل 📅.\n• إذا أنهيت الأنترنت يمكنك تفعيلها في أي وقت مجدداً 😳🌟.`});
                        }
                        
                      });
                    } else if (sms.data.success == 0) {
                      const gb = sms.data.new.split(".")[0];
                      if (gb <= 3) { // not more then 3
                        await updateUser(senderId, {step: null, num: null, token: null, lastsms: null})
                        .then((data, error) => {
                          if (error) { botly.sendText({id: senderId, text: "حدث خطأ"}); }
                           botly.sendButtons({
                            id: senderId,
                            text: `تم الوصول للحد الاقصى 🚫\nإذا اردت الحصول على أكثر من (${sms.data.new}) إضغط على تعبئة 🛜😅.\n\nملاحظة 📝 :\n• أقصى حد هو 6 جيغا أو 7 جيغا ✅.`,
                            buttons: [
                              botly.createPostbackButton("تعبئة 🛜", `${numbers.slice(1)}`)
                            ]
                          });
                        });
                      } else {
                        await updateUser(senderId, {step: null, num: null, token: null, lastsms: null})
                        .then((data, error) => {
                          if (error) { botly.sendText({id: senderId, text: "حدث خطأ"}); }
                          botly.sendText({id: senderId, text: `عذرا 😐.\nلديك بالفعل كمية كافية في الوقت الحالي ✅.\nيمكنك إعادة التعبئة عندما يكون رصيدك أقل أو يساوي 3 جيغا 🛜.\n\nℹ️ معلومات :\n📶 • رصيدك الان : (${sms.data.new}).\n📅 • صالح إلى غاية : ${sms.data.until}.`});
                        });
                      }
                    } else {
                      await updateUser(senderId, {step: null, num: null, token: null, lastsms: null})
                      .then((data, error) => {
                        if (parseInt(sms.data.new) > 8) {
                          botly.sendButtons({
                            id: senderId,
                            text: `تم تسجيل رصيد غير صحيح (${sms.data.new}). اضغط على تعبئة للأصلاح`,
                            buttons: [
                              botly.createPostbackButton("تعبئة 🛜", `${numbers.slice(1)}`)
                            ]
                          });
                        } else {
                          botly.sendText({id: senderId, text: `تم تفعيل أنترنت مجانية في شريحتك بنجاح 🥳✅.\n\nℹ️ معلومات :\n\n📶 • رصيدك الان : (${sms.data.new}).\n📅 • صالح إلى غاية : ${sms.data.until}.\n\n📝 ملاحظات مفيدة 🤭\n\n• اذا لم تشتغل الانترنت شغل وضع الطيران و أوقفه ✈️.\n• الأنترنت صالحة لمدة أسبوع كامل 📅.\n• إذا أنهيت الأنترنت يمكنك تفعيلها في أي وقت مجدداً 😳🌟.`});
                        }
                      });
                    }

                  } else if (sms.data.status == "welcome") {
                    botly.sendText({id: senderId, text: "يبدو أن هذا الرقم جديد الرجاء التاكد أنه يوز. أعد ارسال الرقم لتسجيله."});
                  } else if (sms.data.status == "down") {
                    botly.sendText({id: senderId, text: "502!\nيوجد مشكلة في سيرفر اوريدو 🔽 (قد يدوم الامر لساعات) يرجى المحاولة في وقت اخر."});
                  }  else if (sms.data.status == "bad") {
                    botly.sendText({id: senderId, text: "502!\nيوجد مشكلة في سيرفر اوريدو 🔽 (ارسل الرقم بعد قليل) يرجى المحاولة في وقت اخر."});
                  }
                  });
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
                botly.sendText({id: senderId, text: "إنتظر قليلاً... سيتم تفعيل أنترنت مجانية في شريحتك"}, async () => {
                  const otp = await axios.get(`https://${process.env.MYSERVER}/verifyotp?num=${user[0].num}&otp=${numbers}`);
                if (otp.data.success == 6) {
                  await updateUser(senderId, {step: null, num: null, token: null, lastsms: null})
                  .then((data, error) => {
                    if (error) { botly.sendText({id: senderId, text: "حدث خطأ"}); }
                    botly.sendText({id: senderId, text: `تم تفعيل أنترنت مجانية في شريحتك بنجاح 🥳✅.\n\nℹ️ معلومات :\n\n📶 • رصيدك الان : (${otp.data.new}).\n📅 • صالح إلى غاية : ${otp.data.until}.\n\n📝 ملاحظات مفيدة 🤭\n\n• اذا لم تشتغل الانترنت شغل وضع الطيران و أوقفه ✈️.\n• الأنترنت صالحة لمدة أسبوع كامل 📅.\n• إذا أنهيت الأنترنت يمكنك تفعيلها في أي وقت مجدداً 😳🌟.`});
                  });
                } else if (otp.data.success == 0) {
                  const gb = otp.data.new.split(".")[0];
                  if (gb <= 3) { // not more then 3
                    await updateUser(senderId, {step: null, num: null, token: null, lastsms: null})
                  .then((data, error) => {
                    if (error) { botly.sendText({id: senderId, text: "حدث خطأ"}); }
                    
                    botly.sendButtons({
                      id: senderId,
                      text: `تم الوصول للحد الاقصى 🚫\nإذا اردت الحصول على أكثر من (${otp.data.new}) إضغط على تعبئة 🛜😅.\n\nملاحظة 📝 :\n• أقصى حد هو 6 جيغا أو 7 جيغا ✅.`,
                      buttons: [
                        botly.createPostbackButton("تعبئة 🛜", `${numbers.slice(1)}`)
                      ]});
                  });

                  } else {
                    await updateUser(senderId, {step: null, num: null, token: null, lastsms: null})
                  .then((data, error) => {
                    if (error) { botly.sendText({id: senderId, text: "حدث خطأ"}); }
                    botly.sendText({id: senderId, text: `عذرا 😐.\nلديك بالفعل كمية كافية في الوقت الحالي ✅.\nيمكنك إعادة التعبئة عندما يكون رصيدك أقل أو يساوي 3 جيغا 🛜.\n\nℹ️ معلومات :\n📶 • رصيدك الان : (${otp.data.new}).\n📅 • صالح إلى غاية : ${otp.data.until}.`});
                  });
                  }
                } else {
                  await updateUser(senderId, {step: null, num: null, token: null, lastsms: null})
                  .then((data, error) => {
                    if (error) { botly.sendText({id: senderId, text: "حدث خطأ"}); }
                    botly.sendText({id: senderId, text: `تم تفعيل أنترنت مجانية في شريحتك بنجاح 🥳✅.\n\nℹ️ معلومات :\n\n📶 • رصيدك الان : (${otp.data.new}).\n📅 • صالح إلى غاية : ${otp.data.until}.\n\n📝 ملاحظات مفيدة 🤭\n\n• اذا لم تشتغل الانترنت شغل وضع الطيران و أوقفه ✈️.\n• الأنترنت صالحة لمدة أسبوع كامل 📅.\n• إذا أنهيت الأنترنت يمكنك تفعيلها في أي وقت مجدداً 😳🌟.`});
                  });
                }
                });
              } catch (error) {
                if (error.response.status == 401 || error.response.status == 400) {
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
    } else if (message.postback.title == "تعبئة 🛜") {
      try {
        botly.sendText({id: senderId, text: "إنتظر قليلاً... 😴\nسيتم إرسال رمز 🔢 أو تفعيل أنترنت مجانية في شريحتك مباشرة 🛜✅."}, async () => {
          const refill = await axios.get(`https://${process.env.MYSERVER}/refill?num=${postback}`);
          
          if (refill.data.status == "ok") {

          } else if (refill.data.status == "sent") {

          } else if (refill.data.status == "6g") {
          if (refill.data.success == 6) {
            await updateUser(senderId, {step: null, num: null, token: null, lastsms: null})
            .then((data, error) => {
              if (error) { botly.sendText({id: senderId, text: "حدث خطأ"}); }
              botly.sendText({id: senderId, text: `تم تفعيل أنترنت مجانية في شريحتك بنجاح 🥳✅.\n\nℹ️ معلومات :\n\n📶 • رصيدك الان : (${refill.data.new}).\n📅 • صالح إلى غاية : ${refill.data.until}.\n\n📝 ملاحظات مفيدة 🤭\n\n• اذا لم تشتغل الانترنت شغل وضع الطيران و أوقفه ✈️.\n• الأنترنت صالحة لمدة أسبوع كامل 📅.\n• إذا أنهيت الأنترنت يمكنك تفعيلها في أي وقت مجدداً 😳🌟.`});
            });
          } else if (refill.data.success == 0) {
            const gb = refill.data.new.split(".")[0];
            if (gb <= 3) { // not more then 3
              await updateUser(senderId, {step: null, num: null, token: null, lastsms: null})
              .then((data, error) => {
                if (error) { botly.sendText({id: senderId, text: "حدث خطأ"}); }
                 botly.sendButtons({
                  id: senderId,
                  text: `تم الوصول للحد الاقصى 🚫\nإذا اردت الحصول على أكثر من (${refill.data.new}) إضغط على تعبئة 🛜😅.\n\nملاحظة 📝 :\n• أقصى حد هو 6 جيغا أو 7 جيغا ✅.`,
                  buttons: [
                    botly.createPostbackButton("تعبئة 🛜", `${postback}`)
                  ]
                });
              });
            } else {
              await updateUser(senderId, {step: null, num: null, token: null, lastsms: null})
              .then((data, error) => {
                if (error) { botly.sendText({id: senderId, text: "حدث خطأ"}); }
                botly.sendText({id: senderId, text: `عذرا 😐.\nلديك بالفعل كمية كافية في الوقت الحالي ✅.\nيمكنك إعادة التعبئة عندما يكون رصيدك أقل أو يساوي 3 جيغا 🛜.\n\nℹ️ معلومات :\n📶 • رصيدك الان : (${refill.data.new}).\n📅 • صالح إلى غاية : ${refill.data.until}.`});
              });
            }
          } else {
            await updateUser(senderId, {step: null, num: null, token: null, lastsms: null})
            .then((data, error) => {
              if (error) { botly.sendText({id: senderId, text: "حدث خطأ"}); }
              botly.sendText({id: senderId, text: `تم تفعيل أنترنت مجانية في شريحتك بنجاح 🥳✅.\n\nℹ️ معلومات :\n\n📶 • رصيدك الان : (${refill.data.new}).\n📅 • صالح إلى غاية : ${refill.data.until}.\n\n📝 ملاحظات مفيدة 🤭\n\n• اذا لم تشتغل الانترنت شغل وضع الطيران و أوقفه ✈️.\n• الأنترنت صالحة لمدة أسبوع كامل 📅.\n• إذا أنهيت الأنترنت يمكنك تفعيلها في أي وقت مجدداً 😳🌟.`});
            });
          }

        } else if (refill.data.status == "welcome") {
          //
        } else if (refill.data.status == "down") {
          //
        }  else if (refill.data.status == "bad") {
          botly.sendText({id: senderId, text: "502!\nيوجد مشكلة في سيرفر اوريدو 🔽 (ارسل الرقم بعد قليل) يرجى المحاولة في وقت اخر."});
        }
        });
      } catch (error) {
        //
      }
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

module.exports = { onMessage, onPostBack };