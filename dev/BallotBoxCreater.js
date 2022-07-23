const uuid = require('uuid').v1;


function BallotBoxCreater() {
    this.votes = [];
    this.networkNodes = [];
}


BallotBoxCreater.prototype.createNewVote = function(voterNationalID, province, town, party) {
    const newVote = {
        voterNationalID: voterNationalID,
        province: province,
        town: town,
        party: party,
        voteId: uuid().split('-').join('')
    };
    return newVote;
};


BallotBoxCreater.prototype.addVoteToVotes = function(voteObj) {
  this.votes.push(voteObj);
};


module.exports = BallotBoxCreater;