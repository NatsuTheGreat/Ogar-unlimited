// Project imports
var BotPlayer = require('./minionPlayer');
var FakeSocket = require('./minionSocket');
var PacketHandler = require('../PacketHandler');

function minionLoader(gameServer) {
    this.gameServer = gameServer;
    this.loadNames();
}

module.exports = minionLoader;

minionLoader.prototype.getName = function() {
    var name = this.gameServer.minionname;

    return name;
};

minionLoader.prototype.loadNames = function() {
    this.randomNames = [];

    // Load names
    try {
        var fs = require("fs"); // Import the util library

        // Read and parse the names - filter out whitespace-only names
        this.randomNames = fs.readFileSync("./botnames.txt", "utf8").split(/[\r\n]+/).filter(function(x) {
            return x != ''; // filter empty names
        });
    } catch (e) {
        // Nothing, use the default names
    }

    this.nameIndex = 0;
};

minionLoader.prototype.addBot = function(owner) {
    var s = new FakeSocket(this.gameServer);
    s.playerTracker = new BotPlayer(this.gameServer, s,owner);
    s.packetHandler = new PacketHandler(this.gameServer, s);

    // Add to client list
    this.gameServer.clients.push(s);

    // Add to world
    s.packetHandler.setNickname(this.getName());
};
