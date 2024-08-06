const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
    name: String,
    description: String,
    price: Number,
    type: String,
    image: String,
    createdAt: { type: Date, default: Date.now }, // Example date field
    onSale: { type: Boolean, default: false },
    saleAt: { type: Date }, // Field to store the date when onSale becomes true
});

module.exports = mongoose.model('Item', itemSchema);
