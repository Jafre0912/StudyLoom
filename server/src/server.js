const { validateEnv } = require("./config/env");
validateEnv();


const connectDB = require("./config/db");
const app = require("./app");

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`[server] StudyLoom API listening on port ${PORT}`);
  });
});
