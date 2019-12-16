const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "/../.env") });

const {
  GATEWAY_EXPRESS_PORT,
  ACCOUNTS_MONGO_URL,
  HTTPS_PRIVKEY_PATH,
  HTTPS_CERTKEY_PATH
} = process.env;
const fs = require("fs");
const https = require("https");
const options = {
  key: fs.readFileSync(path.join(__dirname, `/../keys/${HTTPS_PRIVKEY_PATH}`)),
  cert: fs.readFileSync(path.join(__dirname, `/../keys/${HTTPS_CERTKEY_PATH}`))
};

const mongoose = require("mongoose");

mongoose
  .connect(ACCOUNTS_MONGO_URL, {
    useNewUrlParser: true,
    useFindAndModify: true,
    useUnifiedTopology: true
  })
  .then(() => {
    console.log("Accounts mongoDB is connected");
  })
  .catch(() => {
    console.log("Accounts mongoDB connection fail");
  });

const express = require("express");
const server = express();
const favicon = require("express-favicon");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const apiGateway = require("./ApiGateway");
const authRouter = require("./routes/auth");
const apiRouter = require("./routes/api")(apiGateway);
const setResponseKey = require("./middleware/api/set-res-key")(apiGateway);
const gatewayLogger = require("./middleware/middleware-logger")(apiGateway);
const writePacket = require("./middleware/api/write-packet")(apiGateway);

apiGateway.connectToLogService();

server.use(cookieParser());
server.use(express.json());
server.use(cors());
server.use(favicon(path.join(__dirname, "/favicon.ico")));
server.use(setResponseKey);
server.use(gatewayLogger);
server.use("/auth", authRouter);
server.use("/api", apiRouter);
server.use("/api", writePacket);

https.createServer(options, server).listen(GATEWAY_EXPRESS_PORT, async () => {
  connectToAllApps();
});

async function connectToAllApps() {
  const apps = await apiGateway.getAllApps();

  const appNames = apps.map(app => app.name);

  appNames.forEach(appName => {
    makeAppClient(appName);
  });
}

async function makeAppClient(name) {
  try {
    const client = await apiGateway.connectToApp(
      name,
      () => {
        // connect이벤트 함수
        apiGateway.appClientMap[name] = client;
        apiGateway.isConnectMap[name] = true;
        console.log(`${name} service connect`);
      },
      () => {},
      () => {
        apiGateway.isConnectMap[name] = false;
        console.log(`${name} service end`);
      },
      () => {
        apiGateway.isConnectMap[name] = false;
        console.log(`${name} service error`);
      }
    );

    setInterval(() => {
      if (!apiGateway.isConnectMap[name]) {
        console.log(`try connect to ${name}`);

        client.connect();
      }
    }, 2000);

    return client;
  } catch (e) {
    console.error(e);
  }
}
