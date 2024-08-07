const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Item = require('./models/item'); 
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
// const process = require('./process.env');
require('dotenv').config();

const app = express();
const port = 3030;

app.use(cors());
app.use(express.json());
app.use(bodyParser.json());

//To connect to database
mongoose
  .connect('mongodb+srv://ByMimzCluster:nCnMeF7PDn1T1ubl@cluster0.vvhwpeu.mongodb.net/ByMimz1?retryWrites=true&w=majority&appName=Cluster0', {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => console.log('Database connected successfully.'))
  .catch((err) => console.log('Error while connecting to database:', err));




// Set up storage engine for multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Serve static files from the 'uploads' directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));




// Retrieve full items from the database in latest first order
app.get('/api/items', async (req, res) => {
  console.log('Received request for /api/items');
  try {
    const items = await Item.find().populate('type').sort({ createdAt: -1 }); // Sort by createdAt in descending order
    if (items.length === 0) {
      console.log('No items found in the database.');
    }
    res.json(items);
  } catch (err) {
    console.error('Error fetching items:', err);
    res.status(500).json({ message: err.message });
  }
});


// Route to add item with image upload
app.post('/api/items', upload.single('image'), async (req, res) => {
  try {
    const image = req.file ? req.file.path : ''; // Get the file path
    const itemType = req.body.type; // Assume type is passed as an ObjectId
    
    // Ensure the itemType exists
    const typeExists = await ItemType.findById(itemType);
    if (!typeExists) {
      return res.status(400).json({ message: 'Invalid item type' });
    }

    const newItem = new Item({
      name: req.body.name,
      description: req.body.description,
      price: req.body.price,
      type: itemType,
      image: image
    });

    await newItem.save();
    res.status(201).json(newItem);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});



// Route to delete an item by ID
app.delete('/api/items/:id', async (req, res) => {
    try {
      const result = await Item.findByIdAndDelete(req.params.id);
      if (!result) {
        return res.status(404).json({ message: 'Item not found' });
      }
      res.status(200).json({ message: 'Item deleted successfully' });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  });




// Route to add item
app.post('/api/items', async (req, res) => {
  try {
    const newItem = new Item(req.body);
    await newItem.save();
    res.status(201).json(newItem);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Route to update an item's price and set onSale to true
app.put('/api/items/:id', async (req, res) => {
  try {
      const updateFields = { price: req.body.price };

      // If onSale is being set to true, set saleAt to the current date and time
      if (req.body.onSale === true) {
          updateFields.onSale = true;
          updateFields.saleAt = new Date();
      }

      const item = await Item.findByIdAndUpdate(
          req.params.id,
          updateFields,
          { new: true } // Return the updated document
      );

      if (!item) {
          return res.status(404).json({ message: 'Item not found' });
      }
      res.status(200).json(item);
  } catch (err) {
      res.status(500).json({ message: err.message });
  }
});



const itemTypeSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
});

module.exports = mongoose.model('ItemType', itemTypeSchema);
const ItemType = mongoose.model('ItemType', itemTypeSchema);

app.post('/api/item-types', async (req, res) => {
  try {
    const newItemType = new ItemType(req.body);
    await newItemType.save();
    res.status(201).json(newItemType);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


app.get('/api/item-types', async (req, res) => {
  try {
    const itemTypes = await ItemType.find();
    res.json(itemTypes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});










// User schema and model
const userSchema = new mongoose.Schema({
    fullName: String,
    email: { type: String, unique: true },
    location: String,
    phoneNumber: String,
    password: String,
    type: { type: String, default: 'user' }
});

const User = mongoose.model('User', userSchema);




// Middleware for authentication
const authenticate = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  
  if (!token) return res.status(401).json({ message: 'No token provided' });

  jwt.verify(token, 'your_jwt_secret', (err, decoded) => {
      if (err) return res.status(403).json({ message: 'Failed to authenticate token' });
      
      req.userId = decoded.id;
      next();
  });
};



// // Route to handle sign-up
app.post('/api/signup', async (req, res) => {
  const { fullName, email, location, phoneNumber, password } = req.body;
  try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = new User({ fullName, email, location, phoneNumber, password: hashedPassword });
      await user.save();
      const token = jwt.sign({ userId: user._id }, 'your_jwt_secret');
      res.status(201).json({ token, userId: user._id });
  } catch (err) {
      console.error('Error creating user:', err);
      res.status(500).json({ message: 'Error creating user' });
  }
});






// // Sign-in route

app.post('/api/signin', async (req, res) => {
  try {
      const { email, password } = req.body;
      const user = await User.findOne({ email });
      if (!user) return res.status(400).json({ message: 'Invalid email or password.' });

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(400).json({ message: 'Invalid email or password.' });

      const token = jwt.sign({ id: user._id }, 'your_jwt_secret', { expiresIn: '1h' });
      res.json({ token, userId: user._id, type: user.type });
  } catch (err) {
      res.status(500).json({ message: err.message });
  }
});





// Route to fetch user info
app.get('/api/user', authenticate, async (req, res) => {
  try {
      const user = await User.findById(req.userId).select('-password'); // Exclude password
      if (!user) return res.status(404).json({ message: 'User not found' });
      res.json(user);
  } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
  }
});





//to get one item by its id
app.get('/api/items/:id', async (req, res) => {
  try {
    const itemId = req.params.id;
    const item = await Item.findById(itemId);

    if (item) {
      res.json(item);
    } else {
      res.status(404).json({ message: 'Item not found' });
    }
  } catch (error) {
    console.error('Error fetching item:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});




// Cart Model
// Define Cart model inline
const cartItemSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [
    {
      itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
      quantity: { type: Number, required: true, default: 1 }
    }
  ]
});

const CartModel = mongoose.model('Cart', cartItemSchema);

// Add item to cart
app.post('/api/cart', authenticate, async (req, res) => {
  const { itemId, quantity } = req.body;
  try {
    let cart = await CartModel.findOne({ userId: req.userId });

    if (!cart) {
      cart = new CartModel({ userId: req.userId, items: [{ itemId, quantity }] });
    } else {
      const itemIndex = cart.items.findIndex(item => item.itemId.equals(itemId));
      if (itemIndex > -1) {
        cart.items[itemIndex].quantity += quantity;
      } else {
        cart.items.push({ itemId, quantity });
      }
    }
    
    await cart.save();
    res.status(200).json(cart);
  } catch (err) {
    console.error('Error adding item to cart:', err); // Log error
    res.status(500).json({ message: err.message });
  }
});

// Get user's cart to view cart by user
app.get('/api/cart', authenticate, async (req, res) => {
  try {
    const cart = await CartModel.findOne({ userId: req.userId })
      .populate({
        path: 'items.itemId',
        select: 'name price image' // Fetch name, price, and image
      });

    if (!cart) return res.status(404).json({ message: 'Cart not found' });

    // Transform cart items to include item details
    const cartItems = cart.items.map(item => ({
      ...item.toObject(),
      item: {
        ...item.itemId.toObject(),
        image: `${req.protocol}://${req.get('host')}/${item.itemId.image}` // Construct the full URL for the image
      }
    }));

    res.json({ ...cart.toObject(), items: cartItems });
  } catch (err) {
    console.error('Error fetching cart:', err); // Log error
    res.status(500).json({ message: err.message });
  }
});


// Remove item from cart
app.delete('/api/cart', authenticate, async (req, res) => {
  const { itemId } = req.body;
  try {
    let cart = await CartModel.findOne({ userId: req.userId });

    if (!cart) return res.status(404).json({ message: 'Cart not found' });

    cart.items = cart.items.filter(item => !item.itemId.equals(itemId));

    await cart.save();
    res.status(200).json(cart);
  } catch (err) {
    console.error('Error removing item from cart:', err); // Log error
    res.status(500).json({ message: err.message });
  }
});






const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'yahoo', // or another email service
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendOrderEmail = (user, order, adminEmail) => {
  const itemsList = order.items.map(item => 
    `<li>${item.itemId.name}: $${item.itemId.price} (Quantity: ${item.quantity})</li>`
  ).join('');

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: adminEmail,
    subject: 'New Order Received',
    html: `
      <h1>New Order</h1>
      <p>Dear Admin,</p>
      <p>A new order has been placed.</p>
      <p>Order details:</p>
      <p><strong>User Information:</strong></p>
      <p>Name: ${user.fullName}</p>
      <p>Email: ${user.email}</p>
      <p>Phone: ${user.phoneNumber}</p>
      <p><strong>Items:</strong></p>
      <ul>${itemsList}</ul>
      <p>Total items: ${order.items.length}</p>
      <p>Best regards,</p>
      <p>Your Company</p>
    `
  };

  return transporter.sendMail(mailOptions);
};

module.exports = { sendOrderEmail };







// Orders Model 

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [
    {
      itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
      quantity: { type: Number, required: true, default: 1 }
    }
  ],
  orderDate: { type: Date, default: Date.now }
});

const OrderModel = mongoose.model('Order', orderSchema);

app.post('/api/checkout', authenticate, async (req, res) => {
  try {
    // Fetch and populate cart items
    const cart = await CartModel.findOne({ userId: req.userId }).populate('items.itemId');

    if (!cart) return res.status(404).json({ message: 'Cart not found' });

    // Create new order
    const newOrder = new OrderModel({
      userId: req.userId,
      items: cart.items
    });
    await newOrder.save();

    // Empty the cart
    cart.items = [];
    await cart.save();

    // Get user information
    const user = await User.findById(req.userId).select('fullName email phoneNumber');

    if (user) {
      // Send email to user
      await sendOrderEmail(user, newOrder, process.env.ADMIN_EMAIL);
    }

    res.status(200).json({ message: 'Order created and cart emptied', order: newOrder });
  } catch (err) {
    console.error('Error during checkout:', err); // Log error
    res.status(500).json({ message: err.message });
  }
});




// Get all orders
app.get('/api/orders', authenticate, async (req, res) => {
  try {
    const orders = await OrderModel.find()
      .populate({
        path: 'items.itemId',
        select: 'name price' // Only fetch name and price
      })
      .populate('userId', 'fullName email phoneNumber'); // Populate user information

    res.status(200).json(orders);
  } catch (err) {
    console.error('Error fetching orders:', err); // Log error
    res.status(500).json({ message: err.message });
  }
});

// Delete order
app.delete('/api/orders/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    const order = await OrderModel.findByIdAndDelete(id);

    if (!order) return res.status(404).json({ message: 'Order not found' });

    res.status(200).json({ message: 'Order deleted', order });
  } catch (err) {
    console.error('Error deleting order:', err); // Log error
    res.status(500).json({ message: err.message });
  }
});


















// Favorite model
const favoriteItemSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [
    {
      itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
      quantity: { type: Number, required: true, default: 1 }
    }
  ]
});

const FavoriteModel = mongoose.model('Favorite', favoriteItemSchema);

// Add item to favorite
app.post('/api/favorite', authenticate, async (req, res) => {
  const { itemId, quantity } = req.body;
  try {
    let favorite = await FavoriteModel.findOne({ userId: req.userId });

    if (!favorite) {
      favorite = new FavoriteModel({ userId: req.userId, items: [{ itemId, quantity }] });
    } else {
      const itemIndex = favorite.items.findIndex(item => item.itemId.equals(itemId));
      if (itemIndex > -1) {
        favorite.items[itemIndex].quantity += quantity;
      } else {
        favorite.items.push({ itemId, quantity });
      }
    }
    
    await favorite.save();
    res.status(200).json(favorite);
  } catch (err) {
    console.error('Error adding item to favorite:', err); // Log error
    res.status(500).json({ message: err.message });
  }
});

// Get user's favorite
app.get('/api/favorite', authenticate, async (req, res) => {
  try {
    const favorite = await FavoriteModel.findOne({ userId: req.userId })
      .populate({
        path: 'items.itemId',
        select: 'name price' // Only fetch name and price
      });

    if (!favorite) return res.status(404).json({ message: 'Favorite not found' });

    // Transform favorite items to include item details
    const favoriteItems = favorite.items.map(item => ({
      ...item.toObject(),
      item: item.itemId // Add item details
    }));

    res.json({ ...favorite.toObject(), items: favoriteItems });
  } catch (err) {
    console.error('Error fetching favorite:', err); // Log error
    res.status(500).json({ message: err.message });
  }
});

// Remove item from favorite
app.delete('/api/favorite', authenticate, async (req, res) => {
  const { itemId } = req.body;
  try {
    let favorite = await FavoriteModel.findOne({ userId: req.userId });

    if (!favorite) return res.status(404).json({ message: 'Favorite not found' });

    favorite.items = favorite.items.filter(item => !item.itemId.equals(itemId));

    await favorite.save();
    res.status(200).json(favorite);
  } catch (err) {
    console.error('Error removing item from favorite:', err); // Log error
    res.status(500).json({ message: err.message });
  }
});









app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
