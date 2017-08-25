var express = require('express');
var router = express.Router();
var mongodb = require('mongodb');
var config = require('../config');
var validUrl = require('valid-url');
var shortid = require('shortid');
// removes underscores and dashes from possible characterlist
shortid.characters('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ$@');

var MongoClient = mongodb.MongoClient
var mLab = 'mongodb://' + config.db.host + '/' + config.db.name;

// Home page
router.get('/', function (req, res, next) {
  var local = req.get('host');
  res.render('index', {host: local });
});

// url/new/something
// The * works to make sure the code doesn't confuse the slashes in the url with a new parameter
router.get('/new/:url(*)', function (req, res, next) {
	
  //Connecting to our MongoDB database
  MongoClient.connect(mLab, function (err, db) {
    if (err) {
      console.log("Unable to connect to server", err);
    } else {
      console.log("Connected to server")

      var collection = db.collection('links');
	  //Gets the :url(*) part of the URL
      var params = req.params.url;

      //Sets current hostname to var local
      var local = req.get('host') + "/";

      var newLink = function (db, callback) {
        collection.findOne(
			// looks into the 'links' collection and finds one document that has a URL that matches the url given, and returns the shortened version
			{ "url": params }, 
			{ short: 1, _id: 0 }, 
		  function (err, doc) {
			if (doc != null) {
				// Returns a JSON of the original URL and short URL if it can find the URL in the database
				res.json({ 
					original_url: params, short_url: local + doc.short 
				});
			} else {
				// If the URL is not in the database
				if (validUrl.isUri(params)) {
					// if URL is valid, create a shortened ID and insert into the collection a new  JSON and return it to the user.
					var shortCode = shortid.generate();
					var newUrl = { 
						url: params, short: shortCode 
					};
					collection.insert([newUrl]);
					res.json({ 
						original_url: params, short_url: local + shortCode
					});
				} else {
					// if URL is invalid, tell the user.
					res.json({ error: "Wrong url format, make sure you have a valid protocol and real site." });
				};
			};
			});
		};
		// Close out the database after finishing the function.
      newLink(db, function () {
        db.close();
      });

    };
  });

});

router.get('/:short', function (req, res, next) {

  MongoClient.connect(mLab, function (err, db) {
    if (err) {
      console.log("Unable to connect to server", err);
    } else {
      console.log("Connected to server")

      var collection = db.collection('links');
      var params = req.params.short;

      var findLink = function (db, callback) {
		 // Find a document in 'links' with the same shortened URL as one in the database and return the proper URL
        collection.findOne({
			"short": params 
		}, 
		{ 
			url: 1, _id: 0 
		}, 
		function (err, doc) {
          if (doc != null) {
			  // If there is a URL in the database, redirect the user to it
            res.redirect(doc.url);
          } else {
			  // If not, tell the user
            res.json({ error: "No corresponding shortlink found in the database." });
          };
        });
      };
		// close the MongoDB database
      findLink(db, function () {
        db.close();
      });

    };
  });
});

module.exports = router;