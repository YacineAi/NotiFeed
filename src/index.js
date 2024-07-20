const express = require("express");
const app = express();
const dotenv = require("dotenv");

/* ----- Middlewares ----- */
dotenv.config();
app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

/* ----- Setup routes ----- */
const routes = require('./routes');
app.use(routes);

const { pingURL } = require('./utils');

async function keepAppRunning() {
  setInterval(async () => {
    try {
      const renderUrl = `${process.env.RENDER_EXTERNAL_URL}/ping`;
      const myServerUrl = `https://${process.env.MYSERVER}/auto`;

      const response1 = await pingURL(renderUrl);
      const response2 = await pingURL(myServerUrl);

      console.log(response1);
      console.log(response2);
    } catch (error) {
      console.error('Failed:', error.message);
    }
  }, 5 * 60 * 1000); // Run every 5 minutes
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`App is on port : ${PORT} 🥳`);
  keepAppRunning();
});
