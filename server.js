require('dotenv').config();
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const mongo = require('mongodb');
const cors = require('cors');
const shortid = require('shortid');

const mongoose = require('mongoose');
mongoose.connect(process.env.MONGOLAB_URI, {useNewUrlParser: true}, function(error){
  if (error) {
  console.log(error);
  }
});

// schema for MongoDB
const Schema = mongoose.Schema;

const newUserSchema = new Schema({
  username: String,
  _id: {
    'type': String,
    'default': shortid.generate
  },
  count: Number,
  log: Array
});

let NewUser = mongoose.model('NewUser', newUserSchema);

app.use(cors());

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


app.post("/api/exercise/new-user", (req, res) => {
  let usernameInput = req.body.username;
  // check if username is in DB
  let checkUsername = NewUser.findOne({username: usernameInput}, (err, data) => {
    if (data) {
      res.send('Username taken, please choose another');
    } else {
        // create new username and ID in MongoDB  
      let username = new NewUser({
        username: usernameInput
      });
      username.save()
      .then(result => {
        console.log('added to mongodb');
        res.json({
          username: usernameInput,
          _id: result.id
        });
      }).catch(err => {
        console.log(err);
      });
    }
  });
});  

// GET username and ID
app.get("/api/exercise/users/:user", (req, res) => {
  let getUsername = req.params.user;

  let existingUser = NewUser.findOne({username: getUsername}, (err, data) => {
    if (data) {
      console.log(data);
      res.json({
        username: data.username,
        _id: data.id
      });
    } else {
      res.send("Username does not exist");
    }
  });
});

// return all usernames and passwords in an array
app.get("/api/exercise/users", (req, res) => {
  NewUser.find({}, (err, users) => {
    res.send(users);
  });
});

// POST exercise and duration => /api/exercise/add
app.post("/api/exercise/add", (req, res) => {
  let userIdInput = req.body.userId;
  let description = req.body.description;
  let duration = req.body.duration;
  let date = req.body.date;

// check if username is in DB
NewUser.findOne({_id: userIdInput}, (err, data) => {
  if (data) {
    data.log.push({
      description: description,
      duration: duration,
      date: date
    });
    data.save()
    .then(result => {
      console.log('updated on mongodb');
      res.json({
        username: result.username,
        log: result.log
      });
    }).catch(err => {
      console.log(err);
    });
    

  
  } else {
    res.send('User ID not found')
  }
});

});


// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
});

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
});
