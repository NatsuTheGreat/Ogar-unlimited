var Packet = require('./packet');
var GameServer = require('./GameServer.js');

function PlayerTracker(gameServer, socket, owner) {
    this.pID = -1;
    this.disconnect = -1; // Disconnection
    this.name = "";
    this.gameServer = gameServer;
    this.socket = socket;
    this.rainbowon = false;
    this.mergeOverrideDuration = 0;
    this.recombineinstant = false;
    this.mi = 0
    this.owner = owner
    this.oldname = "";
    this.norecombine = false;
    this.nodeAdditionQueue = [];
    this.premium = '';
    this.nodeDestroyQueue = [];
    this.visibleNodes = [];
    this.cells = [];
    this.score = 0; // Needed for leaderboard

    this.mouse = {
        x: 0,
        y: 0
    };
    this.mouseCells = []; // For individual cell movement
    this.tickLeaderboard = 0;
    this.tickViewBox = 0;

    this.team = 0;
    this.spectate = false;
    this.freeRoam = false; // Free-roam mode enables player to move in spectate mode
    this.massDecayMult = 1; // Anti-teaming multiplier
    this.actionMult = 0; // If reaches over 1, it'll account as anti-teaming
    this.actionDecayMult = 1; // Players not teaming will lose their anti-teaming multiplier far more quickly

    // Viewing box
    this.sightRangeX = 0;
    this.sightRangeY = 0;
    this.centerPos = { // Center of map
        x: 3000,
        y: 3000
    };
    this.viewBox = {
        topY: 0,
        bottomY: 0,
        leftX: 0,
        rightX: 0,
        width: 0, // Half-width
        height: 0 // Half-height
    };

    // Scramble the coordinate system for anti-raga
    this.scrambleX = 0;
    this.scrambleY = 0;

    // Gamemode function
    if (gameServer) {
        // Find center
        this.centerPos.x = (gameServer.config.borderLeft - gameServer.config.borderRight) / 2;
        this.centerPos.y = (gameServer.config.borderTop - gameServer.config.borderBottom) / 2;
        // Player id
        this.pID = gameServer.getNewPlayerID();
        // Gamemode function
        gameServer.gameMode.onPlayerInit(this);
        // Only scramble if enabled in config
        if (gameServer.config.serverScrambleCoords == 1) {
            this.scrambleX = Math.floor((1 << 15) * Math.random());
            this.scrambleY = Math.floor((1 << 15) * Math.random());
        }
    }
}

module.exports = PlayerTracker;

// Setters/Getters

PlayerTracker.prototype.setName = function(name) {
    this.name = name;

};

PlayerTracker.prototype.getName = function() {
    if (this.gameServer.config.skins == 1) {

        if (this.name.substr(0, 1) == "<") {
            // Premium Skin
            var n = this.name.indexOf(">");
            if (n != -1) {
                if (this.name.substr(1, n - 1) == "r") {
                    this.rainbowon = true;
                } else {
                    this.premium = '%' + this.name.substr(1, n - 1);
                    this.rainbowon = false;
                }
                for (var i in this.gameServer.skinshortcut) {
                    if (!this.gameServer.skinshortcut[i] || !this.gameServer.skin[i]) {
                        continue;
                    }
                    if (this.name.substr(1, n - 1) == this.gameServer.skinshortcut[i]) {
                        this.premium = this.gameServer.skin[i];
                        break;
                    }

                }
                this.name = this.name.substr(n + 1);

            }
        } else if (this.name.substr(0, 1) == "[") {
            // Premium Skin
            var n = this.name.indexOf("]");
            if (n != -1) {

                this.premium = ':http://' + this.name.substr(1, n - 1);
                this.name = this.name.substr(n + 1);
            }
        }
    }
    return this.name;
};

PlayerTracker.prototype.getScore = function(reCalcScore) {
    if (reCalcScore) {
        var s = 0;
        for (var i = 0; i < this.cells.length; i++) {
            s += this.cells[i].mass;
            this.score = s;
        }
    }

    if (this.score > this.gameServer.topscore + 10) {

        if (this.name != this.gameServer.topusername) {
            this.gameServer.oldtopscores.score = this.gameServer.topscore;
            this.gameServer.oldtopscores.name = this.gameServer.topusername;
        }
        this.gameServer.topscore = Math.floor(this.score);
        this.gameServer.topusername = this.name;

        if (this.gameServer.config.showtopscore == 1) {
            console.log("[Console] " + this.name + " Made a new high score of " + Math.floor(this.score));
        }
    }
    return Math.floor(this.score);

};

PlayerTracker.prototype.setColor = function(color) {
    this.color.r = color.r;
    this.color.b = color.b;
    this.color.g = color.g;
};

PlayerTracker.prototype.getTeam = function() {
    return this.team;
};
PlayerTracker.prototype.getPremium = function() {
    return this.premium;
};
// Functions

PlayerTracker.prototype.update = function() {
    // Actions buffer (So that people cant spam packets)
    if (this.socket.packetHandler.pressSpace) { // Split cell
        this.gameServer.gameMode.pressSpace(this.gameServer, this);
        this.socket.packetHandler.pressSpace = false;
    }

    if (this.socket.packetHandler.pressW) { // Eject mass
        this.gameServer.gameMode.pressW(this.gameServer, this);
        this.socket.packetHandler.pressW = false;
    }

    if (this.socket.packetHandler.pressQ) { // Q Press
        this.gameServer.gameMode.pressQ(this.gameServer, this);
        this.socket.packetHandler.pressQ = false;
    }

    var updateNodes = []; // Nodes that need to be updated via packet

    if (this.mergeOverrideDuration < 150 && this.recombineinstant) {
        this.mergeOverrideDuration++;
    } else if (this.recombineinstant) {
        this.recombineinstant = false;
        this.mergeOverrideDuration = 0;
    } else {
        this.mergeOverrideDuration = 0;
    }
    // Remove nodes from visible nodes if possible
    var d = 0;
    while (d < this.nodeDestroyQueue.length) {
        var index = this.visibleNodes.indexOf(this.nodeDestroyQueue[d]);
        if (index > -1) {
            this.visibleNodes.splice(index, 1);
            d++; // Increment
        } else {
            // Node was never visible anyways
            this.nodeDestroyQueue.splice(d, 1);
        }
    }

    // Get visible nodes every 400 ms
    var nonVisibleNodes = []; // Nodes that are not visible
    if (this.tickViewBox <= 0) {
        var newVisible = this.calcViewBox();
        if (newVisible && newVisible.length) {
            try { // Add a try block in any case

                // Compare and destroy nodes that are not seen
                for (var i = 0; i < this.visibleNodes.length; i++) {
                    var index = newVisible.indexOf(this.visibleNodes[i]);
                    if (index == -1) {
                        // Not seen by the client anymore
                        nonVisibleNodes.push(this.visibleNodes[i]);
                    }
                }

                // Add nodes to client's screen if client has not seen it already
                for (var i = 0; i < newVisible.length; i++) {
                    var index = this.visibleNodes.indexOf(newVisible[i]);
                    if (index == -1) {
                        updateNodes.push(newVisible[i]);
                    }
                }
            } finally {} // Catch doesn't work for some reason

            this.visibleNodes = newVisible;
            // Reset Ticks
            this.tickViewBox = 2;
        }
    } else {
        this.tickViewBox--;
        // Add nodes to screen
        for (var i = 0; i < this.nodeAdditionQueue.length; i++) {
            var node = this.nodeAdditionQueue[i];
            this.visibleNodes.push(node);
            updateNodes.push(node);
        }
    }

    // Update moving nodes
    for (var i = 0; i < this.visibleNodes.length; i++) {
        var node = this.visibleNodes[i];
        if (node.sendUpdate()) {
            // Sends an update if cell is moving
            updateNodes.push(node);
        }
    }

    // Send packet
    this.socket.sendPacket(new Packet.UpdateNodes(
        this.nodeDestroyQueue,
        updateNodes,
        nonVisibleNodes,
        this.scrambleX,
        this.scrambleY
    ));

    this.nodeDestroyQueue = []; // Reset destroy queue
    this.nodeAdditionQueue = []; // Reset addition queue

    // Update leaderboard
    if (this.tickLeaderboard <= 0) {
        this.socket.sendPacket(this.gameServer.lb_packet);
        this.tickLeaderboard = 10; // 20 ticks = 1 second
    } else {
        this.tickLeaderboard--;
    }

    // Handles disconnections
    if (this.disconnect > -1) {
        // Player has disconnected... remove it when the timer hits -1
        this.disconnect--;
        if (this.disconnect == -1) {
            // Remove all client cells
            var len = this.cells.length;
            for (var i = 0; i < len; i++) {
                var cell = this.socket.playerTracker.cells[0];

                if (!cell) {
                    continue;
                }

                this.gameServer.removeNode(cell);
            }

            // Remove from client list
            var index = this.gameServer.clients.indexOf(this.socket);
            if (index != -1) {
                this.gameServer.clients.splice(index, 1);
            }
        }
    }
};

// Viewing box
PlayerTracker.prototype.antiTeamTick = function() {
    // ANTI-TEAMING DECAY
    // Calculated even if anti-teaming is disabled.
    this.actionMult *= (0.999 * this.actionDecayMult);
    this.actionDecayMult *= 0.999;

    if (this.actionDecayMult > 1.002004) this.actionDecayMult = 1.002004; // Very small differences. Don't change this.
    if (this.actionDecayMult < 1) this.actionDecayMult = 1;

    // Limit/reset anti-teaming effect
    if (this.actionMult < 1 && this.massDecayMult > 1) this.actionMult = 0.299; // Speed up cooldown
    if (this.actionMult > 1.4) this.actionMult = 1.4;
    if (this.actionMult < 0.15) this.actionMult = 0;

    // Apply anti-teaming if required
    if (this.actionMult > 1) this.massDecayMult = this.actionMult;
    else this.massDecayMult = 1;

}

PlayerTracker.prototype.updateSightRange = function() { // For view distance
    var totalSize = 1.0;
    var len = this.cells.length;

    for (var i = 0; i < len; i++) {
        if (!this.cells[i]) {
            continue;
        }

        totalSize += this.cells[i].getSize();
    }

    var factor = Math.pow(Math.min(64.0 / totalSize, 1), 0.4);
    this.sightRangeX = this.gameServer.config.serverViewBaseX / factor;
    this.sightRangeY = this.gameServer.config.serverViewBaseY / factor;
};

PlayerTracker.prototype.updateCenter = function() { // Get center of cells
    var len = this.cells.length;

    if (len <= 0) {
        return; // End the function if no cells exist
    }

    var X = 0;
    var Y = 0;
    for (var i = 0; i < len; i++) {
        if (!this.cells[i]) {
            continue;
        }

        X += this.cells[i].position.x;
        Y += this.cells[i].position.y;
    }

    this.centerPos.x = X / len;
    this.centerPos.y = Y / len;
};

PlayerTracker.prototype.calcViewBox = function() {
    if (this.spectate) {
        // Spectate mode
        return this.getSpectateNodes();
    }

    // Main function
    this.updateSightRange();
    this.updateCenter();

    // Box
    this.viewBox.topY = this.centerPos.y - this.sightRangeY;
    this.viewBox.bottomY = this.centerPos.y + this.sightRangeY;
    this.viewBox.leftX = this.centerPos.x - this.sightRangeX;
    this.viewBox.rightX = this.centerPos.x + this.sightRangeX;
    this.viewBox.width = this.sightRangeX;
    this.viewBox.height = this.sightRangeY;

    var newVisible = [];
    for (var i = 0; i < this.gameServer.nodes.length; i++) {
        node = this.gameServer.nodes[i];

        if (!node) {
            continue;
        }

        if (node.visibleCheck(this.viewBox, this.centerPos)) {
            // Cell is in range of viewBox
            newVisible.push(node);
        }
    }
    return newVisible;
};

PlayerTracker.prototype.getSpectateNodes = function() {
    var specPlayer;

    if (!this.freeRoam && this.gameServer.largestClient) {
        // TODO: Sort out switch between playerTracker.playerTracker.x and playerTracker.x problem.
        specPlayer = this.gameServer.largestClient;
        // Detect specByLeaderboard as player trackers are complicated
        if (!this.gameServer.gameMode.specByLeaderboard && specPlayer && specPlayer.playerTracker) {
            // Get spectated player's location and calculate zoom amount
            var specZoom = Math.sqrt(100 * specPlayer.playerTracker.score);
            specZoom = Math.pow(Math.min(40.5 / specZoom, 1.0), 0.4) * 0.6;

            // Apparently doing this.centerPos = specPlayer.centerPos will set based on reference. We don't want this
            this.centerPos.x = specPlayer.playerTracker.centerPos.x;
            this.centerPos.y = specPlayer.playerTracker.centerPos.y;

            this.sendCustomPosPacket(specPlayer.playerTracker.centerPos.x, specPlayer.playerTracker.centerPos.y, specZoom);
            return specPlayer.playerTracker.visibleNodes.slice(0, specPlayer.playerTracker.visibleNodes.length);

        } else if (this.gameServer.gameMode.specByLeaderboard && specPlayer) {
            // Get spectated player's location and calculate zoom amount
            var specZoom = Math.sqrt(100 * specPlayer.score);
            specZoom = Math.pow(Math.min(40.5 / specZoom, 1.0), 0.4) * 0.6;

            // Apparently doing this.centerPos = specPlayer.centerPos will set based on reference. We don't want this
            this.centerPos.x = specPlayer.centerPos.x;
            this.centerPos.y = specPlayer.centerPos.y;

            this.sendCustomPosPacket(specPlayer.centerPos.x, specPlayer.centerPos.y, specZoom);
            return specPlayer.visibleNodes.slice(0, specPlayer.visibleNodes.length);
        }
    } else {
        // User is in free roam
        // To mimic agar.io, get distance from center to mouse and apply a part of the distance
        specPlayer = null;

        var dist = this.gameServer.getDist(this.mouse.x, this.mouse.y, this.centerPos.x, this.centerPos.y);
        var angle = this.getAngle(this.mouse.x, this.mouse.y, this.centerPos.x, this.centerPos.y);
        var speed = Math.min(dist / 10, 190); // Not to break laws of universe by going faster than light speed

        this.centerPos.x += speed * Math.sin(angle);
        this.centerPos.y += speed * Math.cos(angle);
        this.updateCenter();

        // Check if went away from borders
        this.checkBorderPass();

        // Now that we've updated center pos, get nearby cells
        // We're going to use config's view base times 2.5

        var mult = 2.5; // To simplify multiplier, in case this needs editing later on
        this.viewBox.topY = this.centerPos.y - this.gameServer.config.serverViewBaseY * mult;
        this.viewBox.bottomY = this.centerPos.y + this.gameServer.config.serverViewBaseY * mult;
        this.viewBox.leftX = this.centerPos.x - this.gameServer.config.serverViewBaseX * mult;
        this.viewBox.rightX = this.centerPos.x + this.gameServer.config.serverViewBaseX * mult;
        this.viewBox.width = this.gameServer.config.serverViewBaseX * mult;
        this.viewBox.height = this.gameServer.config.serverViewBaseY * mult;

        // Use calcViewBox's way of looking for nodes
        var newVisible = [];
        for (var i = 0; i < this.gameServer.nodes.length; i++) {
            node = this.gameServer.nodes[i];

            if (!node) {
                continue;
            }

            if (node.visibleCheck(this.viewBox, this.centerPos)) {
                // Cell is in range of viewBox
                newVisible.push(node);
            }
        }
        var specZoom = Math.sqrt(100 * 150);
        specZoom = Math.pow(Math.min(40.5 / 150, 1.0), 0.4) * 0.6; // Constant zoom
        this.sendPosPacket(specZoom);
        return newVisible;
    }
};

PlayerTracker.prototype.checkBorderPass = function() {
    // A check while in free-roam mode to avoid player going into nothingness
    if (this.centerPos.x < this.gameServer.config.borderLeft) {
        this.centerPos.x = this.gameServer.config.borderLeft;
    }
    if (this.centerPos.x > this.gameServer.config.borderRight) {
        this.centerPos.x = this.gameServer.config.borderRight;
    }
    if (this.centerPos.y < this.gameServer.config.borderTop) {
        this.centerPos.y = this.gameServer.config.borderTop;
    }
    if (this.centerPos.y > this.gameServer.config.borderBottom) {
        this.centerPos.y = this.gameServer.config.borderBottom;
    }
};

PlayerTracker.prototype.sendPosPacket = function(specZoom) {
    // TODO: Send packet elsewhere so it is sent more often
    this.socket.sendPacket(new Packet.UpdatePosition(
        this.centerPos.x + this.scrambleX,
        this.centerPos.y + this.scrambleY,
        specZoom
    ));
};

PlayerTracker.prototype.sendCustomPosPacket = function(x, y, specZoom) {
    // TODO: Send packet elsewhere so it is sent more often
    this.socket.sendPacket(new Packet.UpdatePosition(
        x + this.scrambleX,
        y + this.scrambleY,
        specZoom
    ));
};

PlayerTracker.prototype.getAngle = function(x1, y1, x2, y2) {
    var deltaY = y1 - y2;
    var deltaX = x1 - x2;
    return Math.atan2(deltaX, deltaY);
};
