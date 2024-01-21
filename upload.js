const { exec } = require("child_process");
const axios = require("axios");

const FormData = require("form-data");
const fs = require("fs");
var path = require("path");
const TelegramBot = require("node-telegram-bot-api");

var diawiToken = "FReBHVxGwMbTtLGZk5Bklv5vhsqNo4rrnZubEuLAVX";
const telegramToken = "6493771028:AAF0P827GAL-vOiRS0_9fJ_UbDM33mS-l-4";
const chatId = "-1002075586227";

const bot = new TelegramBot(telegramToken, { polling: false });

// This script is place at the root of the flutter application assuming the apk will be generated at the following path
// build/app/outputs/flutter-apk/app-prod-release.apk. you can modify it as per your path.

var filePath = path.join(
  __dirname,
  "..",
  "build",
  "app",
  "outputs",
  "flutter-apk",
  "app-prod-release.apk"
);

// This function will begin the build process of the apk file. Once apk is generated it will then begin uploading to diawi 
function beginBuild() {
  // delete the old apk file
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  // Begin building the apk
  exec("flutter build apk --release --flavor prod", (err, stdout, stderr) => {
    if (err) {
      console.error(err);
      return;
    }
    var filePath = path.join(
      __dirname,
      "..",
      "build",
      "app",
      "outputs",
      "flutter-apk",
      "app-prod-release.apk"
    );
    beginUpload(filePath);
  });
}

// This function uploads the apk file to diawi
async function beginUpload(filePath) {
  const form = new FormData();
  form.append("file", fs.createReadStream(filePath));
  form.append("token", diawiToken);

  let res = await axios.post("https://upload.diawi.com/", form, {
    headers: {
      ...form.getHeaders(),
      Authorization: `Bearer ${diawiToken}`,
    },
  });
  
  // Diawi does not immediately respond with the url. It responds with a job id which will be used to get the status of the job. We will keep on polling the /status api every 2 seconds
  // Once we get the link we send it to a telegram group
  pollUrl(res.data.job);
}

// Once apk is uploaded we don't immediately get the apk url. We will keep on polling the status api of diawi till apk link is returned
async function pollUrl(diawiJobId) {
  let params = {
    token: diawiToken,
    job: diawiJobId,
  };
  console.log(params);
  let res = await axios.get("https://upload.diawi.com/status", { params });
  let diawiStatus = res.data.status;
  if (diawiStatus == 2001) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    pollUrl(diawiJobId);
  } else if (diawiStatus == 2000) {
    var link = res.data.link;
    console.log(link);
    bot.sendMessage(chatId, link);
  }
}

beginBuild();
