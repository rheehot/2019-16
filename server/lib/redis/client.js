const redis = require("redis");
const client = redis.createClient(6379, "106.10.57.60");
//const client = redis.createClient();
const multi = client.multi();

module.exports = { client, multi };