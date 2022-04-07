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
const { random } = require("lodash");
const res = require("express/lib/response");

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
  session({
    secret: "Our little secret.",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(
  "mongodb+srv://admin-tomas:admin21123admin@cluster0.elc3e.mongodb.net/myFirstDatabase?retryWrites=true&w=majority",
  { useNewUrlParser: true }
);

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  saved: [
    {
      id: String,
    },
  ],
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());
passport.serializeUser(function (user, done) {
  done(null, user.id);
});
passport.deserializeUser(function (id, done) {
  User.findById(id, function (err, user) {
    done(err, user);
  });
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/app",
      passReqToCallback: true,
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    function (request, accessToken, refreshToken, profile, done) {
      console.log(profile);
      User.findOrCreate({ googleId: profile.id }, function (err, user) {
        return done(err, user);
      });
    }
  )
);

app.get("/", function (req, res) {
  const imageBackground = "../img/blue_blob.jpg";
  const image = "../img/mobiles.png";
  res.render("index", {
    background: imageBackground,
    image: image,
    user: req.user,
  });
});

app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile"] })
);

app.get(
  "/auth/google/app",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function (req, res) {
    // Successful authentication, redirect home.
    res.redirect("/app");
  }
);

app.get("/privacy", function (req, res) {
  res.render("privacy", {
    user: req.user,
  });
});

app.get("/about", function (req, res) {
  res.render("about", {
    user: req.user,
  });
});

app.get("/favs", function (req, res) {
  if (req.isAuthenticated()) {
    const device = devices.RECORDS;
    res.render("favs", {
      user: req.user,
      item: req.user.saved,
      device: device,
    });
  } else {
    res.redirect("/login");
  }
});

app.get("/login", function (req, res) {
  console.log("HELP");
  res.render("login");
});

app.get("/register", function (req, res) {
  res.render("register");
});

app.get("/app", function (req, res) {
  const rn = Math.floor(Math.random() * (devices.RECORDS.length - 0)) + 0;
  const device = devices.RECORDS[rn];

  //Release year
  const release = device.released_at.substring(0, 13);
  const releaseYear = release.replace(/\D/g, ""); // 👉️ '123'

  app.post("/fav", function (req, res) {
    const actualDeviceId = req.body.deviceId;
    const currentUser = req.user._id;
    console.log(devices.RECORDS[actualDeviceId - 1].name + ": device liked.");
    console.log(req.user.username);
    User.updateOne(
      { _id: currentUser },
      { $push: { saved: { id: actualDeviceId - 1 } } },
      function (err) {
        if (err) {
          console.log(err);
        } else {
          console.log("Updated successfully.");
        }
      }
    );

    res.redirect("/app");
  });

  app.post("/next", function (req, res) {
    const actualDeviceId = req.body.deviceId;
    console.log(devices.RECORDS[actualDeviceId - 1].name + ": device skipped.");
    res.redirect("/app");
  });

  if (req.isAuthenticated()) {
    res.render("app", { device: device, release: releaseYear });
  } else {
    res.redirect("/login");
  }
});

app.get("/logout", function (req, res) {
  req.logout();
  res.redirect("/");
});

app.post("/register", function (req, res) {
  User.register(
    { username: req.body.username },
    req.body.password,
    function (err, user) {
      if (err) {
        console.log(err);
        res.redirect("/register");
      } else {
        passport.authenticate("local")(req, res, function () {
          res.redirect("/app");
        });
      }
    }
  );
});

app.post("/login", function (req, res) {
  const user = new User({
    username: req.body.username,
    password: req.body.password,
  });

  req.login(user, function (err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function () {
        res.redirect("/app");
      });
    }
  });
});

let port = process.env.PORT;

if (port == null || port == "") {
  port = 3000;
}

app.listen(port, function () {
  console.log("Server started on port 3000");
});
