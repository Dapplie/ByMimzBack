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
        console.log('Items fetched:', items);
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
});

const User = mongoose.model('User', userSchema);

// Route to handle sign-up
app.post('/api/signup', async (req, res) => {
    const { fullName, email, location, phoneNumber, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ fullName, email, location, phoneNumber, password: hashedPassword });
        await user.save();
        const token = jwt.sign({ userId: user._id }, 'your_jwt_secret');
        res.status(201).json({ token });
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
        res.json({ token, user: { id: user._id, email: user.email, fullName: user.fullName } });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});




const CartSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  items: [
      {
          productId: { type: String, required: true },
          name: { type: String, required: true },
          price: { type: Number, required: true },
          quantity: { type: Number, required: true, default: 1 }
      }
  ]
});
const Cart = mongoose.model('Cart', CartSchema);


// Add to cart route
app.post('/api/cart', async (req, res) => {
  const { userId, productId, name, price, quantity } = req.body;
  try {
    let cart = await Cart.findOne({ userId });
    if (cart) {
      const itemIndex = cart.items.findIndex(item => item.productId === productId);
      if (itemIndex > -1) {
        let productItem = cart.items[itemIndex];
        productItem.quantity += quantity;
        cart.items[itemIndex] = productItem;
      } else {
        cart.items.push({ productId, name, price, quantity });
      }
      cart = await cart.save();
      return res.status(201).send(cart);
    } else {
      const newCart = await Cart.create({
        userId,
        items: [{ productId, name, price, quantity }]
      });
      return res.status(201).send(newCart);
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong');
  }
});

// View cart route
app.get('/api/cart/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const cart = await Cart.findOne({ userId });
    if (cart) {
      res.json(cart);
    } else {
      res.status(404).send('Cart not found');
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong');
  }
});


app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
