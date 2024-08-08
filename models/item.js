const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
    name: String,
    description: String,
    price: Number,
    oldPrice: Number, // New field to store the old price
    type: { type: mongoose.Schema.Types.ObjectId, ref: 'ItemType' }, // Reference to ItemType
    image: String,
    createdAt: { type: Date, default: Date.now }, // Example date field
    onSale: { type: Boolean, default: false },
    saleAt: { type: Date }, // Field to store the date when onSale becomes true
    salePercent: Number,
});

module.exports = mongoose.model('Item', itemSchema);
