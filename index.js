const express = require('express')
const app = express()
const cors = require('cors');
const admin = require("firebase-admin");

// env
require('dotenv').config();
const ObjectId = require('mongodb').ObjectId;
// mongoDb
const { MongoClient } = require('mongodb');

// port address
const port = process.env.PORT || 5000;

// firebase token service account
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

// firebase admin app initialize
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

app.use(cors());
app.use(express.json());

// database connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.oh18i.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

// verifyToken function
async function verifyToken(req, res, next) {
    if (req.headers?.authorization?.startsWith('Bearer ')) {
        const token = req.headers.authorization.split(' ')[1];
        try {
            const decodedUser = await admin.auth().verifyIdToken(token);
            req.decodedEmail = decodedUser.email;
        }
        catch {
        }
    }
    next();
}

async function run() {
    try {
        await client.connect();
        // database name
        const database = client.db('watchHut');
        // database collections
        const usersCollection = database.collection('users');
        const watchCollection = database.collection('watches');
        const orderCollection = database.collection('orders');
        const reviewCollection = database.collection('reviews');
        

        // create/add new user 
        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            console.log(result);
            res.json(result);
        });

        // new user created/updated (for google sign-in)
        app.put('/users', async (req, res) => {
            const user = req.body;
            const filter = { email: user.email };
            const options = { upsert: true };
            const updateDoc = { $set: user };
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            res.json(result);
        });

        // make admin 
        app.put('/users/admin', verifyToken, async (req, res) => {
            const user = req.body;
            const requester = req.decodedEmail;
            if (requester) {
                const requesterAccount = await usersCollection.findOne({ email: requester });
                if (requesterAccount.role === 'admin') {
                    const filter = { email: user.email };
                    const updateDoc = { $set: { role: 'admin' } };
                    const result = await usersCollection.updateOne(filter, updateDoc);
                    res.json(result);
                }
            }
            else {
                res.status(403).json({ message: 'you do not have access to make admin' })
            }

        })

        // getting admin user
        app.get('/user/:email', async (req, res) => {
            console.log("admin: ", req.params.email);
            const email = req.params.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            let isAdmin = false;
            if (user?.role === 'admin') {
                isAdmin = true;
            }
            res.json({ admin: isAdmin });
        })

        // create new watch products 
        app.post('/add-watch', async (req, res) => {
            console.log("lakdsjf");

            const watch = req.body;
            const result = await watchCollection.insertOne(watch);
            console.log(result);
            res.json(result);
        });

        // get watch products
        app.get('/watches', async (req, res) => {
            const cursor = watchCollection.find({});
            const watches = await cursor.toArray();
            res.json(watches);
        });

        // GET API for single watch information 
        app.get('/watch/:id', async (req, res) => {
            const id = req.params.id;
            console.log(req);
            const query = { _id: ObjectId(id) };
            const watch = await watchCollection.findOne(query);
            res.send(watch);
        });

        // DELETE API for products delete
        app.delete('/watch/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const query = { _id: ObjectId(id) };
            const result = await watchCollection.deleteOne(query);
            res.json(result);
        })

        // POST API for order watch
        app.post('/order-watch', async (req, res) => {
            const watchOrderData = req.body;
            const order = await orderCollection.insertOne(watchOrderData);
            console.log('load watch with id: ', res);
            res.send(order);
        })

        // GET API for users orders
        app.get('/orders', async (req, res) => {
            const cursor = orderCollection.find({})
            const orders = await cursor.toArray();
            res.send(orders)
    
        })
  
        // DELETE API for users order
        app.delete('/orders/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const query = { _id: ObjectId(id) };
            const result = await orderCollection.deleteOne(query);
            res.json(result);
        })

        // UPDATE  API for order status
        app.put('/update-status/:id', async (req, res) => {
            const id = req.params.id;
            const status = req.body.status;
            const query = { _id: ObjectId(id) }; 
            const options = { upsert: true }; 
    
            const updateDoc = { 
                $set: {
                    status: status
                },
            };
            const result = await orderCollection.updateOne(query, updateDoc, options) 
            res.json(result) 
        });

        // POST API for give a review
        app.post('/review', async (req, res) => {
            const reviewData = req.body;
            const review = await reviewCollection.insertOne(reviewData);
            console.log('load watch with id: ', res);
            res.send(review);
        })

        // GET API for reviews
        app.get('/all-review', async (req, res) => {
            const cursor = reviewCollection.find({})
            const reviews = await cursor.toArray();
            res.send(reviews)
    
        })

        // get all users
        app.get('/all-users', async (req, res) => {
            const cursor = usersCollection.find({});
            const users = await cursor.toArray();
            res.json(users);
        });
    }
    finally {
        // await client.close();
    }
}

run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Hello sp watch hut!')
})

app.listen(port, () => {
    console.log(`listening at ${port}`)
})
