/*
CSC3916 HW4
File: Server.js
Description: Web API for Movie API with Reviews
*/

var express = require('express');
var bodyParser = require('body-parser');
var passport = require('passport');
var jwt = require('jsonwebtoken');
var cors = require('cors');
var mongoose = require('mongoose');

var authController = require('./auth');
var authJwtController = require('./auth_jwt');

var User = require('./Users');
var Movie = require('./Movies');
var Review = require('./Reviews');

var app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(passport.initialize());

var router = express.Router();

async function trackReviewAnalytics({
    eventName,
    movieName,
    genre,
    actionPath,
    eventLabel,
    requestedCount
}) {
    try {
        if (!process.env.GA4_MEASUREMENT_ID || !process.env.GA4_API_SECRET) {
            return;
        }

        const url =
            `https://www.google-analytics.com/mp/collect?measurement_id=${process.env.GA4_MEASUREMENT_ID}&api_secret=${process.env.GA4_API_SECRET}`;

        const payload = {
            client_id: "movie-api-server",
            events: [
                {
                    name: eventName,
                    params: {
                        movie_name: movieName || "",
                        genre: genre || "",
                        action_path: actionPath || "",
                        event_label: eventLabel || "",
                        requested_count: requestedCount || 1
                    }
                }
            ]
        };

        await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });
    } catch (err) {
        console.log("GA4 tracking error:", err.message);
    }
}

/*
AUTH ROUTES
*/

router.post('/signup', function(req, res) {
    if (!req.body.username || !req.body.password) {
        return res.json({
            success: false,
            msg: 'Please include both username and password to signup.'
        });
    }

    var user = new User();
    user.name = req.body.name;
    user.username = req.body.username;
    user.password = req.body.password;

    user.save(function(err) {
        if (err) {
            if (err.code == 11000) {
                return res.json({
                    success: false,
                    message: 'A user with that username already exists.'
                });
            } else {
                return res.status(500).json(err);
            }
        }

        return res.json({
            success: true,
            msg: 'Successfully created new user.'
        });
    });
});

router.post('/signin', function(req, res) {
    var userNew = new User();
    userNew.username = req.body.username;
    userNew.password = req.body.password;

    User.findOne({ username: userNew.username })
        .select('name username password')
        .exec(function(err, user) {
            if (err) {
                return res.status(500).send(err);
            }

            if (!user) {
                return res.status(401).json({
                    success: false,
                    msg: 'Authentication failed. User not found.'
                });
            }

            user.comparePassword(userNew.password, function(isMatch) {
                if (isMatch) {
                    var userToken = {
                        id: user._id,
                        username: user.username
                    };

                    var token = jwt.sign(userToken, process.env.SECRET_KEY);

                    return res.json({
                        success: true,
                        token: 'JWT ' + token
                    });
                } else {
                    return res.status(401).json({
                        success: false,
                        msg: 'Authentication failed.'
                    });
                }
            });
        });
});

/*
MOVIE ROUTES
*/

// GET all movies
router.get('/movies', function(req, res) {
    Movie.find({}, function(err, movies) {
        if (err) {
            return res.status(500).json({ err: err.message });
        }
        return res.json(movies);
    });
});

// GET movie by id
// If ?reviews=true is passed, include movie + reviews
router.get('/movies/:id', async function(req, res) {
    try {
        var id = req.params.id;
        var includeReviews = req.query.reviews === 'true';

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(404).json({ message: 'Movie not found' });
        }

        if (!includeReviews) {
            var movie = await Movie.findById(id);

            if (!movie) {
                return res.status(404).json({ message: 'Movie not found' });
            }

            return res.json(movie);
        }

        var results = await Movie.aggregate([
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(id)
                }
            },
            {
                $lookup: {
                    from: 'reviews',
                    localField: '_id',
                    foreignField: 'movieId',
                    as: 'reviews'
                }
            }
        ]);

        if (!results || results.length === 0) {
            return res.status(404).json({ message: 'Movie not found' });
        }

        return res.json(results[0]);
    } catch (err) {
        return res.status(500).json({ err: err.message });
    }
});

// POST movie
router.post('/movies', authJwtController.isAuthenticated, function(req, res) {
    if (!req.body.title || !req.body.releaseDate || !req.body.genre || !req.body.actors) {
        return res.status(400).json({ message: 'Missing movie information' });
    }

    var movie = new Movie({
        title: req.body.title,
        releaseDate: req.body.releaseDate,
        genre: req.body.genre,
        actors: req.body.actors
    });

    movie.save(function(err, savedMovie) {
        if (err) {
            return res.status(400).json({ err: err.message });
        }
        return res.status(201).json(savedMovie);
    });
});

// PUT movie by id
router.put('/movies/:id', authJwtController.isAuthenticated, function(req, res) {
    if (!req.body.title || !req.body.releaseDate || !req.body.genre || !req.body.actors) {
        return res.status(400).json({ message: 'Missing movie information' });
    }

    Movie.findByIdAndUpdate(
        req.params.id,
        {
            title: req.body.title,
            releaseDate: req.body.releaseDate,
            genre: req.body.genre,
            actors: req.body.actors
        },
        { new: true, runValidators: true },
        function(err, updatedMovie) {
            if (err) {
                return res.status(400).json({ err: err.message });
            }

            if (!updatedMovie) {
                return res.status(404).json({ message: 'Movie not found' });
            }

            return res.json(updatedMovie);
        }
    );
});

// DELETE movie by id
router.delete('/movies/:id', authController.isAuthenticated, function(req, res) {
    Movie.findByIdAndDelete(req.params.id, function(err, deletedMovie) {
        if (err) {
            return res.status(500).json({ err: err.message });
        }

        if (!deletedMovie) {
            return res.status(404).json({ message: 'Movie not found' });
        }

        return res.json({ message: 'Movie successfully deleted' });
    });
});

/*
REVIEW ROUTES
*/

// GET all reviews for a movie by id
router.get('/reviews/:id', async function(req, res) {
    try {
        var id = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(404).json({ message: 'Movie not found' });
        }

        var movie = await Movie.findById(id);
        if (!movie) {
            return res.status(404).json({ message: 'Movie not found' });
        }

        var reviews = await Review.find({ movieId: movie._id });
        return res.json(reviews);
    } catch (err) {
        return res.status(500).json({ err: err.message });
    }
});

// POST review
router.post('/reviews', authJwtController.isAuthenticated, async function(req, res) {
    try {
        var movieTitle = req.body.title;
        var reviewText = req.body.review;
        var rating = req.body.rating;

        if (!movieTitle || !reviewText || rating === undefined) {
            return res.status(400).json({ message: 'Missing review information' });
        }

        var movie = await Movie.findOne({ title: movieTitle });
        if (!movie) {
            return res.status(404).json({ message: 'Movie not found' });
        }

        var review = new Review({
            movieId: movie._id,
            username: req.user.username,
            review: reviewText,
            rating: rating
        });

        await review.save();
        return res.status(201).json({ message: 'Review created!' });
    } catch (err) {
        return res.status(400).json({ err: err.message });
    }
});

// optional delete review by movie id for logged-in user
router.delete('/reviews/:id', authJwtController.isAuthenticated, async function(req, res) {
    try {
        var id = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(404).json({ message: 'Review not found' });
        }

        var deletedReview = await Review.findOneAndDelete({
            _id: id,
            username: req.user.username
        });

        if (!deletedReview) {
            return res.status(404).json({ message: 'Review not found' });
        }

        return res.json({ message: 'Review deleted' });
    } catch (err) {
        return res.status(500).json({ err: err.message });
    }
});

app.use('/', router);
app.listen(process.env.PORT || 8080);
module.exports = app;