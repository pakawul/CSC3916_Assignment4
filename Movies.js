var mongoose = require('mongoose');
var Schema = mongoose.Schema;

mongoose.connect(process.env.DB);

var MovieSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    releaseDate: {
        type: Number,
        required: true
    },
    genre: {
        type: String,
        required: true
    },
    actors: {
        type: [String],
        required: true
    }
});

module.exports = mongoose.model('Movie', MovieSchema);