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
const devices = require("./csvjson.json");
const brands = require("./brands.json");
const { random } = require("lodash");
const res = require("express/lib/response");
const mongoSanitize = require("express-mongo-sanitize"); // anti-injections

const { redirect, json } = require("express/lib/response");

const app = express();

app.use(express.static("public"));

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

app.use(mongoSanitize());

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
  preferences: [
    {
      brand: String,
      releaseFrom: Number,
      releaseTo: Number,
      storage: String,
      ram: String,
      battery: String,
      cost: Number,
      camera: String,
    },
  ],
});

const deviceSchema = new mongoose.Schema({});

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
  const imageBackground = "../img/blue_material.jpg";
  const image = "../img/motorola.png";
  const vitraLogo = "../img/VITRA_IsotipoFinal.png";
  const googlePlay = "../img/google_play.png";
  const iphonesImg = "../img/iphone_imgs.png";
  res.render("index", {
    background: imageBackground,
    image: image,
    user: req.user,
    googlePlay: googlePlay,
    vitraLogo: vitraLogo,
    iphonesImg: iphonesImg,
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
    const battery_img = "../img/battery.png";
    const ram_img = "../img/ram.png";
    const storage_img = "../img/storage.png";
    res.render("favs", {
      user: req.user,
      item: req.user.saved,
      device: device,
      battery_img: battery_img,
      ram_img: ram_img,
      storage_img: storage_img,
    });
    app.post("/removeItem", function (req, res) {
      const actualDeviceId = req.body.deviceId;
      const currentUser = req.user._id;
      User.updateOne(
        { _id: currentUser },
        { $pull: { saved: { id: actualDeviceId } } },
        function (err) {
          if (err) {
            console.log(err);
          } else {
            console.log("Removed successfully.");
          }
        }
      );
      res.redirect("/favs");
    });
  } else {
    res.redirect("/login");
  }
});

app.get("/preferences", function (req, res) {
  if (req.isAuthenticated()) {
    const brand = brands.RECORDS;
    res.render("preferences", {
      brand: brand,
    });
    app.post("/savePref", function (req, res) {
      const prefBrand = req.body.brand;
      const prefYearFrom = req.body.releaseFrom;
      const prefYearTo = req.body.releaseTo;
      const currentUser = req.user._id;
      User.updateOne(
        { _id: currentUser },
        {
          preferences: {
            brand: prefBrand,
            releaseFrom: prefYearFrom,
            releaseTo: prefYearTo,
          },
        },
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
  } else {
    res.redirect("/login");
  }
});

app.get("/login", function (req, res) {
  res.render("login");
});

let msg = "";

app.get("/register", function (req, res) {
  res.render("register", { msg: msg });
  msg = "";
});

app.get("/app", function (req, res) {
  if (!req.isAuthenticated()) {
    res.redirect("/login");
  }
  msg = "";

  let rn = Math.floor(Math.random() * (devices.RECORDS.length - 0)) + 0;
  let device = devices.RECORDS[rn];
  let sortedDevice;

  //PREFERENCES

  if (req.user.preferences[0]) {
    const prefBrand = req.user.preferences[0].brand;
    const prefReleaseYearFrom = req.user.preferences[0].releaseFrom;
    const prefReleaseYearTo = req.user.preferences[0].releaseTo;

    var allDevices = devices.RECORDS;
    var sortedIds = function (element) {
      if (prefBrand && prefReleaseYearFrom && prefReleaseYearTo) {
        return (
          element.released_at >= prefReleaseYearFrom &&
          element.released_at <= prefReleaseYearTo &&
          element.brand_id == prefBrand
        );
      }

      if (prefBrand) {
        return element.brand_id == prefBrand;
      }

      if (prefReleaseYearFrom) {
        return element.released_at == prefReleaseYearFrom;
      }

      if (prefReleaseYearTo) {
        return element.released_at == prefReleaseYearTo;
      }
    };

    var filter = allDevices.filter(sortedIds);

    //codigo que funcionaba pero ya no :( ------------------

    //const sortedIds = devices.RECORDS.filter(function (entry) {
    //  if (prefBrand && prefReleaseYear) {
    //    return (
    //      entry.brand_id === prefBrand &&
    //      entry.released_at.includes(prefReleaseYear)
    //    );
    //  }

    //  if (prefBrand) {
    //    return entry.brand_id === prefBrand;
    //  }
    //  if (prefReleaseYear) {
    //    return entry.released_at.prefReleaseYear;
    //  }
    //});

    //return (
    //  entry.brand_id === prefBrand &&
    //  entry.released_at.includes(prefReleaseYear)
    //);

    //.map(function (e) {
    //  return e.id;
    //});

    // --------------------------------------------------------

    rn = Math.floor(Math.random() * (filter.length - 0)) + 0;
    sortedDevice = filter[rn];

    console.log(filter.length);

    console.log(prefBrand);
    console.log(prefReleaseYearFrom);
  }

  if (sortedDevice) {
    device = sortedDevice;
  }

  //Battery
  const battery = Number(device.battery_size) / 60;

  //Release year
  const release = device.released_at;
  const releaseYear = release;

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
    res.render("app", {
      device: device,
      battery: battery,
      release: releaseYear,
    });
  } else {
    res.redirect("/login");
  }
});

app.get("/logout", function (req, res) {
  req.logout();
  res.redirect("/");
});

app.post("/register", function (req, res) {
  const password = req.body.password;
  if (password.length < 8 || password.length > 32) {
    console.log("Password too long or too short.");
    msg = "La contraseña debe contener entre 8 a 32 caracteres.";
    res.redirect("/register");
  } else {
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
  }
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

app.get("/admin", function (req, res) {
  if (req.isAuthenticated()) {
    if (req.user.username == "admin@test.com") {
      User.find({}, function (err, users) {
        const device = devices.RECORDS;
        res.render("admin", { users: users, devices: device });
      });
    } else {
      res.redirect("/");
    }
  } else {
    res.redirect("/login");
  }

  app.post("/deleteUser", function (req, res) {
    const userId = req.body.selectedUser;
    console.log(userId);
    User.deleteOne({ _id: userId }, function (err) {
      if (err) {
        console.log(err);
      } else {
        res.redirect("/admin");
      }
    });
  });

  app.post("/removeFav", function (req, res) {
    const itemToRemove = req.body.favId;
    const userId = req.body.editedUser;

    console.log(itemToRemove);
    console.log(userId);
    User.updateOne(
      { _id: userId },
      { $pull: { saved: { _id: itemToRemove } } },
      function (err) {
        if (err) {
          console.log(err);
        } else {
          console.log(itemToRemove + " removed.");
        }
      }
    );
    res.redirect("/admin");
  });
});

let port = process.env.PORT;

if (port == null || port == "") {
  port = 3000;
}

app.listen(port, function () {
  console.log("Server started on port 3000");
});
