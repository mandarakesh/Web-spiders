const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const Joi = require('joi');//for validation
const dotenv = require('dotenv');

//connected to express
const app = express();

app.use(express.json());

//configuring dotenv task
dotenv.config();
let db;

//connecting to mongoDB
const connectDB = async () => {
  const client = new MongoClient(process.env.MONGO_URI, {
    useUnifiedTopology: true,
  });
  try {
    await client.connect();
    db = client.db('Tasks');
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('MongoDB connection error', err);
  }
};

connectDB();
//coneected to particular db
const getDB = () => db;

//accessed port from env task if it is not available the uses 5000 port by default
const port = process.env.PORT || 5000;

//i placed a static token for autherization
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJyYWtlc2gxMjMiLCJ1c2VybmFtZSI6IlJha2VzaCIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNjkxMTI3NjAwLCJleHBpcmVkIjoxNjkxMTI4MzAwfQ.d0XyFJqETC6GV42wT0KlV_zZAv30kscQsZ2EKqu5NdE'

//listening to the port
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

//validate the schema i taken a random data for the process
const validateTask = (task) => {
  const schema = Joi.object({
    title: Joi.string().max(100).required(),
    description: Joi.string().optional(),
    status: Joi.string().valid('TODO', 'IN_PROGRESS', 'COMPLETED').required(),
    priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH').required(),
    dueDate: Joi.date().optional(),
  });
  return schema.validate(task);
};


//i do the post request 
app.post('/tasks', async (req, res) => {
  const { error } = validateTask(req.body);
  if (error) {
    return res.status(400).send(error.message);
  }
//get the token from the headers
  const reqToken = req.headers.authorization?.split(' ')[1]

  const task = {
    title: req.body.title,
    description: req.body.description || '',
    status: req.body.status,
    priority: req.body.priority,
    dueDate: req.body.dueDate || null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
//checking the token
  if (token === reqToken) {
    try {
      const db = getDB();
      const result = await db.collection('test').insertOne(task);
      res.status(201).send({ ...result, ...task });
    } catch (err) {
      console.error(err);
      res.status(500).send('Error creating task');
    }
  } else {
    res.status(401).send("Check the Token")
  }
});


//request to get all tasks 
app.get('/tasks', async (req, res) => {
  const reqToken = req.headers.authorization?.split(' ')[1]
  if (token === reqToken) {
    try {
      const db = getDB();
      const tasks = await db.collection('test').find().toArray();

      res.status(200).send(tasks);
    } catch (err) {
      console.error(err);
      res.status(500).send('Error retrieving tasks');
    }
  } else {
    res.status(401).send('Check the token')
  }
});

//get one particuler task based on id
app.get('/tasks/:id', async (req, res) => {
  const reqToken = req.headers.authorization?.split(' ')[1]
  if (token === reqToken) {
    try {
      const db = getDB();
      const task = await db.collection('test').findOne({ _id: new ObjectId(req.params.id) });
      if (!task) return res.status(404).send('Task not found');
      res.status(200).send(task);
    } catch (err) {
      console.error(err);
      res.status(500).send('Error retrieving task');

    }
  } else {
    res.status(401).send('Check the token')
  }
});

// update the task based on id
app.put('/tasks/:id', async (req, res) => {

  const reqToken = req.headers.authorization?.split(' ')[1]
  const { error } = validateTask(req.body);
  if (error) {
    return res.status(400).send(error.message);
  }
  const paramsId = req.params.id
  if (token === reqToken) {
    try {
      const db = getDB();
      const task = await db.collection('test').findOneAndUpdate(
        { _id: new ObjectId(paramsId) },
        {
          $set: {
            ...req.body,
            //updating the updated time also
            updatedAt: new Date(),
          }
        },
        { returnDocument: 'after' }
      );

      if (!task.value) {
        return res.status(404).send('Task not found');
      }
      res.status(200).send(task.value);
    } catch (err) {
      console.error(err);
      res.status(500).send('Error updating task');
    }

  } else {
    res.status(401).send('Check the token')
  }
});


//delete the task based on id
app.delete('/tasks/:id', async (req, res) => {
  const reqToken = req.headers.authorization?.split(' ')[1]
  const deleteId = req.params.id
  if (token === reqToken) {
    try {
      const db = getDB();
      const result = await db.collection('test').deleteOne({ _id: new ObjectId(deleteId) });
      if (result.deletedCount === 0) {
        return res.status(404).send('Task not found');
      }
      res.status(204).send(result);
    } catch (err) {
      console.error(err);
      res.status(500).send('Error deleting task');
    }
  } else {
    res.status(401).send('Check the token')
  }
});
