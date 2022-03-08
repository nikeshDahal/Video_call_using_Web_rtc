//database
require("./db/connection");
//hbs route
const hbs = require("hbs");
//path
const path = require("path");
//models
const Register = require("./models/registers");
//bcrypt
const bcrypt = require("bcrypt");

const NodeRSA = require("node-rsa");
const key = new NodeRSA({ b: 512 });

const express = require("express");
//module
const http = require("http");

//for 3000 or heroku
//environment variable
const PORT = process.env.PORT || 3000;

const app = express();

//creating server and passing application
const server = http.createServer(app);
const io = require("socket.io")(server);

//static path
const template_path = path.join(__dirname, "../templates/views");
const static_path = path.join(__dirname, "../public");
// const index_path=path.join(__dirname,"../public/index.html");

//middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false })); //to get data from forms
app.use(express.static(static_path));
app.use(express.static("public"));
app.use(require("cors")());

app.set("views", template_path);
app.set("view engine", "hbs");

// routes
app.get("/", (req, res) => {
  res.render("login");
});

app.get("/register", (req, res) => {
  res.render("register");
});
app.get("/login", (req, res) => {
  res.render("login");
});

// create a new user in the database
app.post("/register", async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;
    Register.findOne({ email: email }, async (err, user) => {
      if (user) {
        const message = 1; //for already registered user
        res.render("register", { message });
      } else {
        if (password === confirmPassword) {
          const registerdUser = new Register({
            name,
            email,
            password,
            confirmPassword
          });
          //here middleware is executed which is on database schema i.e models hashing is done after it is saved
          const registered = await registerdUser.save();
          console.log(registered, "registered");
          res.status(201).render("login");
        } else {
          const message2 = 2; //for password mismatch
          res.status(500).render("register", { message2 });
        }
      }
    });
  } catch (err) {
    res.status(400).send(err);
  }
});

//email validation in the database
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  // console.log(`email is ${email} and password is ${password}`);
  const validatedUser = await Register.findOne({ email: email });
  if (validatedUser) {
    const isPasswordMatch = await bcrypt.compare(
      password,
      validatedUser.password
    );
    if (isPasswordMatch) {
      res.status(201).render("index");
    } else {
      // res.status(400).send("password is not correct");
      const errorValue = 1; //for passwrd not correct
      res.render("login", { errorValue });
    }
  } else {
    const errorValue = 2; //for passwrd not correct
    res.render("login", { errorValue });
  }
});

//routes end

let connectedPeers = [];

// //is called directly after the connection has been opened
io.on("connect", (socket) => {
  console.log("client connected to server");
  connectedPeers.push(socket.id);
  //for more than one connected user
  //if client connects to the server then the id will be printed
  console.log(connectedPeers);

  socket.on("encrypt_personal_code", (personalCode) => {
    const encryptedString = key.encrypt(personalCode, "base64");
    console.log("encrypted: ", encryptedString);

    io.to(personalCode).emit("encrypt_personal_code", encryptedString);
  });

  socket.on("decrypt_personal_code", (personalCode) => {
    const decryptedCode = key.decrypt(personalCode.data, "utf8");
    console.log("decrypted: ", decryptedCode);
    io.to(personalCode.id).emit("decrypt_personal_code", decryptedCode);
  });

  socket.on("pre-offer", (data) => {
    console.log("pre-offer-came-on-server-from-caller");
    // console.log(data);

    const { calleePersonalCode, callType } = data;

    //connectedPeer is the one who is being called
    const connectedPeer = connectedPeers.find((peerSocketId) => {
      return peerSocketId === calleePersonalCode;
    });

    console.log(`calling: ${connectedPeer}`);
    if (connectedPeers) {
      /////////////////////////////////////////////
      const data = {
        callerSocketId: socket.id,
        callType
      };
      console.log(
        "caller connected to server ... trying to connect callee/receiver",
        data
      );
      io.to(calleePersonalCode).emit("pre-offer", data);
    }
  });

  socket.on("pre-offer-answer", (data) => {
    console.log("pre offer answer came");
    // console.log(data);

    const connectedPeer = connectedPeers.find((peerSocketId) => {
      return peerSocketId === data.callerSocketId;
    });

    if (connectedPeer) {
      io.to(data.callerSocketId).emit("pre-offer-answer", data);
    }
  });
  //-------------3. sending webrrct offer------------------
  socket.on("webRTC-signalling", (data) => {
    const { connectedUserSocketId } = data;
    console.log("connectedUserSocketId: " + connectedUserSocketId);

    const connectedPeer = connectedPeers.find(
      (peerSocketId) => peerSocketId === connectedUserSocketId
    );

    if (connectedPeer) {
      io.to(connectedUserSocketId).emit("webRTC-signalling", data);
    }
  });

  //if internet connection lost
  socket.on("disconnect", () => {
    console.log("user disconnected");
    //console.log(socket.id);

    const newConnectedPeers = connectedPeers.filter((peerSocketId) => {
      return peerSocketId !== socket.id;
    });

    connectedPeers = newConnectedPeers;
    console.log(connectedPeers);
  });
});

server.listen(PORT, () => {
  console.log(`listening on ${PORT}`);
});
