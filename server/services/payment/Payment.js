const App = require("../../lib/tcp/App");
const mongoose = require("mongoose");
const { PAYMENTS_MONGO_URL } = process.env;
const queryMap = require("./queries");

mongoose
  .connect(PAYMENTS_MONGO_URL, {
    useNewUrlParser: true,
    useFindAndModify: false,
    useUnifiedTopology: true
  })
  .then(() => {
    console.log("Payment mongoDB is connected");
  })
  .catch(e => {
    console.error("Payment mongoDB connection fail");
    console.error(e);
  });

async function doJob(socket, data) {
  const { nextQuery, params } = data;
  let headers;
  let body;

  try {
    let result = await queryMap[nextQuery](params);

    headers = result.headers;
    body = result.body;
  } catch (e) {
    headers = {
      method: "ERROR",
      curQuery: nextQuery,
      nextQuery: "gateway",
      endQuery: nextQuery,
      params: {}
    };
    body = e;
  } finally {
    const replyData = {
      ...data,
      ...headers,
      body,
      info: this.context
    };
    let appClient = {};

    if (replyData.nextQuery === "addReservation")
      appClient = this.appClients.reservation;

    this.send(appClient, replyData);
  }
}

class Payment extends App {
  constructor(name, host, port) {
    super(name, host, port, doJob);
  }
}

module.exports = Payment;
