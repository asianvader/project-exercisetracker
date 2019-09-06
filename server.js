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
        username: usernameInput,
        count: 0
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

// function to convert date

// POST exercise and duration => /api/exercise/add
app.post("/api/exercise/add", (req, res) => {
  let userIdInput = req.body.userId;
  let description = req.body.description;
  let duration = req.body.duration;
  let date = req.body.date;
  if (date === "") {
    date = new Date().toUTCString();
    date = date.split(' ').slice(0, 4).join(' ');
  } else {
    let convertDate = new Date(date).toUTCString();
    date = convertDate.split(' ').slice(0, 4).join(' ');
  }

// check if username is in DB and add exercise log
  NewUser.findOne({_id: userIdInput}, (err, data) => {
    if (data) {
      data.log.push({
        description: description,
        duration: duration,
        date: date
      });
      data.save()
      .then(result => {
        res.json({
          username: result.username,
          _id: result.id,
          log: result.log.pop()
        });
      }).catch(err => {
        console.log(err);
      });
    } else {
      res.send('User ID not found')
    }
  });
});

// return log of all exercises
app.get("/api/exercise/log/:userid?", (req, res) => {
  let userid = req.params.userid;
  console.log(userid)

  NewUser.findOne({_id: userid}, (err, data) => {
    if (data) {
      res.json({
        _id: data.id,
        username: data.username,
        count: data.log.length,
        log: data.log
        });
    } else {
      res.send('User ID not found')
    }
  });
})


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
});


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
});
