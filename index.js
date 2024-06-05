const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;


app.use(express.json());
app.use(cors());



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
    await client.connect();
    const database = client.db("InnovateX");
    const userCollection = database.collection("users");
    const productCollection = database.collection("Products");
    const featuredProductCollection = database.collection("FeaturedProducts");


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

    app.get("/users", async (req, res) => {
      const users = await userCollection.find().toArray();
      res.send(users);
    });

    app.get("/users/admin/:email", async (req, res) =>{
      const email = req.params.email;
      const query = {email: email};
      const user = await userCollection.findOne(query);
      res.send(user?.role === "admin");
    })

    app.patch("/user/updateUser/:id", async (req, res) => {
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


    // Product apis
    app.post("/products", async (req, res) => {
      const product = req.body;
      const result = await productCollection.insertOne(product);
      res.send(result);
    })

    app.get("/products/:email", async (req, res) => {
      const email = req.params.email;
      const query = { "owner.email": email };
      const products = await productCollection.find(query).toArray();
      res.send(products);
    });

    app.get("/products/product/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const product = await productCollection.findOne(query);
      res.send(product);
    })

    app.patch('/products/updateProduct/:id', async (req, res) => {
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

    app.delete("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productCollection.deleteOne(query);
      res.send(result);
    })

    app.get("/featuredProducts", async (req, res) => {
      const products = await featuredProductCollection.find().toArray();
      res.send(products);
    })
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
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