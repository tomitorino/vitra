//jshint esversion:6

require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");
const devices = require("./devices.json");

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));

app.set("view engine", "ejs");

mongoose.connect(
  "mongodb+srv://admin-tomas:admin21123admin@cluster0.elc3e.mongodb.net/myFirstDatabase?retryWrites=true&w=majority",
  { useNewUrlParser: true }
);

app.get("/", function (req, res) {
  res.render("index");
});

app.get("/privacy", function (req, res) {
  res.render("privacy");
});

app.get("/about", function (req, res) {
  res.render("about");
});

/*
app.post("/index.html", function (req, res) {
  console.log(req.body);
  res.send("Thanks for sending that.");
});
*/

let port = process.env.PORT;

if (port == null || port == "") {
  port = 3000;
}

app.listen(port, function () {
  console.log("Server started on port 3000");
});
