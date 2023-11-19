#!/usr/bin/env node

const express = require("express");
const bodyParser = require("body-parser");
const cyclicDB = require("@cyclic.sh/dynamodb");
const crypto = require("crypto");

const app = express();
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

app.use(bodyParser.text());

app.get("/:key", async (req, res) => {
  const data = await find(req.params.key);
  const content = data ? data.props.content : null;

  if (!content) {
    res.sendStatus(404);
  } else if (isURL(content)) {
    res.redirect(content);
  } else {
    res.send(content);
  }
});

app.post("/", async (req, res) => {
  const key = await create(req.body);
  res.send(key);
});

app.listen(3000);
