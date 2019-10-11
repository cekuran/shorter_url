"use strict";

var bodyParser = require("body-parser");
var express = require("express");
var mongo = require("mongodb");
var mongoose = require("mongoose");

var cors = require("cors");
var app = express();

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true });

var Schema = mongoose.Schema;

var SchemaUrl = new Schema({
  url: { type: String, required: true },
  short: { type: Number, required: true }
});

var Url = mongoose.model("Url", SchemaUrl);

app.use(bodyParser.urlencoded({ extended: false }));

// Basic Configuration
var port = process.env.PORT || 3000;

/** this project needs a db !! **/

// mongoose.connect(process.env.MONGOLAB_URI);

/** this project needs to parse POST bodies **/
// you should mount the body-parser here

app.post(
  "/api/shorturl/new",
  (req, res, next) => {
    const dns = require("dns");

    var result = /(?<url>(\w+\.)+\w+)/gi.exec(req.body.url);

    if (result == null) {
      res.json({ error: "invalid URL" });
      return;
    }

    dns.lookup(result[0], (err, address, family) => {
      if (address == undefined) {
        res.json({ error: "invalid URL" });
        return;
      }

      next();
      return;
    });
  },
  (req, res, next) => {
    Url.find({ url: req.body.url }, function(err, data) {
      if (err) {
        console.log(err);
        return;
      }

      req.url_found = data[0];
      next();
    });
  },
  (req, res, next) => {
    if (req.url_found != undefined) {
      res.json({ original_url: req.body.url, short_url: req.url_found.short });
      return;
    }

    Url.countDocuments(function(err, c) {
      req.NewIndex = c + 1;
      console.log("Count is " + req.NewIndex);
      next();
    });
  },
  (req, res, next) => {
    var NewUrl = new Url({ url: req.body.url, short: req.NewIndex });

    NewUrl.save(function(err, data) {
      if (err) {
        console.log(err);
        return;
      }

      console.log(data);

      res.json({ original_url: req.body.url, short_url: req.NewIndex });
    });
  }
);

app.use("/public", express.static(process.cwd() + "/public"));

app.get("/", function(req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

// your first API endpoint...
app.get("/api/shorturl/:number", function(req, res) {
  Url.find({ short: req.params.number }, function(err, data) {
    if (err) {
      console.log(err);
      return;
    }

    req.url_found = data[0];
    if (req.url_found != undefined) {
      console.log(req.url_found.url);
      res.redirect(req.url_found.url);
      return;
    } else {
      res.json({ error: "No short url found for given input" });
    }
  });
});

app.listen(port, function() {
  console.log("Node.js listening ...");
});
