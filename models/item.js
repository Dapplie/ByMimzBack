const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
    name: String,
    description: String,
    price: Number,
    type: String,
    image: String,
});

module.exports = mongoose.model('Item', itemSchema);
