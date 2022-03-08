//jshint esversion:6

const express = require("express");
const bodyParser = require("body-parser");
const https = require("https");
const devices = require("./devices.json");
const mongoose = require("mongoose");
const _ = require("lodash");

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));

app.set("view engine", "ejs");

mongoose.connect(
  "mongodb+srv://admin-tomas:admin21123admin@cluster0.elc3e.mongodb.net/myFirstDatabase?retryWrites=true&w=majority",
  { useNewUrlParser: true }
);

app.get("/", function (req, res) {
  console.log(devices.RECORDS.length);
  const deviceOne = devices.RECORDS[1].name;
  const theRandom = Math.floor(Math.random() * (10633 - 1)) + 1;
  const randomImg = devices.RECORDS[theRandom].picture;
  const randomDevice = devices.RECORDS[theRandom].name;
  res.write("<h1>Random device: " + randomDevice + "</h1>");
  res.write("<img src='" + randomImg + "'></img>");
  //res.write("<h2>Name of this device is: " + deviceOne + "</h2>");
  res.send();
  //res.sendFile(__dirname + "/index.html");
});

app.post("/index.html", function (req, res) {
  console.log(req.body);
  res.send("Thanks for sending that.");
});

app.listen(process.env.PORT || 3000, function () {
  console.log("Server started on port 3000");
});
