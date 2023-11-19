#!/usr/bin/env node

const cyclicDB = require("@cyclic.sh/dynamodb");
const crypto = require("crypto");
const { createServer } = require("http");

const db = cyclicDB(process.env.CYCLIC_DB);
const COLLECTION = "content";

const find = async (code) => {
  const item = await db.collection(COLLECTION).get(code);
  return item;
};

const getCode = async () => {
  do {
    code = crypto.randomBytes(2).toString("hex");
    content = await find(code);
  } while (content != null);
  return code;
};

const isURL = (content) => {
  try {
    const url = new URL(content);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const create = async (content) => {
  const code = await getCode();
  const data = {
    content,
    ttl: Math.floor(Date.now() / 1000) + 3600 * 72,
  };
  await db.collection(COLLECTION).set(code, data);
  return code;
};

const ok = (res, content) => {
  res.writeHead(200);
  res.write(content);
  res.end();
};

const notFound = (res) => {
  res.writeHead(404);
  res.write("Not Found!");
  res.end();
};

const redirect = (res, to) => {
  res.writeHead(307, {
    Location: to,
  });
  res.end();
};

createServer(async (req, res) => {
  const { pathname } = new URL(req.url, "http://127.0.0.1/");

  if (pathname === "/") {
    ok(res, "Hi!");
  } else if (pathname.startsWith("/=")) {
    const key = await create(pathname.substring(2));
    ok(res, key);
  } else {
    const data = await find(pathname.substring(1));
    const content = data ? data.props.content : null;

    if (!content) {
      notFound(res);
    } else if (isURL(content)) {
      redirect(res, content);
    } else {
      ok(res, content);
    }
  }
}).listen(3000);
