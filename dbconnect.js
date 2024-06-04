const sql = require("mysql");

const sqlconnect = sql.createConnection({
    host:"localhost",
    user:"root",
    password:"",
    database:"salem",
    multipleStatements:true
});

sqlconnect.connect((err)=>{
    if(!err)
    {
        console.log("Base de donnée connectée");
    } else{
        console.log("Base de donnée non connectée");
    }
});

module.exports= sqlconnect;