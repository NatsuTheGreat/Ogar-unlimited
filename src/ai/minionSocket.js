// A fake socket for bot players

function minionSocket(gameServer) {
    this.server = gameServer;
}

module.exports = minionSocket;

// Override

minionSocket.prototype.sendPacket = function(packet) {
    // Fakes sending a packet
    return;
};

minionSocket.prototype.close = function(error) {
    // Removes the bot
    var len = this.playerTracker.cells.length;
    for (var i = 0; i < len; i++) {
        var cell = this.playerTracker.cells[0];

        if (!cell) {
            continue;
        }

        this.server.removeNode(cell);
    }

    var index = this.server.clients.indexOf(this);
    if (index != -1) {
        this.server.clients.splice(index, 1);
    }
};
