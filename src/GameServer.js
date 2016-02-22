// Library imports 
var WebSocket = require('ws');
var http = require('http');
var fs = require("fs");
var ini = require('./modules/ini.js');
var EOL = require('os').EOL;
// Project imports
var Packet = require('./packet');
var PlayerTracker = require('./PlayerTracker');
var PacketHandler = require('./PacketHandler');
var Entity = require('./entity');
var Cell = require('./entity/Cell.js');
var Gamemode = require('./gamemodes');
var BotLoader = require('./ai/BotLoader');
var Logger = require('./modules/log');

// GameServer implementation
function GameServer() {
    this.skinshortcut = [];
    this.skin = [];
    this.ipCounts = [];
    this.minionleader;
    this.rnodes = [];
    this.lleaderboard = false;
    this.topscore = 50;
    this.topusername = "None";
    this.red = false;
    this.nospawn = [];
    this.green = false;
    this.rrticks = 0;
    this.minion = false;
    this.miniontarget = {x: 0,y: 0};
    this.blue = false;
    this.bold = false;
    this.white = false;
    this.dim = false;
    this.yellow = false;
    this.resticks = 0;
    this.spawnv = 1;
    this.overideauto = false;
    this.livestage = 0;
    this.pop = [];
    this.troll = [];
    this.firstl = true;
    this.liveticks = 0;
    this.run = true;
    this.op = [];
    this.whlist = [];
    this.pmsg = 0;
    this.pfmsg = 0;
    this.opc = [];
    this.oppname = [];
    this.opname = [];
    this.lastNodeId = 1;
    this.lastPlayerId = 1;
    this.clients = [];
    this.oldtopscores = {
        score: 100,
        name: "none"
    };
    this.nodes = [];
    this.nodesVirus = []; // Virus nodes
    this.nodesEjected = []; // Ejected mass nodes
    this.nodesPlayer = []; // Nodes controlled by players
    this.banned = [];
    this.currentFood = 0;
    this.movingNodes = []; // For move engine
    this.leaderboard = []; // leaderboard
    this.lb_packet = new ArrayBuffer(0); // Leaderboard packet
    this.largestClient;
    this.colors = [{
            'r': 255,
            'g': 0,
            'b': 0
        }, // Red
        {
            'r': 255,
            'g': 32,
            'b': 0
        }, {
            'r': 255,
            'g': 64,
            'b': 0
        }, {
            'r': 255,
            'g': 96,
            'b': 0
        }, {
            'r': 255,
            'g': 128,
            'b': 0
        }, // Orange
        {
            'r': 255,
            'g': 160,
            'b': 0
        }, {
            'r': 255,
            'g': 192,
            'b': 0
        }, {
            'r': 255,
            'g': 224,
            'b': 0
        }, {
            'r': 255,
            'g': 255,
            'b': 0
        }, // Yellow
        {
            'r': 192,
            'g': 255,
            'b': 0
        }, {
            'r': 128,
            'g': 255,
            'b': 0
        }, {
            'r': 64,
            'g': 255,
            'b': 0
        }, {
            'r': 0,
            'g': 255,
            'b': 0
        }, // Green
        {
            'r': 0,
            'g': 192,
            'b': 64
        }, {
            'r': 0,
            'g': 128,
            'b': 128
        }, {
            'r': 0,
            'g': 64,
            'b': 192
        }, {
            'r': 0,
            'g': 0,
            'b': 255
        }, // Blue
        {
            'r': 18,
            'g': 0,
            'b': 192
        }, {
            'r': 37,
            'g': 0,
            'b': 128
        }, {
            'r': 56,
            'g': 0,
            'b': 64
        }, {
            'r': 75,
            'g': 0,
            'b': 130
        }, // Indigo
        {
            'r': 92,
            'g': 0,
            'b': 161
        }, {
            'r': 109,
            'g': 0,
            'b': 192
        }, {
            'r': 126,
            'g': 0,
            'b': 223
        }, {
            'r': 143,
            'g': 0,
            'b': 255
        }, // Purple
        {
            'r': 171,
            'g': 0,
            'b': 192
        }, {
            'r': 199,
            'g': 0,
            'b': 128
        }, {
            'r': 227,
            'g': 0,
            'b': 64
        },
    ];

    this.bots = new BotLoader(this);
    this.log = new Logger();
    this.commands; // Command handler

    // Main loop tick
    this.time = +new Date;
    this.startTime = this.time;
    this.tick = 0; // 1 second ticks of mainLoop
    this.tickMain = 0; // 50 ms ticks, 20 of these = 1 leaderboard update
    this.tickSpawn = 0; // Used with spawning food

    // Config
    this.config = { // Border - Right: X increases, Down: Y increases (as of 2015-05-20)
        autoban: 0, // Auto bans a player if they are cheating
        randomEjectMassColor: 0, // 0 = off 1 = on
        ffaTimeLimit: 60, // TFFA time
        ffaMaxLB: 10, // Max leaderboard slots
        showtopscore: 0, // Shows top score (1 to enable)
        anounceDelay: 70, // Announce delay
        anounceDuration: 8, // How long the announce lasts
        ejectantispeed: 120, // Speed of ejected anti matter
        maxopvirus: 60, // Maximum amount of OP viruses
        skins: 1,
        viruscolorintense: 255,
        SpikedCells: 0, // Amount of spiked cells
        autopause: 1, // Auto pauses the game when there are no players (0 to turn off)
        smartbthome: 1, // Automatically sends you back to normal mode after pressing Q proceding an action (default) 2 = off (you need to press Q a lot)
        restartmin: 0, // minutes to restart
        showopactions: 0, // Notifys you of an OP using his power, (0 = Off [default]) 1 = on
        cRestoreTicks: 10, // Amount of time until the collision retores
        showbmessage: 0, // Notifys you if a banned player tried to join (0 = off [default]) 1 = on
        splitSpeed: 130, // Splitting speed
        showjlinfo: 0, // Notifys you if a player has left or joined (0 = off [default]) 1 = on
        ejectvspeed: 120, // How far an ejected virus (from w) shoots
        serverMaxConnectionsPerIp: 5, // Maximum amount of IPs per player connection
        serverMaxConnections: 64, // Maximum amount of connections to the server.
        serverPort: 443, // Server port
        botrespawn: 1,
        rainbow: 1,
        rainbowspeed: 1,
        botupdate: 10,
        notifyupdate: 1,
        autoupdate: 0,
        customskins: 1,
        serverGamemode: 0, // Gamemode, 0 = FFA, 1 = Teams
        serverBots: 0, // Amount of player bots to spawn
        serverViewBaseX: 1024, // Base view distance of players. Warning: high values may cause lag
        serverViewBaseY: 592, // Same thing as line 77
        serverStatsPort: 88, // Port for stats server. Having a negative number will disable the stats server.
        serverStatsUpdate: 60, // Amount of seconds per update for the server stats
        serverLogLevel: 1, // Logging level of the server. 0 = No logs, 1 = Logs the console, 2 = Logs console and ip connections
        serverScrambleCoords: 1, // Toggles scrambling of coordinates. 0 = No scrambling, 1 = scrambling. Default is 1.
        borderLeft: 0, // Left border of map (Vanilla value: 0)
        borderRight: 6000, // Right border of map (Vanilla value: 11180.3398875)
        borderTop: 0, // Top border of map (Vanilla value: 0)
        borderBottom: 6000, // Bottom border of map (Vanilla value: 11180.3398875)
        liveConsole: 0, // Easiest way to get stats (1 to enable)
        anounceHighScore: 0, // Announces highscore (1 to enable)
        spawnInterval: 20, // The interval between each food cell spawn in ticks (1 tick = 50 ms)
        foodSpawnAmount: 10, // The amount of food to spawn per interval
        foodStartAmount: 100, // The starting amount of food in the map
        foodMaxAmount: 500, // Maximum food cells on the map
        foodMass: 1, // Starting food size (In mass)
        teaming: 1, // teaming or anti teaming
        foodMassGrow: 0, // Enable food mass grow ?
        playerFastDecay: 0,
        fastdecayrequire: 5000,
        FDmultiplyer: 5,
        antimatter: 1,
        merge: 1,
        virus: 1,
        clientclone: 0,
        mass: 1,
        killvirus: 1,
        kickvirus: 1,
        trollvirus: 1,
        explodevirus: 1,
        foodMassGrowPossiblity: 50, // Chance for a food to has the ability to be self growing
        foodMassLimit: 5, // Maximum mass for a food can grow
        foodMassTimeout: 120, // The amount of interval for a food to grow its mass (in seconds)
        virusMinAmount: 10, // Minimum amount of viruses on the map.
        virusMaxAmount: 50, // Maximum amount of viruses on the map. If this amount is reached, then ejected cells will pass through viruses.
        virusStartMass: 100, // Starting virus size (In mass)
        virusFeedAmount: 7, // Amount of times you need to feed a virus to shoot it
        motherCellMassProtection: 1, // Stopping mothercells from being too big (0 to disable)
        motherCellMaxMass: 10000, // Max mass of a mothercell
        ejectMass: 12, // Mass of ejected cells
        ejectMassCooldown: 200, // Time until a player can eject mass again
        ejectMassLoss: 16, // Mass lost when ejecting cells
        ejectSpeed: 160, // Base speed of ejected cells
        massAbsorbedPercent: 100, // Fraction of player cell's mass gained upon eating
        ejectSpawnPlayer: 50, // Chance for a player to spawn from ejected mass
        playerStartMass: 10, // Starting mass of the player cell.
        playerMaxMass: 22500, // Maximum mass a player can have
        playerMinMassEject: 32, // Mass required to eject a cell
        playerMinMassSplit: 36, // Mass required to split
        playerMaxCells: 16, // Max cells the player is allowed to have
        playerRecombineTime: 30, // Base amount of seconds before a cell is allowed to recombine
        playerMassDecayRate: .002, // Amount of mass lost per second
        playerMinMassDecay: 9, // Minimum mass for decay to occur
        playerMaxNickLength: 15, // Maximum nick length
        playerSpeed: 30, // Player base speed
        playerDisconnectTime: 60, // The amount of seconds it takes for a player cell to be removed after disconnection (If set to -1, cells are never removed)
        tourneyMaxPlayers: 12, // Maximum amount of participants for tournament style game modes
        tourneyPrepTime: 10, // Amount of ticks to wait after all players are ready (1 tick = 1000 ms)
        tourneyEndTime: 30, // Amount of ticks to wait after a player wins (1 tick = 1000 ms)
        tourneyTimeLimit: 20, // Time limit of the game, in minutes.
        tourneyAutoFill: 0, // If set to a value higher than 0, the tournament match will automatically fill up with bots after this amount of seconds
        tourneyAutoFillPlayers: 1, // The timer for filling the server with bots will not count down unless there is this amount of real players
    };
    // Parse config
    this.loadConfig();

    // Gamemodes
    this.gameMode = Gamemode.get(this.config.serverGamemode);
}

module.exports = GameServer;

GameServer.prototype.start = function() {
    // Logging
    this.log.setup(this);
    ipcounts = [];
    // Gamemode configurations
    this.gameMode.onServerInit(this);

    // Start the server
    this.socketServer = new WebSocket.Server({
        port: this.config.serverPort,
        perMessageDeflate: false
    }, function() {
        // Spawn starting food
        this.startingFood();

        // Start Main Loop
        setInterval(this.mainLoop.bind(this), 1);

        // Done
        var fs = require("fs"); // Import the util library
        try {
            if (!fs.existsSync('customskins.txt')) {
                console.log("[Console] Generating customskin.txt...");
                request('https://raw.githubusercontent.com/AJS-development/Ogar-unlimited/master/src/customskins.txt', function(error, response, body) {
                    if (!error && response.statusCode == 200) {

                        fs.writeFileSync('customskins.txt', body);

                    } else {
                        console.log("[Update] Could not fetch data from servers... will generate empty file");
                        fs.writeFileSync('customskins.txt', "");
                    }
                });

            }
            var loadskins = fs.readFileSync("customskins.txt", "utf8").split(/[\r\n]+/).filter(function(x) {
                return x != ''; // filter empty names
            });
        if (this.config.customskins == 1) {
            for (var i in loadskins) {
                var custom = loadskins[i].split(" ");
                this.skinshortcut[i] = custom[0];
                this.skin[i] = custom[1];
            }
            }
        } catch (e) {

        }
        console.log("[Game] Listening on port " + this.config.serverPort);
        console.log("[Game] Current game mode is " + this.gameMode.name);
        Cell.spi = this.config.SpikedCells;
        Cell.virusi = this.config.viruscolorintense;
        if (this.config.anounceHighScore == 1) {
            var execute = this.commands["announce"];
            execute(this, "");
        }

        // Player bots (Experimental)
        if (this.config.serverBots > 0) {
            for (var i = 0; i < this.config.serverBots; i++) {
                this.bots.addBot();
            }
            console.log("[Game] Loaded " + this.config.serverBots + " player bots");
        }
        if (this.config.restartmin != 0) {
            var split = [];
            split[1] = this.config.restartmin;
            var execute = this.commands["restart"];
            execute(this, split);
        }
        if (this.config.notifyupdate == 1) {
            var request = require('request');
            var game = this;
            request('http://raw.githubusercontent.com/AJS-development/verse/master/update', function(error, response, body) {
                if (!error && response.statusCode == 200) {
                    var split = body.split(" ");
                    if (split[0].replace('\n', '') != "9.0.2") {

                        console.log("\x1b[31m[Console] We have detected a update, Current version: 9.0.2 ,Available: " + split[0].replace('\n', ''));
if (split[1]) {
    console.log("\x1b[31m[Console] Update Details: " + split[1].replace('\n', ''));
    
} else {
    console.log("\x1b[31m[Console] Update Details: No Description Provided");
}
                        if (game.config.autoupdate == 1) {
                            console.log("[Console] Initiating Autoupdate\x1b[0m");
                            var split = [];
                            split[1] = "yes"
                            var execute = game.commands["update"];
                            execute(game, split);
                        } else {
                            console.log("[Console] To update quickly, use the update command!\x1b[0m");
                        }
                    }
                }
            });
        }
    }.bind(this));

    this.socketServer.on('connection', connectionEstablished.bind(this));

    // Properly handle errors because some people are too lazy to read the readme
    this.socketServer.on('error', function err(e) {
        switch (e.code) {
            case "EADDRINUSE":
                console.log("[Error] Server could not bind to port! Please close out of Skype or change 'serverPort' in gameserver.ini to a different number.");
                break;
            case "EACCES":
                console.log("[Error] Please make sure you are running Ogar with root privileges.");
                break;
            default:
                console.log("[Error] Unhandled error code: " + e.code);
                break;
        }
        process.exit(1); // Exits the program
    });

    function connectionEstablished(ws) {
        if (this.clients.length >= this.config.serverMaxConnections) { // Server full
            ws.close();
            return;
        }
     if (this.config.clientclone != 1) {
        // ----- Client authenticity check code -----
        // !!!!! WARNING !!!!!
        // THE BELOW SECTION OF CODE CHECKS TO ENSURE THAT CONNECTIONS ARE COMING
        // FROM THE OFFICIAL AGAR.IO CLIENT. IF YOU REMOVE OR MODIFY THE BELOW
        // SECTION OF CODE TO ALLOW CONNECTIONS FROM A CLIENT ON A DIFFERENT DOMAIN,
        // YOU MAY BE COMMITTING COPYRIGHT INFRINGEMENT AND LEGAL ACTION MAY BE TAKEN
        // AGAINST YOU. THIS SECTION OF CODE WAS ADDED ON JULY 9, 2015 AT THE REQUEST
        // OF THE AGAR.IO DEVELOPERS.
        var origin = ws.upgradeReq.headers.origin;
        if (origin != 'http://agar.io' &&
            origin != 'https://agar.io' &&
            origin != 'http://localhost' &&
            origin != 'https://localhost' &&
            origin != 'http://127.0.0.1' &&
            origin != 'https://127.0.0.1') {
            ws.close();
            return;
        }
     }
        // -----/Client authenticity check code -----
        showlmsg = this.config.showjlinfo;

        if ((ipcounts[ws._socket.remoteAddress] >= this.config.serverMaxConnectionsPerIp) && (this.whlist.indexOf(ws._socket.remoteAddress) == -1)) {

            this.nospawn[ws._socket.remoteAddress] = true;

            if (this.config.autoban == 1 && (this.banned.indexOf(ws._socket.remoteAddress) == -1)) {
                if (this.config.showbmessage == 1) {
                    console.log("Added " + ws._socket.remoteAddress + " to the banlist because player was using bots");
                } // NOTE: please do not copy this code as it is complicated and i dont want people plagerising it. to have it in yours please ask nicely

                this.banned.push(ws._socket.remoteAddress);

                // Remove from game
                for (var i in this.clients) {
                    var c = this.clients[i];
                    if (!c.remoteAddress) {
                        continue;
                    }
                    if (c.remoteAddress == ws._socket.remoteAddress) {

                        //this.socket.close();
                        c.close(); // Kick out
                    }
                }
            }
        } else {
            this.nospawn[ws._socket.remoteAddress] = false;
        }
        if ((this.banned.indexOf(ws._socket.remoteAddress) != -1) && (this.whlist.indexOf(ws._socket.remoteAddress) == -1)) { // Banned
            if (this.config.showbmessage == 1) {
                console.log("Client " + ws._socket.remoteAddress + ", tried to connect but is banned!");
            }
            this.nospawn[ws._socket.remoteAddress] = true;
        }
        if (ipcounts[ws._socket.remoteAddress]) {
            ipcounts[ws._socket.remoteAddress]++;
        } else {
            ipcounts[ws._socket.remoteAddress] = 1;
        }

        if (this.config.showjlinfo == 1) {
            console.log("A player with an IP of " + ws._socket.remoteAddress + " joined the game");
        }

        function close(error) {
            ipcounts[this.socket.remoteAddress]--;
            // Log disconnections
            if (showlmsg == 1) {
                console.log("A player with an IP of " + this.socket.remoteAddress + " left the game");
            }
            this.server.log.onDisconnect(this.socket.remoteAddress);

            var client = this.socket.playerTracker;
            var len = this.socket.playerTracker.cells.length;

            for (var i = 0; i < len; i++) {
                var cell = this.socket.playerTracker.cells[i];

                if (!cell) {
                    continue;
                }

                cell.calcMove = function() {
                    return;
                }; // Clear function so that the cell cant move
                //this.server.removeNode(cell);
            }

            client.disconnect = this.server.config.playerDisconnectTime * 20;
            this.socket.sendPacket = function() {
                return;
            }; // Clear function so no packets are sent
        }

        ws.remoteAddress = ws._socket.remoteAddress;
        ws.remotePort = ws._socket.remotePort;
        this.log.onConnect(ws.remoteAddress); // Log connections

        ws.playerTracker = new PlayerTracker(this, ws);
        ws.packetHandler = new PacketHandler(this, ws);
        ws.on('message', ws.packetHandler.handleMessage.bind(ws.packetHandler));

        var bindObject = {
            server: this,
            socket: ws
        };
        ws.on('error', close.bind(bindObject));
        ws.on('close', close.bind(bindObject));
        this.clients.push(ws);
    }

    this.startStatsServer(this.config.serverStatsPort);
};
GameServer.prototype.getMode = function() {
    return this.gameMode;
};

GameServer.prototype.getNextNodeId = function() {
    // Resets integer
    if (this.lastNodeId > 2147483647) {
        this.lastNodeId = 1;
    }
    return this.lastNodeId++;
};

GameServer.prototype.getNewPlayerID = function() {
    // Resets integer
    if (this.lastPlayerId > 2147483647) {
        this.lastPlayerId = 1;
    }
    return this.lastPlayerId++;
};

GameServer.prototype.liveconsole = function() {
    if (this.livestage == 0) {
        if (this.liveticks > 80) {
            this.livestage = 1;
            this.firstl = true;
            this.liveticks = 0;
        }
        var players = 0;
        this.clients.forEach(function(client) {
            if (client.playerTracker && client.playerTracker.cells.length > 0)
                players++
        });
        var line1 = "               Status                            ";
        var line2 = "       Players:      " + this.clients.length + "                           ";
        var line3 = "       Spectators:   " + (this.clients.length - players) + "                            ";
        var line4 = "       Alive:        " + players + "                          ";
        var line5 = "       Max Players:  " + this.config.serverMaxConnections + "                        ";
        var line6 = "       Start Time:   " + this.startTime + "                ";
    } else
    if (this.livestage == 1) {
        if (this.liveticks > 80) {
            this.liveticks = 0;
            this.firstl = true;
            this.livestage = 2;
        }
        var players = 0;
        this.clients.forEach(function(client) {
            if (client.playerTracker && client.playerTracker.cells.length > 0)
                players++
        });
        if (!this.gameMode.haveTeams && this.lleaderboard) {
            if (this.leaderboard.length <= 0) {
                var l1 = "No Players";
                var l2 = "Are Playing";
                var l3 = "";
                var l4 = "";
                var l5 = "";
            } else {
                if (typeof this.leaderboard[0] != "undefined") {
                    var l1 = this.leaderboard[0].name;
                } else {
                    var l1 = "None"
                }
                if (typeof this.leaderboard[1] != "undefined") {
                    var l2 = this.leaderboard[1].name;
                } else {
                    var l2 = "None"
                }
                if (typeof this.leaderboard[2] != "undefined") {
                    var l3 = this.leaderboard[2].name;
                } else {
                    var l3 = "None"
                }
                if (typeof this.leaderboard[3] != "undefined") {
                    var l4 = this.leaderboard[3].name;
                } else {
                    var l4 = "None"
                }
                if (typeof this.leaderboard[4] != "undefined") {
                    var l5 = this.leaderboard[4].name;
                } else {
                    var l5 = "None"
                }
            }
        } else {
            var l1 = "Sorry, No leader";
            var l2 = "Board in Teams!";
            var l3 = "Or in MSG Mode";
            var l4 = "";
            var l5 = "";
        }
        var line1 = "              Leaderboard                   ";
        var line2 = "               1." + l1 + "                    ";
        var line3 = "               2." + l2 + "                    ";
        var line4 = "               3." + l3 + "                    ";
        var line5 = "               4." + l4 + "                    ";
        var line6 = "               5." + l5 + "                    ";
    } else
    if (this.livestage == 2) {
        if (this.liveticks > 80) {
            this.livestage = 0;
            this.liveticks = 0;
            this.firstl = true;
        }
        var line1 = "               Status                            ";
        var line2 = "       Uptime:      " + process.uptime() + "                    ";
        var line3 = "       Memory:      " + process.memoryUsage().heapUsed / 1000 + "/" + process.memoryUsage().heapTotal / 1000 + " kb";
        var line4 = "       Banned:      " + this.banned.length + "        ";
        var line5 = "       Highscore:   " + this.topscore + " By " + this.topusername + "      ";
        var line6 = "                                                ";
    }
    if (this.firstl) {
        process.stdout.write("\x1b[0m\u001B[s\u001B[H\u001B[6r");
        process.stdout.write("\u001B[8;36;44m   ___                                                                        " + EOL);
        process.stdout.write("  / _ \\ __ _ __ _ _ _                                                         " + EOL);
        process.stdout.write(" | (_) / _` / _` | '_|                                                        " + EOL);
        process.stdout.write("  \\___/\\__, \\__,_|_|                                                          " + EOL);
        process.stdout.write("\u001B[4m       |___/                                                                  " + EOL);
        process.stdout.write("   u n l i m i t e d                                                          " + EOL);
        process.stdout.write("\x1b[0m\u001B[0m\u001B[u");
        this.firstl = false;
    }

    if (this.resticks > 29) {
        this.firstl = true;
        this.resticks = 0;
    } else {
        this.resticks++;
    }

    process.stdout.write("\x1b[0m\u001B[s\u001B[H\u001B[6r");
    process.stdout.write("\u001B[8;36;44m   ___                  " + line1 + EOL);
    process.stdout.write("  / _ \\ __ _ __ _ _ _   " + line2 + EOL);
    process.stdout.write(" | (_) / _` / _` | '_|  " + line3 + EOL);
    process.stdout.write("  \\___/\\__, \\__,_|_|    " + line4 + EOL);
    process.stdout.write("\u001B[4m       |___/            " + line5 + EOL);
    process.stdout.write("   u n l i m i t e d    " + line6 + EOL);
    process.stdout.write("\x1b[0m\u001B[0m\u001B[u");

    if (this.red) {
        process.stdout.write("\x1b[31m\r");
    }
    if (this.green) {
        process.stdout.write("\x1b[32m\r");
    }
    if (this.blue) {
        process.stdout.write("\x1b[34m\r");
    }
    if (this.white) {
        process.stdout.write("\x1b[37m\r");
    }
    if (this.yellow) {
        process.stdout.write("\x1b[33m\r");
    }
    if (this.bold) {
        process.stdout.write("\x1b[1m\r");
    }
    if (this.dim) {
        process.stdout.write("\x1b[2m\r");
    }
    this.liveticks++;
};

GameServer.prototype.getRandomPosition = function() {
    return {
        x: Math.floor(Math.random() * (this.config.borderRight - this.config.borderLeft)) + this.config.borderLeft,
        y: Math.floor(Math.random() * (this.config.borderBottom - this.config.borderTop)) + this.config.borderTop
    };
};

GameServer.prototype.getRandomSpawn = function() {
    // Random spawns for players
    var pos;

    if (this.currentFood > 0) {
        // Spawn from food
        var node;
        for (var i = (this.nodes.length - 1); i > -1; i--) {
            // Find random food
            node = this.nodes[i];

            if (!node || node.inRange) {
                // Skip if food is about to be eaten/undefined
                continue;
            }

            if (node.getType() == 1) {
                pos = {
                    x: node.position.x,
                    y: node.position.y
                };
                this.removeNode(node);
                break;
            }
        }
    }

    if (!pos) {
        // Get random spawn if no food cell is found
        pos = this.getRandomPosition();
    }

    return pos;
};

GameServer.prototype.getRandomColor = function() {
    var colorRGB = [0xFF, 0x07, ((Math.random() * (256 - 7)) >> 0) + 7];
    colorRGB.sort(function() {
        return 0.5 - Math.random()
    });

    return {
        r: colorRGB[0],
        b: colorRGB[1],
        g: colorRGB[2]
    };
};

GameServer.prototype.addNode = function(node) {
    this.nodes.push(node);

    // Adds to the owning player's screen
    if (node.owner) {
        node.setColor(node.owner.color);
        node.owner.cells.push(node);
        node.owner.socket.sendPacket(new Packet.AddNode(node));
    }

    // Special on-add actions
    node.onAdd(this);

    // Add to visible nodes
    for (var i = 0; i < this.clients.length; i++) {
        client = this.clients[i].playerTracker;
        if (!client) {
            continue;
        }

        // client.nodeAdditionQueue is only used by human players, not bots
        // for bots it just gets collected forever, using ever-increasing amounts of memory
        if ('_socket' in client.socket && node.visibleCheck(client.viewBox, client.centerPos)) {
            client.nodeAdditionQueue.push(node);
        }
    }
};

GameServer.prototype.removeNode = function(node) {
    // Remove from main nodes list
    var index = this.nodes.indexOf(node);
    if (index != -1) {
        this.nodes.splice(index, 1);
    }

    // Remove from moving cells list
    index = this.movingNodes.indexOf(node);
    if (index != -1) {
        this.movingNodes.splice(index, 1);
    }

    // Special on-remove actions
    node.onRemove(this);

    // Animation when eating
    for (var i = 0; i < this.clients.length; i++) {
        client = this.clients[i].playerTracker;
        if (!client) {
            continue;
        }

        // Remove from client
        client.nodeDestroyQueue.push(node);
    }
};

GameServer.prototype.cellTick = function() {
    // Move cells
    this.updateMoveEngine();
};

GameServer.prototype.spawnTick = function() {
    // Spawn food
    this.tickSpawn++;
    if (this.tickSpawn >= this.config.spawnInterval) {
        this.updateFood(); // Spawn food
        this.virusCheck(); // Spawn viruses

        this.tickSpawn = 0; // Reset
    }
};

GameServer.prototype.gamemodeTick = function() {
    // Gamemode tick
    this.gameMode.onTick(this);
};

GameServer.prototype.cellUpdateTick = function() {
    // Update cells
    this.updateCells();
};

GameServer.prototype.mainLoop = function() {
    // Timer
    var local = new Date();
    this.tick += (local - this.time);
    this.time = local;

    if (this.tick >= 50) {
        // Loop main functions
        if (this.run) {
            setTimeout(this.cellTick(), 0);
            setTimeout(this.spawnTick(), 0);
            setTimeout(this.gamemodeTick(), 0);
        }

        if (this.config.liveConsole == 1) {
            this.liveconsole();
        }
        // Update the client's maps
        this.updateClients();
        setTimeout(this.cellUpdateTick(), 0);

        // Update cells/leaderboard loop
        this.tickMain++;
        var count = 0;
        for (var i in this.rnodes) {
            node = this.rnodes[i];

            if (!node) {
                continue;
            }

            count++;

            if (typeof node.rainbow == 'undefined') {
                node.rainbow = Math.floor(Math.random() * this.colors.length);
            }

            if (node.rainbow >= this.colors.length) {
                node.rainbow = 0;
            }

            node.color = this.colors[node.rainbow];
            node.rainbow += this.config.rainbowspeed;
        }

        if (count <= 0) {
            this.rnodes = [];
        }

        if (this.tickMain >= 20) { // 1 Second
            for (var i in this.clients) {
                if (typeof this.clients[i] != "undefined") {
                    if (this.clients[i].playerTracker.rainbowon) {
                        var client = this.clients[i].playerTracker;
                        for (var j in client.cells) {
                            this.rnodes[client.cells[j].nodeId] = client.cells[j];
                        }
                    }
                }
            }
            if (this.rnodes > 0) {

                if (this.rrticks > 40) {
                    this.rrticks = 0;
                    this.rnodes = [];

                } else {
                    this.rrticks++;
                }
            }
            // Update leaderboard with the gamemode's method
            this.leaderboard = [];
            this.gameMode.updateLB(this);
            this.lb_packet = new Packet.UpdateLeaderboard(this.leaderboard, this.gameMode.packetLB);

            this.tickMain = 0; // Reset
            if (!this.gameMode.specByLeaderboard) {
                // Get client with largest score if gamemode doesn't have a leaderboard
                var lC;
                var lCScore = 0;
                for (var i = 0; i < this.clients.length; i++) {
                    // if (typeof this.clients[i].getScore == 'undefined') continue;
                    if (this.clients[i].playerTracker.getScore(true) > lCScore) {
                        lC = this.clients[i];
                        lCScore = this.clients[i].playerTracker.getScore(true);
                    }
                }
                this.largestClient = lC;
            } else this.largestClient = this.leaderboard[0];
        }

        // Debug
        //console.log(this.tick - 50);

        // Reset
        this.tick = 0;
        if (this.config.autopause == 1) {
            var humans = 0,
                bots = 0;
            for (var i = 0; i < this.clients.length; i++) {
                if ('_socket' in this.clients[i]) {
                    humans++;
                } else {
                    bots++;
                }
            }
            if ((!this.run) && (humans != 0) && (!this.overideauto)) {
                console.log("[Autopause] Game Resumed!");
                this.run = true;
            } else if (this.run && humans == 0) {
                console.log("[Autopause] The Game Was Paused to save memory. Join the game to resume!");
                this.run = false;
                this.nodesEjected = [];
                this.leaderboard = [];
            }
        }
    }
};

GameServer.prototype.resetlb = function() {
    // Replace functions
    var gm = Gamemode.get(this.gameMode.ID);
    this.gameMode.packetLB = gm.packetLB;
    this.gameMode.updateLB = gm.updateLB;
};

GameServer.prototype.updateClients = function() {
    for (var i = 0; i < this.clients.length; i++) {
        if (typeof this.clients[i] == "undefined") {
            continue;
        }
        if (typeof this.clients[i].playerTracker == "undefined") continue;
        this.clients[i].playerTracker.antiTeamTick();
        this.clients[i].playerTracker.update();
    }
};

GameServer.prototype.startingFood = function() {
    // Spawns the starting amount of food cells
    for (var i = 0; i < this.config.foodStartAmount; i++) {
        this.spawnFood();
    }
};

GameServer.prototype.updateFood = function() {
    var toSpawn = Math.min(this.config.foodSpawnAmount, (this.config.foodMaxAmount - this.currentFood));
    for (var i = 0; i < toSpawn; i++) {
        this.spawnFood();
    }
};

GameServer.prototype.spawnFood = function() {
    var f = new Entity.Food(this.getNextNodeId(), null, this.getRandomPosition(), this.config.foodMass, this);
    f.setColor(this.getRandomColor());

    this.addNode(f);
    this.currentFood++;
};

GameServer.prototype.spawnPlayer = function(player, pos, mass) {
    if (this.nospawn[player.socket.remoteAddress] != true) {
        player.norecombine = false;
        if (this.config.skins == 1) {

            if (player.name.substr(0, 1) == "<") {
                // Premium Skin
                var n = player.name.indexOf(">");
                if (n != -1) {

                    if (player.name.substr(1, n - 1) == "r" && this.config.rainbow == 1) {
                        player.rainbowon = true;
                    } else {
                        player.premium = '%' + player.name.substr(1, n - 1);
                    }

                    for (var i in this.skinshortcut) {
                        if (!this.skinshortcut[i] || !this.skin[i]) {
                            continue;
                        }
                        if (player.name.substr(1, n - 1) == this.skinshortcut[i]) {
                            player.premium = this.skin[i];
                            break;
                        }

                    }
                    player.name = player.name.substr(n + 1);
                }
            } else if (player.name.substr(0, 1) == "[") {
                // Premium Skin
                var n = player.name.indexOf("]");
                if (n != -1) {

                    player.premium = ':http://' + player.name.substr(1, n - 1);
                    player.name = player.name.substr(n + 1);
                }
            }
        }
        if (pos == null) { // Get random pos
            pos = this.getRandomSpawn();
        }
        if (mass == null) { // Get starting mass
            mass = this.config.playerStartMass;
        }

        // Spawn player and add to world
        var cell = new Entity.PlayerCell(this.getNextNodeId(), player, pos, mass, this);
        this.addNode(cell);

        // Set initial mouse coords
        player.mouse = {
            x: pos.x,
            y: pos.y
        };
    }
};

GameServer.prototype.virusCheck = function() {
    // Checks if there are enough viruses on the map
    if (this.spawnv == 1) {
        if (this.nodesVirus.length < this.config.virusMinAmount) {
            // Spawns a virus
            var pos = this.getRandomPosition();
            var virusSquareSize = (this.config.virusStartMass * 100) >> 0;

            // Check for players
            for (var i = 0; i < this.nodesPlayer.length; i++) {
                var check = this.nodesPlayer[i];

                if (check.mass < this.config.virusStartMass) {
                    continue;
                }

                var squareR = check.getSquareSize(); // squared Radius of checking player cell

                var dx = check.position.x - pos.x;
                var dy = check.position.y - pos.y;

                if (dx * dx + dy * dy + virusSquareSize <= squareR)
                    return; // Collided
            }

            // Spawn if no cells are colliding
            var v = new Entity.Virus(this.getNextNodeId(), null, pos, this.config.virusStartMass);
            this.addNode(v);
        }
    }
};

GameServer.prototype.getDist = function(x1, y1, x2, y2) { // Use Pythagoras theorem
    var deltaX = Math.abs(x1 - x2);
    var deltaY = Math.abs(y1 - y2);
    return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
}

GameServer.prototype.updateMoveEngine = function() {
    // Move player cells
    var len = this.nodesPlayer.length;

    // Sort cells to move the cells close to the mouse first
    var srt = [];
    for (var i = 0; i < len; i++)
        srt[i] = i;

    for (var i = 0; i < len; i++) {
        for (var j = i + 1; j < len; j++) {
            var clientI = this.nodesPlayer[srt[i]].owner;
            var clientJ = this.nodesPlayer[srt[j]].owner;
            if (this.getDist(this.nodesPlayer[srt[i]].position.x, this.nodesPlayer[srt[i]].position.y, clientI.mouse.x, clientI.mouse.y) >
                this.getDist(this.nodesPlayer[srt[j]].position.x, this.nodesPlayer[srt[j]].position.y, clientJ.mouse.x, clientJ.mouse.y)) {
                var aux = srt[i];
                srt[i] = srt[j];
                srt[j] = aux;
            }
        }
    }

    for (var i = 0; i < len; i++) {
        var cell = this.nodesPlayer[srt[i]];

        // Do not move cells that have already been eaten or have collision turned off
        if (!cell) {
            continue;
        }

        var client = cell.owner;

        cell.calcMove(client.mouse.x, client.mouse.y, this);

        // Check if cells nearby
        var list = this.getCellsInRange(cell);
        for (var j = 0; j < list.length; j++) {
            var check = list[j];

            // if we're deleting from this.nodesPlayer, fix outer loop variables; we need to update its length, and maybe 'i' too
            if (check.cellType == 0) {
                len--;
                if (check.nodeId < cell.nodeId) {
                    i--;
                }
            }

            // Consume effect
            check.onConsume(cell, this);

            // Remove cell
            check.setKiller(cell);
            this.removeNode(check);
        }
    }

    // A system to move cells not controlled by players (ex. viruses, ejected mass)
    len = this.movingNodes.length;
    for (var i = 0; i < len; i++) {
        var check = this.movingNodes[i];

        // Recycle unused nodes
        while ((typeof check == "undefined") && (i < this.movingNodes.length)) {
            // Remove moving cells that are undefined
            this.movingNodes.splice(i, 1);
            check = this.movingNodes[i];
        }

        if (i >= this.movingNodes.length) {
            continue;
        }

        if (check.moveEngineTicks > 0) {
            check.onAutoMove(this);
            // If the cell has enough move ticks, then move it
            check.calcMovePhys(this.config);
        } else {
            // Auto move is done
            check.moveDone(this);
            // Remove cell from list
            var index = this.movingNodes.indexOf(check);
            if (index != -1) {
                this.movingNodes.splice(index, 1);
            }
        }
    }
};

GameServer.prototype.setAsMovingNode = function(node) {
    this.movingNodes.push(node);
};

GameServer.prototype.splitCells = function(client) {
    var len = client.cells.length;
    var splitCells = 0; // How many cells have been split
    for (var i = 0; i < len; i++) {
        if (client.cells.length >= this.config.playerMaxCells) {
            // Player cell limit
            continue;
        }

        var cell = client.cells[i];
        if (!cell) {
            continue;
        }

        if (cell.mass < this.config.playerMinMassSplit) {
            continue;
        }

        // Get angle
        var deltaY = client.mouse.y - cell.position.y;
        var deltaX = client.mouse.x - cell.position.x;
        var angle = Math.atan2(deltaX, deltaY);

        // Get starting position
        var startPos = {
            x: cell.position.x,
            y: cell.position.y
        };
        // Calculate mass and speed of splitting cell
        var newMass = cell.mass / 2;
        cell.mass = newMass;

        // Create cell
        var split = new Entity.PlayerCell(this.getNextNodeId(), client, startPos, newMass, this);
        split.setAngle(angle);
        // Polyfill for log10
        Math.log10 = Math.log10 || function(x) {
            return Math.log(x) / Math.LN10;
        };
        var splitSpeed = this.config.splitSpeed * Math.max(Math.log10(newMass) - 2.2, 1); //for smaller cells use splitspeed 150, for bigger cells add some speed
        split.setMoveEngineData(splitSpeed, 32, 0.85); //vanilla agar.io = 130, 32, 0.85
        split.calcMergeTime(this.config.playerRecombineTime);
        split.ignoreCollision = true;
        split.restoreCollisionTicks = this.config.cRestoreTicks; //vanilla agar.io = 10

        // Add to moving cells list
        this.setAsMovingNode(split);
        this.addNode(split);
        splitCells++;
    }
    if (splitCells > 0) client.actionMult += 0.5; // Account anti-teaming
};

GameServer.prototype.canEjectMass = function(client) {
    if (typeof client.lastEject == 'undefined' || this.time - client.lastEject >= this.config.ejectMassCooldown) {
        client.lastEject = this.time;
        return true;
    } else
        return false;
};

GameServer.prototype.ejecttMass = function(client) {
    for (var i = 0; i < client.cells.length; i++) {
        var cell = client.cells[i];

        if (!cell) {
            continue;
        }

        var deltaY = client.mouse.y - cell.position.y;
        var deltaX = client.mouse.x - cell.position.x;
        var angle = Math.atan2(deltaX, deltaY);

        // Get starting position
        var size = cell.getSize() + 5;
        var startPos = {
            x: cell.position.x + ((size + this.config.ejectMass) * Math.sin(angle)),
            y: cell.position.y + ((size + this.config.ejectMass) * Math.cos(angle))
        };

        // Randomize angle
        angle += (Math.random() * .4) - .2;

        // Create cell
        var ejected = new Entity.EjectedMass(this.getNextNodeId(), null, startPos, -100, this);
        ejected.setAngle(angle);
        ejected.setMoveEngineData(this.config.ejectantispeed, 20);
        ejected.setColor(cell.getColor());

        this.addNode(ejected);
        this.setAsMovingNode(ejected);
    }
};

GameServer.prototype.customLB = function(newLB, gameServer) {
    gameServer.gameMode.packetLB = 48;
    gameServer.gameMode.specByLeaderboard = false;
    gameServer.gameMode.updateLB = function(gameServer) {
        gameServer.leaderboard = newLB
    };
};

GameServer.prototype.anounce = function() {
    var newLB = [];
    newLB[0] = "Highscore:";
    newLB[1] = this.topscore;
    newLB[2] = "  By  ";
    newLB[3] = this.topusername;

    this.customLB(this.config.anounceDuration * 1000, newLB, this);
};

GameServer.prototype.ejectMass = function(client) {
    if (!this.canEjectMass(client))
        return;
    var ejectedCells = 0; // How many cells have been ejected
    for (var i = 0; i < client.cells.length; i++) {
        var cell = client.cells[i];

        if (!cell) {
            continue;
        }

        if (cell.mass < this.config.playerMinMassEject) {
            continue;
        }

        var deltaY = client.mouse.y - cell.position.y;
        var deltaX = client.mouse.x - cell.position.x;
        var angle = Math.atan2(deltaX, deltaY);

        // Get starting position
        var size = cell.getSize() + 5;
        var startPos = {
            x: cell.position.x + ((size + this.config.ejectMass) * Math.sin(angle)),
            y: cell.position.y + ((size + this.config.ejectMass) * Math.cos(angle))
        };

        // Remove mass from parent cell
        cell.mass -= this.config.ejectMassLoss;

        // Randomize angle
        angle += (Math.random() * .4) - .2;

        // Create cell
        var ejected = new Entity.EjectedMass(this.getNextNodeId(), null, startPos, this.config.ejectMass, this);
        ejected.setAngle(angle);
        ejected.setMoveEngineData(this.config.ejectSpeed, 20);
        if (this.config.randomEjectMassColor == 1) {
            ejected.setColor(this.getRandomColor());
        } else {
            ejected.setColor(cell.getColor());
        }

        this.addNode(ejected);
        this.setAsMovingNode(ejected);
        ejectedCells++;
    }
    if (ejectedCells > 0) {
        client.actionMult += 0.065;
        // Using W to give to a teamer is very frequent, so make sure their mult will be lost slower
        client.actionDecayMult *= 0.99999;
    }
};

GameServer.prototype.autoSplit = function(client, parent, angle, mass, speed) {
    // Starting position
    var startPos = {
        x: parent.position.x,
        y: parent.position.y
    };

    // Create cell
    newCell = new Entity.PlayerCell(this.getNextNodeId(), client, startPos, mass);
    newCell.setAngle(angle);
    newCell.setMoveEngineData(speed, 15);
    newCell.restoreCollisionTicks = 25;
    newCell.calcMergeTime(this.config.playerRecombineTime);
    newCell.ignoreCollision = true; // Remove collision checks

    // Add to moving cells list
    this.addNode(newCell);
    this.setAsMovingNode(newCell);
};

GameServer.prototype.newCellVirused = function(client, parent, angle, mass, speed) {
    // Starting position
    var startPos = {
        x: parent.position.x,
        y: parent.position.y
    };

    // Create cell
    newCell = new Entity.PlayerCell(this.getNextNodeId(), client, startPos, mass);
    newCell.setAngle(angle);
    newCell.setMoveEngineData(speed, 15);
    newCell.calcMergeTime(this.config.playerRecombineTime);
    newCell.ignoreCollision = true; // Remove collision checks

    // Add to moving cells list
    this.addNode(newCell);
    this.setAsMovingNode(newCell);
};

GameServer.prototype.shootVirus = function(parent) {
    var parentPos = {
        x: parent.position.x,
        y: parent.position.y,
    };

    var newVirus = new Entity.Virus(this.getNextNodeId(), null, parentPos, this.config.virusStartMass);
    newVirus.setAngle(parent.getAngle());
    newVirus.setMoveEngineData(200, 20);

    // Add to moving cells list
    this.addNode(newVirus);
    this.setAsMovingNode(newVirus);
};

GameServer.prototype.ejectVirus = function(parent) {
    var parentPos = {
        x: parent.position.x,
        y: parent.position.y,
    };

    var newVirus = new Entity.Virus(this.getNextNodeId(), null, parentPos, this.config.ejectMass);
    newVirus.setAngle(parent.getAngle());
    newVirus.setMoveEngineData(this.config.ejectvspeed, 20);

    // Add to moving cells list
    this.addNode(newVirus);
    this.setAsMovingNode(newVirus);
};

GameServer.prototype.getCellsInRange = function(cell) {
    var list = new Array();
    var squareR = cell.getSquareSize(); // Get cell squared radius

    // Loop through all cells that are visible to the cell. There is probably a more efficient way of doing this but whatever
    var len = cell.owner.visibleNodes.length;
    for (var i = 0; i < len; i++) {
        var check = cell.owner.visibleNodes[i];

        if (typeof check === 'undefined') {
            continue;
        }

        // if something already collided with this cell, don't check for other collisions
        if (check.inRange) {
            continue;
        }

        // Can't eat itself
        if (cell.nodeId == check.nodeId) {
            continue;
        }

        // Can't eat cells that have collision turned off
        if ((cell.owner == check.owner) && (cell.ignoreCollision)) {
            continue;
        }

        // AABB Collision
        if (!check.collisionCheck2(squareR, cell.position)) {
            continue;
        }

        // Cell type check - Cell must be bigger than this number times the mass of the cell being eaten
        var multiplier = 1.25;

        switch (check.getType()) {
            case 1: // Food cell
                list.push(check);
                check.inRange = true; // skip future collision checks for this food
                continue;
            case 2: // Virus
                multiplier = 1.33;
                break;
            case 5: // Beacon
                // This cell cannot be destroyed
                continue;
            case 0: // Players
                // Can't eat self if it's not time to recombine yet
                if (check.owner == cell.owner) {
                    if (!cell.shouldRecombine || !check.shouldRecombine) {
                        if (!cell.owner.recombineinstant) continue;
                    }

                    multiplier = 1.00;
                }

                // Can't eat team members
                if (this.gameMode.haveTeams) {
                    if (!check.owner) { // Error check
                        continue;
                    }

                    if ((check.owner != cell.owner) && (check.owner.getTeam() == cell.owner.getTeam())) {
                        continue;
                    }
                }
                break;
            default:
                break;
        }

        // Make sure the cell is big enough to be eaten.
        if ((check.mass * multiplier) > cell.mass) {
            continue;
        }

        // Eating range
        var xs = Math.pow(check.position.x - cell.position.x, 2);
        var ys = Math.pow(check.position.y - cell.position.y, 2);
        var dist = Math.sqrt(xs + ys);

        var eatingRange = cell.getSize() - check.getEatingRange(); // Eating range = radius of eating cell + 40% of the radius of the cell being eaten
        if (dist > eatingRange) {
            // Not in eating range
            continue;
        }

        // Add to list of cells nearby
        list.push(check);

        // Something is about to eat this cell; no need to check for other collisions with it
        check.inRange = true;
    }
    return list;
};

GameServer.prototype.getNearestVirus = function(cell) {
    // More like getNearbyVirus
    var virus = null;
    var r = 100; // Checking radius

    var topY = cell.position.y - r;
    var bottomY = cell.position.y + r;

    var leftX = cell.position.x - r;
    var rightX = cell.position.x + r;

    // Loop through all viruses on the map. There is probably a more efficient way of doing this but whatever
    var len = this.nodesVirus.length;
    for (var i = 0; i < len; i++) {
        var check = this.nodesVirus[i];

        if (typeof check === 'undefined') {
            continue;
        }

        if (!check.collisionCheck(bottomY, topY, rightX, leftX)) {
            continue;
        }

        // Add to list of cells nearby
        virus = check;
        break; // stop checking when a virus found
    }
    return virus;
};

GameServer.prototype.updateCells = function() {
    if (!this.run) {
        // Server is paused
        return;
    }

    // Loop through all player cells

    for (var i = 0; i < this.nodesPlayer.length; i++) {
        var cell = this.nodesPlayer[i];

        if (!cell) {
            continue;
        }
        // Have fast decay over 5k mass
        if (this.config.playerFastDecay == 1) {
            if (cell.mass < this.config.fastdecayrequire) {
                var massDecay = 1 - (this.config.playerMassDecayRate * this.gameMode.decayMod * 0.05); // Normal decay
            } else {
                var massDecay = 1 - (this.config.playerMassDecayRate * this.gameMode.decayMod) * this.config.FDmultiplyer; // might need a better formula
            }
        } else {
            var massDecay = 1 - (this.config.playerMassDecayRate * this.gameMode.decayMod * 0.05);
        }

        // Recombining
        if (cell.owner.cells.length > 1 && !cell.owner.norecombine) {
            cell.recombineTicks += 0.05;
            cell.calcMergeTime(this.config.playerRecombineTime);
        } else if (cell.owner.cells.length == 1 && cell.recombineTicks > 0) {
            cell.recombineTicks = 0;
            cell.shouldRecombine = false;
            cell.owner.recombineinstant = false;
        }

        // Mass decay
        if (cell.mass >= this.config.playerMinMassDecay) {
            var client = cell.owner;
            if (this.config.teaming == 0) {
                var teamMult = (client.massDecayMult - 1) / 160 + 1; // Calculate anti-teaming multiplier for decay
                var thisDecay = 1 - massDecay * (1 / teamMult); // Reverse mass decay and apply anti-teaming multiplier
                cell.mass *= (1 - thisDecay);
            } else {
                // No anti-team
                cell.mass *= massDecay;
            }
        }
    }
};

GameServer.prototype.loadConfig = function() {
    try {
        // Load the contents of the config file
        var load = ini.parse(fs.readFileSync('./gameserver.ini', 'utf-8'));

        // Replace all the default config's values with the loaded config's values
        for (var obj in load) {
            this.config[obj] = load[obj];
        }
    } catch (err) {
        // No config
        console.log("[Game] Config not found... Generating new config");

        // Create a new config
        fs.writeFileSync('./gameserver.ini', ini.stringify(this.config));
    }
    
    try {
        var override = ini.parse(fs.readFileSync('./override.ini', 'utf-8'));
        for(var o in override) {
            this.config[o] = override[o];
        }
    } catch (err) {
        console.log("[Game] Override not found... Generating new override");
        fs.writeFileSync('./override.ini',"// Copy and paste configs from gameserver.ini that you dont want to be overwritten");
       
    }
    
    
    gameservern = this;
};

GameServer.prototype.switchSpectator = function(player) {
    if (this.gameMode.specByLeaderboard) {
        player.spectatedPlayer++;
        if (player.spectatedPlayer == this.leaderboard.length) {
            player.spectatedPlayer = 0;
        }
    } else {
        // Find next non-spectator with cells in the client list
        var oldPlayer = player.spectatedPlayer + 1;
        var count = 0;
        while (player.spectatedPlayer != oldPlayer && count != this.clients.length) {
            if (oldPlayer == this.clients.length) {
                oldPlayer = 0;
                continue;
            }

            if (!this.clients[oldPlayer]) {
                // Break out of loop in case client tries to spectate an undefined player
                player.spectatedPlayer = -1;
                break;
            }

            if (this.clients[oldPlayer].playerTracker.cells.length > 0) {
                break;
            }

            oldPlayer++;
            count++;
        }
        if (count == this.clients.length) {
            player.spectatedPlayer = -1;
        } else {
            player.spectatedPlayer = oldPlayer;
        }
    }
};

// Stats server

GameServer.prototype.startStatsServer = function(port) {
    // Do not start the server if the port is negative
    if (port < 1) {
        return;
    }

    // Create stats
    this.stats = "Test";
    this.getStats();

    // Show stats
    this.httpServer = http.createServer(function(req, res) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.writeHead(200);
        res.end(this.stats);
    }.bind(this));

    this.httpServer.listen(port, function() {
        // Stats server
        console.log("[Game] Loaded stats server on port " + port);
        setInterval(this.getStats.bind(this), this.config.serverStatsUpdate * 1000);
    }.bind(this));
}

GameServer.prototype.getStats = function() {
    var players = 0;
    this.clients.forEach(function(client) {
        if (client.playerTracker && client.playerTracker.cells.length > 0)
            players++
    });
    var s = {
        'current_players': this.clients.length,
        'alive': players,
        'spectators': this.clients.length - players,
        'max_players': this.config.serverMaxConnections,
        'gamemode': this.gameMode.name,
        'start_time': this.startTime
    };
    this.stats = JSON.stringify(s);
};

// Custom prototype functions
WebSocket.prototype.sendPacket = function(packet) {
    function getBuf(data) {
        var array = new Uint8Array(data.buffer || data);
        var l = data.byteLength || data.length;
        var o = data.byteOffset || 0;
        var buffer = new Buffer(l);

        for (var i = 0; i < l; i++) {
            buffer[i] = array[o + i];
        }

        return buffer;
    }

    //if (this.readyState == WebSocket.OPEN && (this._socket.bufferSize == 0) && packet.build) {
    if (this.readyState == WebSocket.OPEN && packet.build) {
        var buf = packet.build();
        this.send(getBuf(buf), {
            binary: true
        });
    } else if (!packet.build) {
        // Do nothing
    } else {
        this.readyState = WebSocket.CLOSED;
        this.emit('close');
        this.removeAllListeners();
    }
};
