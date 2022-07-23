var ballotBoxCreater = require("./BallotBoxCreater");
var express = require("express");
var app = express();
const bodyParser = require('body-parser'); 
const port = process.argv[2];
const rp = require('request-promise');

const ballotBox = new ballotBoxCreater();
var voteOpen =  false;
var voteFinished = false;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:false})); 


app.get("/", (req, res) => { });


app.post('/register-and-broadcast-node', function(req, res) {

    const newNodeUrl = req.body.newNodeUrl;
    if (ballotBox.networkNodes.indexOf(newNodeUrl) == -1) 
        ballotBox.networkNodes.push(newNodeUrl);

    const regNodesPromises = [];
    ballotBox.networkNodes.forEach(networkNodeUrl => {
        const requestOptions = {
            uri: networkNodeUrl + '/register-node',
            method: 'POST',
            body: { newNodeUrl: newNodeUrl },
            json: true 
        };

        regNodesPromises.push(rp(requestOptions));
    });
    Promise.all(regNodesPromises).then(data => {  
        const bulkRegisterOptions = {
            uri: newNodeUrl + '/register-nodes-bulk',
            method: 'POST',
            body: {allNetworkNodes: [...ballotBox.networkNodes, ballotBox.currentNodeUrl]},
            json: true 
        };
    return rp(bulkRegisterOptions);
    }).then(data => {res.json({ note: 'New node registered with network successfully.'})});

}); 


app.post('/register-node', function(req, res){
    const newNodeUrl = req.body.newNodeUrl;
    const nodeNotAlreadyPresent = ballotBox.networkNodes.indexOf(newNodeUrl) == -1;
    const notCurrentNode = ballotBox.currentNodeUrl !== newNodeUrl;
    if(nodeNotAlreadyPresent && notCurrentNode) ballotBox.networkNodes.push(newNodeUrl);
    res.json({ note: 'new node registered successfully'});
});


app.post('/register-nodes-bulk', function(req, res){
    const allNetworkNodes = req.body.allNetworkNodes;
    allNetworkNodes.forEach(networkNodeUrl => {
    const nodeNotAlreadyPresent = ballotBox.networkNodes.indexOf(networkNodeUrl) == -1;
    const notCurrentNode = ballotBox.currentNodeUrl !== networkNodeUrl;
    if (nodeNotAlreadyPresent && notCurrentNode) ballotBox.networkNodes.push(networkNodeUrl);
  });
    res.json({ note: 'built registered successfully'});
});


app.get('/register-node-to-controller', function(req, res) {

    const requestPromises = [];
    const requestOption = {
        uri: 'http://localhost:3000/register-node',
        method: 'POST',
        body: { newNodeUrl: req.protocol + '://' + req.get('host')}, 
        json: true
    }; 
    requestPromises.push(rp(requestOption));

    Promise.all(requestPromises).then(data => {
    res.json({ note: 'New node registered to controller successfully.'})
    });
}); 


app.get("/open-voting-procedure", (req, res) => { 
    voteOpen = true;
    res.json({ note: 'Voting procedure is opened.'});

});


app.post('/vote-broadcast', function(req, res){
    if (voteOpen){   
        var voternationalID = req.body.voterNationalID.toString();
        const mongodb = require('mongodb');
        const MongoClient = mongodb.MongoClient
        const connectionURL = 'mongodb://127.0.0.1:27017'
        const database = 'admin'

        MongoClient.connect(connectionURL, { useNewUrlParser: true}, (error, client) => {
            if(error)
                return console.log("unabl to connect");

            const db = client.db(database) 

            db.collection("citizens").findOne({nationalID:voternationalID}, (function(err, result) {
                if (err) throw err;

                var newVote = ballotBox.createNewVote(voternationalID, result.province, result.town, req.body.party)
                client.close();
                
                ballotBox.addVoteToVotes(newVote);
                const requestPromises = [];
                ballotBox.networkNodes.forEach(networkNodeUrl => {  
                    const requestOptions = {
                        uri: networkNodeUrl + '/vote',
                        method: 'POST', 
                        body: {newVote : newVote},
                        json: true
                    };
                    requestPromises.push(rp(requestOptions));
                });

                Promise.all(requestPromises).then(data =>{res.json({ note: 'Vote created and broadcast successfully.'});
                });   
            }));
       })

    } else {  
        res.json({ note: 'Voting is not open.'});
    }
});


app.post('/vote', function(req, res){
    ballotBox.addVoteToVotes(req.body.newVote);
    res.json({ note: 'New vote added to votes successfully.'});
})


app.get("/close-voting-procedure-and-send-node-votes", (req, res) => {
    voteOpen = false;

    const requestPromise = [];
    const requestOption = {
    uri: 'http://localhost:3000/get-node-votes',
    method: 'POST',
    body: {votes : ballotBox.votes}, 
    json: true
    };
    requestPromise.push(rp(requestOption));

    Promise.all(requestPromise).then(data => {});

    res.json({ note: 'Voting procedure is closed.'});
});





app.listen(port, function(){console.log("listening port " + port);});