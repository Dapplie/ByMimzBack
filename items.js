const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Item = require('./models/item'); // Ensure this path is correct
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');

const app = express();
const port = 3030;

app.use(cors());
app.use(express.json());
app.use(bodyParser.json());

mongoose
  .connect('mongodb+srv://ByMimzCluster:nCnMeF7PDn1T1ubl@cluster0.vvhwpeu.mongodb.net/ByMimz1?retryWrites=true&w=majority&appName=Cluster0', {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => console.log('Database connected successfully.'))
  .catch((err) => console.log('Error while connecting to database:', err));

app.get('/api/items', async (req, res) => {
    console.log('Received request for /api/items');
    try {
        const items = await Item.find();
        // console.log('Items fetched:', items);
        if (items.length === 0) {
            console.log('No items found in the database.');
        }
        res.json(items);
    } catch (err) {
        console.error('Error fetching items:', err);
        res.status(500).json({ message: err.message });
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




// Routes
app.post('/api/items', async (req, res) => {
  try {
    const newItem = new Item(req.body);
    await newItem.save();
    res.status(201).json(newItem);
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






// Sign-in route
app.post('/api/signin', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: 'Invalid email or password.' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid email or password.' });

        const token = jwt.sign({ id: user._id }, 'your_jwt_secret', { expiresIn: '1h' });
        res.json({ token, userId: user._id });
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

// Get user's cart
app.get('/api/cart', authenticate, async (req, res) => {
  try {
    const cart = await CartModel.findOne({ userId: req.userId })
      .populate({
        path: 'items.itemId',
        select: 'name price' // Only fetch name and price
      });

    if (!cart) return res.status(404).json({ message: 'Cart not found' });

    // Transform cart items to include item details
    const cartItems = cart.items.map(item => ({
      ...item.toObject(),
      item: item.itemId // Add item details
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







app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
