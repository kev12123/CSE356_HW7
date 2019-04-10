const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const Memcached = require('memcached');
const memcached = new Memcached('localhost:11211');
const PORT = process.env.PORT || 3000;
const mysql  = require('mysql');

const connection = mysql.createConnection({
  host     : 'localhost',
  user     : 'kevin',
  password : 'purolo12',
  database: 'hw7',
  multipleStatements: true
});

function checkGS(players){
    var gs = players[0].GS;
    var equalGS= false;
    for(var i = 1 ; i < players.length;i++){
        if(players[i].GS === gs){
            equalGS = true;
            break;
        }
    }

    return equalGS;
}
         
connection.connect(function(err) {
  if (err) {
    console.error('error connecting: ' + err.stack);
    return;
  }
 
  console.log('connected as id ' + connection.threadId);
});


app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json());

app.get('/hw7', async (req,res,next)=>{
    
    var key = req.query.club+req.query.pos;
    memcached.get(key, function (err,data) {
        if(!data){

            //prepare query 
    console.log("HERE")
    var inserts = [req.query.club,req.query.pos]; 

    var sub_query = "(SELECT MAX(a) FROM assists WHERE club = ? AND pos= ?)";
    sub_query = mysql.format(sub_query, inserts);
    var query = "SELECT player, a, GS FROM assists WHERE club =  ? AND pos= ? AND a =("+sub_query+") ORDER BY player ASC";
    query = mysql.format(query, inserts);
  
     console.log(query);
    var query2 = "SELECT avg(a) FROM assists WHERE club = ? AND pos=?"
    query2 = mysql.format(query2, inserts);
    console.log(query2);
    connection.query(query +";"+query2, function (error, results, fields) {
        if (error) throw error;
        //{ club:, pos:, max_assists:, player:, avg_assists:}
        console.log(results);
        var maxAplayer = results[0][0].player;
        //if two players of same team and same pos have the same assists use gs as tie breaker
        if(!checkGS(results[0])){
            if(results[0].length > 1){
                var maxGS =0;
                var players = results[0];
                for(var i =0; i < players.length;i++){
                    if(players[i].GS > maxGS){
                        maxGS = players[i].GS;
                        maxAplayer = players[i].player
                    }
                }
                console.log(maxAplayer);
            }
        }
       
        memcached.set(key, {club:req.query.club,max_assists: results[0][0].a, player: maxAplayer,avg_assists: results[1][0]['avg(a)']}, 100000, function (err) { 
            console.log('key set')
            /* stuff */ });

        return res.send({club:req.query.club,max_assists: results[0][0].a, player: maxAplayer,avg_assists: results[1][0]['avg(a)']})
      });




        }else{
            console.log("found in cache");
            return res.send(data);
        }
    



    });
      
});

app.listen(PORT);
console.log('listening on port ' +  PORT);