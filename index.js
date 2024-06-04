const express = require ("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const RouterPath = require("./router");

const app = express();
const port = 7000;


// Use bodyParser middleware
app.use(bodyParser.json());

// Use CORS middleware
app.use(cors({ origin: "http://localhost:3000" })); 

app.use("/api",RouterPath);

app.listen(port, ()=>console.log("Le serveur se déploie sur le port 7000"));