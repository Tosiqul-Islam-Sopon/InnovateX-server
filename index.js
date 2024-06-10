const express = require('express');
const cors = require('cors');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const app = express();
const port = process.env.PORT || 5000;


app.use(express.json());
app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://innovatex-5b8ae.web.app/",
    "https://innovatex-5b8ae.firebaseapp.com/",
  ]
}));



// console.log(process.env.DB_USER, process.env.DB_PASS);

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.nnvexxr.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    const database = client.db("InnovateX");
    const userCollection = database.collection("users");
    const productCollection = database.collection("Products");
    const reviewCollection = database.collection("Reviews");
    const reportCollection = database.collection("Reports");
    const couponCollection = database.collection("Coupons");
    const paymentCollection = database.collection("payments");



    // Jwt apis
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.TOKEN_SECRET, {
        expiresIn: '1h'
      });
      res.send({ token })
    });


    // middlewares
    const verifyToken = (req, res, next) => {
      const token = req.headers.authorization;
      // console.log("inside verify->", token);
      if (!token) {
        return res.status(401).send({ message: "forbidden access" });
      }
      jwt.verify(token, process.env.TOKEN_SECRET, (error, decoded) => {
        if (error) {
          return res.status(401).send({ message: "forbidden access" });
        }

        req.decoded = decoded;
        next();
      })
    }

    const verifyModarator = async (req, res, next) =>{
      const email = req.decoded.email;
      const query = {email: email};
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === "modarator";
      if (!isAdmin){
        return res.status(403).send({message: "forbidden access"});
      }
      next();
    }


    const verifyAdmin = async (req, res, next) =>{
      const email = req.decoded.email;
      const query = {email: email};
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin){
        return res.status(403).send({message: "forbidden access"});
      }
      next();
    }

    // User apis
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "user already exist" });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.get("/users",  verifyToken, verifyAdmin, async (req, res) => {
      const users = await userCollection.find().toArray();
      res.send(users);
    });

    app.get("/user/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      res.send(user);
    })

    app.get("/users/upVoteStatus/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const userEmail = req.query.email;
      const query = { email: userEmail };
      const user = await userCollection.findOne(query);
      if (user && user.upVotes) {
        const hasVoted = user.upVotes.includes(id);
        res.send(hasVoted);
      } else {
        res.send(false);
      }
    });

    app.get("/users/downVoteStatus/:id",  verifyToken, async (req, res) => {
      const id = req.params.id;
      const userEmail = req.query.email;
      const query = { email: userEmail };
      const user = await userCollection.findOne(query);
      if (user && user.downVotes) {
        const hasVoted = user.downVotes.includes(id);
        res.send(hasVoted);
      } else {
        res.send(false);
      }
    })

    app.patch("/user/updateUser/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const role = req.query.role;
      const query = { _id: new ObjectId(id) };
      const update = {
        $set: {
          role: role
        }
      }
      const result = await userCollection.updateOne(query, update);
      res.send(result);
    });

    app.patch("/users/upVotes/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const userEmail = req.query.email;
      const query = { email: userEmail };
      const update = {
        $push: {
          upVotes: id
        }
      };
      const result = await userCollection.updateOne(query, update);
      res.send(result);
    })

    app.patch("/users/downVotes/:id",  verifyToken, async (req, res) => {
      const id = req.params.id;
      const userEmail = req.query.email;
      const query = { email: userEmail };
      const update = {
        $push: {
          downVotes: id
        }
      };
      const result = await userCollection.updateOne(query, update);
      res.send(result);
    })


    // Product apis
    app.post("/products",  verifyToken, async (req, res) => {
      const product = req.body;
      const result = await productCollection.insertOne(product);
      res.send(result);
    })

    app.get("/products", async (req, res) => {
      const products = await productCollection.find().toArray();
      res.send(products);
    });

    app.get('/products/pageProducts', async (req, res) => {
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      const searchTags = req.query.search ? req.query.search.split(' ') : [];

      const query = searchTags.length > 0
        ? { tags: { $in: searchTags.map(tag => new RegExp(tag, 'i')) } }
        : {};

      const result = await productCollection.find(query)
        .skip((page - 1) * size)
        .limit(size)
        .toArray();

      res.send(result);
    });

    app.get("/products/productCount", async (req, res) => {
      const searchTags = req.query.search ? req.query.search.split(' ') : [];

      const query = searchTags.length > 0
        ? { tags: { $in: searchTags.map(tag => new RegExp(tag, 'i')) } }
        : {};

      const count = await productCollection.countDocuments(query);
      res.send({ count });
    });


    app.get("/products/featuredProducts", async (req, res) => {

      const query = { featured: 'true' };
      const products = await productCollection.find(query).toArray();
      res.send(products);
    })

    app.get("/products/trendingProducts", async (req, res) => {
      const products = await productCollection.find().sort({ upVote: -1 }).limit(6).toArray();
      res.send(products);
    });

    app.get("/products/reportedProducts", async (req, res) => {
      const query = { report: { $gt: 0 } };
      const products = await productCollection.find(query).toArray();
      res.send(products);
    });

    app.get("/products/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const query = { "owner.email": email };
      const products = await productCollection.find(query).toArray();
      res.send(products);
    });

    app.get("/products/product/:id",  verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const product = await productCollection.findOne(query);
      res.send(product);
    });

    app.patch('/products/updateProduct/:id', verifyToken, async (req, res) => {
      const productId = req.params.id;
      const updatedProductData = req.body;

      const query = { _id: new ObjectId(productId) }
      const update = {
        $set: {
          ...updatedProductData
        }
      }

      const result = await productCollection.updateOne(query, update);
      res.send(result);
    });

    app.patch("/products/makeFeatured/:id", verifyToken, verifyModarator, async (req, res) => {
      const productId = req.params.id;
      const query = { _id: new ObjectId(productId) }
      const update = {
        $set: {
          featured: 'true'
        }
      }
      const result = await productCollection.updateOne(query, update);
      res.send(result);
    })

    app.patch("/products/updateStatus/:id", verifyToken, verifyModarator, async (req, res) => {
      const productId = req.params.id;
      const status = req.query.status;
      const query = { _id: new ObjectId(productId) }
      const update = {
        $set: {
          status: status
        }
      }
      const result = await productCollection.updateOne(query, update);
      res.send(result);
    })

    app.patch("/products/upVote/:id",  verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const update = {
        $inc: { upVote: 1 }
      }
      const result = await productCollection.updateOne(query, update);
      res.send(result);
    });


    app.patch("/products/downVote/:id",  verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const update = {
        $inc: { downVote: 1 }
      }
      const result = await productCollection.updateOne(query, update);
      res.send(result);
    });

    app.patch("/products/report/:id",  verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const update = {
        $inc: { report: 1 }
      }
      const result = await productCollection.updateOne(query, update);
      res.send(result);
    })

    app.delete("/products/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productCollection.deleteOne(query);
      res.send(result);
    });



    // review apis
    app.post("/reviews", verifyToken, async (req, res) => {
      const review = req.body;
      const result = await reviewCollection.insertOne(review);
      res.send(result);
    });

    app.get("/reviews/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { productId: id };
      const reviews = await reviewCollection.find(query).toArray();
      res.send(reviews);
    })


    // Report apis
    app.post("/reports",  verifyToken, async (req, res) => {
      const report = req.body;
      const result = await reportCollection.insertOne(report);
      res.send(result);
    })

    app.get("/reports/:id", verifyToken, verifyModarator, async (req, res) => {
      const id = req.params.id;
      const query = { productId: id };
      const reports = await reportCollection.find(query).toArray();
      res.send(reports);
    });

    // Admin States
    app.get("/adminStates", verifyToken, verifyAdmin, async (req, res) => {
      const userCount = await userCollection.estimatedDocumentCount();
      const productCount = await productCollection.estimatedDocumentCount();
      const reviewCount = await reportCollection.estimatedDocumentCount();
      res.send({ userCount, productCount, reviewCount })
    })


    // Coupon apis
    app.post("/coupons", verifyToken, verifyAdmin, async (req, res) => {
      const coupon = req.body;
      const result = await couponCollection.insertOne(coupon);
      res.send(result);
    });

    app.get("/coupons", async (req, res) => {
      const coupons = await couponCollection.find().toArray();
      res.send(coupons);
    })

    app.patch("/coupons/updateCoupon/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const newCoupon = req.body;
      const query = { _id: new ObjectId(id) };
      const update = {
        $set: {
          ...newCoupon
        }
      }
      const result = await couponCollection.updateOne(query, update);
      res.send(result);
    })

    app.delete("/coupons/deleteCoupon/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await couponCollection.deleteOne(query);
      res.send(result);
    })



    // payment intents
    app.post("/create_payment_intent", async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"]
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    // Payment apis
    app.post("/payments", verifyToken, async (req, res) => {
      const payment = req.body;
      const query = { email: payment.userEmail };
      const update = {
        $set: {
          premiumUser: 'true'
        }
      }
      const paymentResponse = await paymentCollection.insertOne(payment);
      const updateResponse = await userCollection.updateOne(query, update);
      res.send({ paymentResponse, updateResponse });
    })


    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);





app.get('/', (req, res) => {
  res.send('Welcome to InnovateX!');
});


app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});