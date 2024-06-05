const express = require('express');
const app = express()
const cors = require('cors')
require('dotenv').config()

const port = process.env.PORT || 5000;
app.use(cors())
app.use(express.json())


// mongodb

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.USER_PASSWORD}@cluster0.vq4rqer.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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

        const userCollection = client.db('microTasking').collection('users')
        const taskCollection = client.db('microTasking').collection('taskCollection')

        // save a user data in db
        app.put('/user', async (req, res) => {
            const user = req.body;
            const query = { email: user?.email }
            // check if user already exists in db
            const isExists = await userCollection.findOne(query)
            if (isExists) return res.send({ message: 'user already exists' })
            const options = { upsert: true }

            const updateDoc = {
                $set: {
                    ...user,
                    timestamp: Date.now(),
                }
            }
            const result = await userCollection.updateOne(query, updateDoc, options)
            res.send(result)
        })



        // get user info by email from db:
        app.get('/user/:email', async (req, res) => {
            const email = req.params.email;
            const result = await userCollection.findOne({ email })
            res.send(result)
        })

        //task creator

        // add task
        app.post('/add-task', async (req, res) => {
            const task = req.body;
            const result = await taskCollection.insertOne(task)
            res.send(result)

        })

        // get all task by user email:
        app.get('/all-task/:email', async (req, res) => {
            const email = req.params.email;
            const query = { 'user.email': email }
            const options = {
                sort: { 'user.post_time': -1 }  // -1 for descending order
            };
            const result = await taskCollection.find(query,options).toArray()
            res.send(result)
        })

       

        // get single task by id:
        app.get('/my-task/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await taskCollection.findOne(query)
            res.send(result)
        })

        // update single task by id:
        app.patch('/my-task/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const data = req.body;
            const updateDoc = {
                $set: {
                    ...data
                }
            }
            const result = await taskCollection.updateOne(query, updateDoc)
            res.send(result)
        })
        
        // delete single task by id:
        app.delete('/all-task/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await taskCollection.deleteOne(query)
            res.send(result)

        })


        // decrease user coin:

            app.patch('/decrease-coin/:email', async (req, res) => {
                const email = req.params.email;
               
                const query = { email: email }
                
                const value = req.body
                console.log(value.value);
                const decrease = parseFloat(value.value)

                const updateDoc = {
                    $inc: { coins: -decrease }  
                };

                const result = await userCollection.updateOne(query, updateDoc);
                res.send(result)
            })
        // increase user coin:

            app.patch('/increase-coin/:email', async (req, res) => {
                const email = req.params.email;
               
                const query = { email: email }
                
                const value = req.body
                const increase = parseFloat(value.value)

                const updateDoc = {
                    $inc: { coins: increase }  
                };

                const result = await userCollection.updateOne(query, updateDoc);
                res.send(result)
            })


        // Connect the client to the server	(optional starting in v4.7)
        // Send a ping to confirm a successful connection

        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error

    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('12 is running')
})

app.listen(port, () => {
    console.log(`12 is running on${port}`);
})