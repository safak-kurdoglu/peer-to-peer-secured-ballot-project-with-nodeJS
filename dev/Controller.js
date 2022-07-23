var express = require("express");
var app = express();
const rp = require('request-promise');
const bodyParser = require('body-parser');


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:false}));


const networkNodes = []; 

const nodeVotes = [];


//3D result array with respect to provinces and towns.
var resultArray = new Array(); resultArray[0] = new Array(); resultArray[1] = new Array(); resultArray[2] = new Array();
resultArray[0][0] = new Array(); resultArray[0][1] = new Array(); resultArray[0][2] = new Array(); resultArray[1][0] = new Array(); resultArray[1][1] = new Array(); resultArray[1][2] = new Array(); resultArray[2][0] = new Array(); resultArray[2][1] = new Array(); resultArray[2][2] = new Array();
resultArray[0][0][0] = 0; resultArray[0][0][1] = 0; resultArray[0][0][2] = 0; resultArray[0][1][0] = 0; resultArray[0][1][1] = 0; resultArray[0][1][2] = 0; resultArray[0][2][0] = 0; resultArray[0][2][1] = 0; resultArray[0][2][2] = 0;
resultArray[1][0][0] = 0; resultArray[1][0][1] = 0; resultArray[1][0][2] = 0; resultArray[1][1][0] = 0; resultArray[1][1][1] = 0; resultArray[1][1][2] = 0; resultArray[1][2][0] = 0; resultArray[1][2][1] = 0; resultArray[1][2][2] = 0;
resultArray[2][0][0] = 0; resultArray[2][0][1] = 0; resultArray[2][0][2] = 0; resultArray[2][1][0] = 0; resultArray[2][1][1] = 0; resultArray[2][1][2] = 0; resultArray[2][2][0] = 0; resultArray[2][2][1] = 0; resultArray[2][2][2] = 0;

//2D valid votes array with respect to provinces and towns.
var validVotes = new Array(); validVotes[0] = new Array(); validVotes[1] = new Array(); validVotes[2] = new Array();
validVotes[0][0] = 0; validVotes[0][1] = 0; validVotes[0][2] = 0; validVotes[1][0] = 0; validVotes[1][1] = 0; validVotes[1][2] = 0; validVotes[2][0] = 0; validVotes[2][1] = 0; validVotes[2][2] = 0;


var partyVotesConfirmed = [0, 0, 0]
var totalConfirmedVotes = 0; 


app.get("/", (req, res) => { });


app.get('/open-voting-procedure', function(req, res){ 

    const requestPromises = [];
    networkNodes.forEach(networkNodeUrl => {
        const requestOptions = {
            uri: networkNodeUrl + '/open-voting-procedure',
            method: 'GET',
            json: true
        };
    requestPromises.push(rp(requestOptions));
    });
    Promise.all(requestPromises).then(blockchains => {
    res.send("Voting procedure is open.");  });
});


app.post('/register-node', (req, res) =>{

    networkNodes.push(req.body.newNodeUrl);
    res.json("Node registered successfully.");

});


app.get('/close-voting-procedure-and-send-node-votes', function(req, res){ 

    const requestPromises = []; 
    networkNodes.forEach(networkNodeUrl => {
        const requestOptions = {
            uri: networkNodeUrl + '/close-voting-procedure-and-send-node-votes',
            method: 'GET',
            json: true
        };
    requestPromises.push(rp(requestOptions));
    });
    Promise.all(requestPromises).then(blockchains => {
    res.send("Voting procedure is closed.");  });
});


app.post('/get-node-votes', function(req, res){

    nodeVotes.push(req.body.votes);
    res.json("Node votes registered successfully.");

});


app.get('/show-results', function(req, res){
    const mongodb = require('mongodb');
    const MongoClient = mongodb.MongoClient
    const connectionURL = 'mongodb://127.0.0.1:27017'
    const database = 'admin'

    MongoClient.connect(connectionURL, { useNewUrlParser: true}, (error, client) => {
        if(error)
            return console.log("unable to connect");
            
        const db = client.db(database) 

        db.collection("citizens").find({}).toArray(function(err, result) {
            if (err) throw err;

            const nodesTotal = nodeVotes.length;
            var partyL = partyVotesConfirmed.length;

            result.forEach(citizen => {
                const partyVotes = [0, 0, 0];

                voterID = citizen.nationalID;
                nodeVotes.forEach(nodeVote => {
                    var p = nodeVote.find(obj => obj.voterNationalID === voterID);
                    //if vote is casted to one of the parties by citizen, increase the vote of the selected party by one for each node.
                    if (p)
                        partyVotes[(p.party)-1] += 1;
                });

                var found = false;
                var i = 0;
                while(!found && i < partyL){
                    // if citizen's vote, broadcasted to all nodes, to one party is greater than (Total node/2), which greater than %50, then accept vote as confirmed.
                    if(partyVotes[i] > (nodesTotal/2)){ 
                        resultArray[citizen.province-1][citizen.town-1][i] += 1;
                        validVotes[citizen.province-1][citizen.town-1] += 1;
                        totalConfirmedVotes += 1;
                        partyVotesConfirmed[i] += 1
                        found = true; 
                    }
                    i++; 
                }

            }); 
            client.close();

            for(i=1; i<=3; i++){ 
                for(j=1; j<=3; j++){
                    for(k=1; k<=3; k++){
                        if(validVotes[j-1][k-1] == 0) 
                            console.log("party " + i + " votes ratio on province " + j + ", town " + k + " = %" + 0 + "\n");
                        else
                            console.log("party " + i + " votes ratio on province " + j + ", town " + k + " = %" + 100*(resultArray[j-1][k-1][i-1]/validVotes[j-1][k-1]) + "\n");
                    }
                }
                if(totalConfirmedVotes == 0)
                    console.log("party " + i + " votes ratio = %" + 0 + "\n");
                else
                    console.log("party " + i + " votes ratio = %" + 100*(partyVotesConfirmed[i-1]/totalConfirmedVotes) + "\n");
            }

        });
  
    });   
    
});


app.listen(3000, function(){
    console.log("listening port " + 3000);
});