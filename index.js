const express = require('express');
const app = express()
const cors = require('cors')
const jwt = require('jsonwebtoken') //for json webtoken
require('dotenv').config()
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

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
        const submissionCollection = client.db('microTasking').collection('submissionCollection')
        const withdrawCollection = client.db('microTasking').collection('withdrawCollection')
        const paymentCollection = client.db('microTasking').collection('paymentCollection')
        const paymentConfirm = client.db('microTasking').collection('paymentConfirm')


        //jwt related api:
        app.post('/jwt', async (req, res) => {
            const user = req.body;

            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '7d' });
            res.send({ token })
        })

        //middleware:
        const verifyToken = (req, res, next) => {
            // console.log(req.headers.authorization, 'from middleware');
            if (!req.headers.authorization) {
                return res.status(401).send({ message: 'unauthorized access ' })
            }
            const token = req.headers.authorization.split(' ')[1]
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: 'unauthorized access ' })
                }
                req.user = decoded
                next()
            })


        }


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

        //get all user: for admin
        app.get('/users', verifyToken, async (req, res) => {
            // console.log(req.headers);
            // const result = await userCollection.find().toArray()
            const result = await userCollection.find({ role: "Worker" }).toArray();
            res.send(result)
        })

        // delete user:for admin
        app.delete('/user/delete/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await userCollection.deleteOne(query)
            res.send(result)
        })


        // update user role:for admin
        app.patch('/user/role/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const query = { email: email }
            const updatedDoc = {
                $set: {
                    ...user
                }
            }
            const result = await userCollection.updateOne(query, updatedDoc)
            res.send(result)
        })



        // get user info by email from db:
        app.get('/user/:email', async (req, res) => {
            const email = req.params.email;
            const result = await userCollection.findOne({ email })
            res.send(result)
        })

        //task creator



        // for worker
        app.get('/all-task', async (req, res) => {
            const page = parseInt(req.query.page)
            const size = parseInt(req.query.size)

            const result = await taskCollection
                .find({ "task_quantity": { $gt: 0 } })
                .skip(page * size)
                .limit(size)
                .toArray()
            res.send(result)

        })

        // for admin 
        app.get('/admin-task', async (req, res) => {
            const result = await taskCollection.find().toArray();
            res.send(result)
        })

        // for admin
        app.delete('/admin-task-delete/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await taskCollection.deleteOne(query)
            res.send(result)
        })



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
            const result = await taskCollection.find(query, options).toArray()
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



        // submission collection:
        //for worker
        app.get('/work-submission/:email', verifyToken, async (req, res) => {
            console.log(req.user.email);
            const email = req.params.email;
            if (email !== req.user.email) {
                return res.status(403).send({ message: 'Forbidden Access' })
            }
            const query = { worker_email: email }
            const result = await submissionCollection.find(query).toArray()
            res.send(result)

        })




        // changed task status "Reject"
        app.patch('/task/reject/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const status = req.body;
            const updatedDoc = {
                $set: {
                    ...status
                }
            }
            const result = await submissionCollection.updateOne(query, updatedDoc)
            res.send(result)
        })

        // changed task status "Approve"
        app.patch('/task/approve/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const status = req.body;
            const updatedDoc = {
                $set: {
                    ...status
                }
            }
            const result = await submissionCollection.updateOne(query, updatedDoc)
            res.send(result)
        })


        // update user coin when task creator accept task:
        app.patch('/update-user-coin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email }
            // console.log(query);
            const value = req.body;
            const increase = parseFloat(value.coins)
            // console.log(increase);

            const updateDoc = {
                $inc: { coins: increase }
            };
            const result = await userCollection.updateOne(query, updateDoc)
            res.send(result)
        })

        app.post('/worker-submission', async (req, res) => {
            const submissionData = req.body;
            const result = await submissionCollection.insertOne(submissionData)
            res.send(result)
        })


        // get data for stat [task creator]

        app.get('/task-creator-state/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email }

            const { coins } = await userCollection.findOne(query, {
                projection: {
                    _id: 0,
                    coins: 1
                }
            });

            const query2 = {
                status: 'Pending',
                creator_email: email
            };
            const pendingTask = await submissionCollection.countDocuments(query2)

            const paymentPaid = await paymentConfirm.find(query).toArray()
            console.log(paymentPaid);


            // const totalPayableAmount = await submissionCollection.find({
            //     status: "Approve",
            //     creator_email: email
            //     }).toArray()
            // console.log(totalPayableAmount);

            const total = paymentPaid.reduce((acc, cr) => {
                return acc + cr.dollars
            },0)

            // const total = totalPayableAmount.reduce((accumulator, currentValue) => {
            //     return accumulator + currentValue.payable_amount;
            // }, 0);

            res.send({ pendingTask, coins,total })

        })

        app.get('/worker-state/:email', async (req, res) => {
            const email = req.params.email;
            const { coins } = await userCollection.findOne({ email: email }, {
                projection: {
                    _id: 0,
                    coins: 1
                }
            });

            const total_submission = await submissionCollection.countDocuments({ worker_email: email })

            const total_earning = await submissionCollection.find({ worker_email: email, status: 'Approve' }).toArray()
            const total = total_earning.reduce((accumulator, currentValue) => {
                return accumulator + currentValue.payable_amount;
            }, 0);

            res.send({ coins, total_submission, total })
        })




        // get for task creator:
        app.get('/task-submission/:email', async (req, res) => {
            const email = req.params.email;
            const query = { creator_email: email, status: "Pending" };
            const result = await submissionCollection.find(query).toArray();
            res.send(result);
        });


        // get for worker:
        app.get('/worker-submission/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            if (email !== req.user.email) {
                return res.status(403).send({ message: 'Forbidden Access' })
            }
            const query = { worker_email: email, status: 'Approve' }
            const result = await submissionCollection.find(query).toArray()
            res.send(result)
        })


        app.get('/taskCount', async (req, res) => {
            const count = await taskCollection.countDocuments()
            res.send({ count })
        })



        // for home section 
        app.get('/users-coin', async (req, res) => {
            const result = await userCollection.find().sort({ coins: -1 })
                .limit(6).toArray()
            res.send(result)
        })


        // save withdraw for worker in withdrawCollection
        app.post('/withdraw-coin', async (req, res) => {
            const data = req.body;
            const result = await withdrawCollection.insertOne(data)
            res.send(result)
        })

        // for admin
        app.get('/admin-home-request', async (req, res) => {
            const result = await withdrawCollection.find().toArray()
            res.send(result)
        })

        // make it for admin to approve payment
        app.patch('/user-coin-deducted/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email }
            const data = req.body;
            const increase = parseInt(data.withdraw)
            const updateDoc = {
                $inc: { coins: -increase }
            };
            const result = await userCollection.updateOne(query, updateDoc)
            res.send(result)


        })

        // make it for admin for after approve payment delete specific data in withdrawCollection
        app.delete('/withdraw-delete/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await withdrawCollection.deleteOne(query)
            res.send(result)
        })

        // ---------------------
        // Everything for task creator payment:

        app.get('/payment-offer', async (req, res) => {
            const result = await paymentCollection.find().toArray()
            res.send(result)
        })

        app.get('/payment/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await paymentCollection.findOne(query)
            res.send(result)
        })

        //create-payment-intent

        app.post('/create-payment-intent', verifyToken, async (req, res) => {
            const price = req.body.price;
            const priceInCent = parseFloat(price) * 100;
            // console.log(priceInCent);

            if (!price || priceInCent < 1) return
            //generate client secret
            const { client_secret } = await stripe.paymentIntents.create({
                amount: priceInCent,
                currency: "usd",
                // In the latest version of the API, specifying the `automatic_payment_methods` parameter is optional because Stripe enables its functionality by default.
                automatic_payment_methods: {
                    enabled: true,
                },
            })
            //send client secret response
            res.send({ clientSecret: client_secret })
        })


        // working on confirm payment store in database:
        app.post('/confirm-payment', async (req, res) => {
            const confirmData = req.body;
            const result = await paymentConfirm.insertOne(confirmData)
            res.send(result)
        })

        app.patch('/payment-success/coin-update/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email }
            const data = req.body
            const increase = parseInt(data.coins)
            const updateDoc = {
                $inc: { coins: increase }
            }
            const result = await userCollection.updateOne(query, updateDoc)
            res.send(result)
        })


        // for task creator show all success payment of her
        app.get('/all-success-payment/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email }
            const options = {
                sort: { time: -1 } // Sort by `time` field in descending order
            };
            const result = await paymentConfirm.find(query, options).toArray()
            res.send(result)
        })



        // -------------


        // for admin

        app.get('/admin/state', async (req, res) => {
            const totalUser = await userCollection.countDocuments()

            const result2 = await userCollection.find().toArray()

            const totalCoin = result2.reduce((acc, cr) => {
                return acc + cr.coins
            }, 0)

            const paymentPaid = await paymentConfirm.find().toArray()
            console.log(paymentPaid)

            const totalPay = paymentPaid.reduce((acc, cr) => {
                return acc + cr.coins
            }, 0)

            console.log(paymentPaid);

            res.send({ totalUser, totalCoin, totalPay })
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
    console.log(`12 is running on ${port}`);
})