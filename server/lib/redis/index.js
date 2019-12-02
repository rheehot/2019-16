const redis = require("redis");
const client = redis.createClient(6379, "106.10.57.60");
// const client = redis.createClient();
const multi = client.multi();

function returnRedisPromise(command, ...params) {

  return new Promise((res, rej) => {
    client[command](...params, (err, reply) => {
      if (err) rej(err);
      res(reply);
    })
  })
}

exports.setAppbyKey = async (key, { name, host, port }) => {

  const isAlreadyExist = await returnRedisPromise("exists", `name:${name}`);


  if (isAlreadyExist === 0) {
    client.set(`name:${name}`, key);
    return returnRedisPromise("hmset", key, "name", name, "host", host, "port", port);
  }
  return new Promise(res => {
    res(0);
  })
};

exports.deletebyKey = async (key) => {
  const app = await this.getAppbyKey(key);

  client.del(`name:${app.name}`);
  return returnRedisPromise("del", key);
};

exports.updatdAppbyKey = (key, { name, host, port }) => {
  return returnRedisPromise("hmset", key, "name", name, "host", host, "port", port);
};

exports.getAppbyKey = (key) => {
  return returnRedisPromise("hgetall", key);
};

exports.getAppbyName = async (name) => {

  const key = await returnRedisPromise("get", `name:${name}`);

  return this.getAppbyKey(key);

}

exports.getAllApps = async () => {

  const keys = await returnRedisPromise("keys", "*name*");
  const apps = keys.reduce(async (promise, appKey) => {
    let appList = await promise.then();
    const key = await returnRedisPromise("get", appKey);
    const app = await returnRedisPromise("hgetall", key);

    appList.push(app);
    return Promise.resolve(appList);
  }, Promise.resolve([]))

  return apps;
};

exports.pushStudyGroups = (...studyGroups) => {

  studyGroups.forEach(studygourp => {

    multi.rpush("studygroup", JSON.stringify(studygourp));
  })
  return new Promise((res, rej) => {
    multi.exec_atomic((err, reply) => {
      if (err) rej(err);
      res(reply);
    });
  })
}

exports.popStudyGroups = async (count) => {

  const groups = await returnRedisPromise("lrange", "studygroup", 0, count - 1);

  if (groups.length === 0) {
    return new Promise((res) => {
      res([]);
    })
  }

  returnRedisPromise("ltrim", "studygroup", count - 1, -1);
  return new Promise((res) => {
    res(JSON.parse(groups[0]));
  })

}

exports.getStudyGroupsLength = async () => {
  return returnRedisPromise("llen", "studygroup");
}