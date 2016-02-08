var Cell = require('./Cell');
var Virus = require('./Virus');
var Food = require('./Food');

function MotherCell() {
    Cell.apply(this, Array.prototype.slice.call(arguments));

    this.cellType = 2; // Copies virus cell
    this.color = {
        r: 205,
        g: 85,
        b: 100
    };
    this.spiked = 1;
    this.isMotherCell = true;
}

module.exports = MotherCell;
MotherCell.prototype = new Cell(); // Base

MotherCell.prototype.getEatingRange = function() {
    return this.getSize() / 3.14;
};

MotherCell.prototype.update = function(gameServer) {
    if (Math.random() * 100 > 97) {
        var maxFood = Math.random() * 2; // Max food spawned per tick
        var i = 0; // Food spawn counter
        while (i < maxFood) {
            // Only spawn if food cap hasn't been reached
            if (gameServer.currentFood < gameServer.config.foodMaxAmount * 1.5) {
                this.spawnFood(gameServer);
            }
            // Increment
            i++;
        }
    }
    if (this.mass > 222) {
        // Always spawn food if the mother cell is larger than 222
        var cellSize = gameServer.config.foodMass;
        if (this.mass > 222 + cellSize * 2) { // Spawn it twice if possible
            this.spawnFood(gameServer);
            this.spawnFood(gameServer);
            this.mass -= cellSize;
            this.mass -= cellSize;
        } else if (this.mass > 222 + cellSize) {
            this.spawnFood(gameServer);
            this.mass -= cellSize;
        }
    }
}

MotherCell.prototype.checkEat = function(gameServer) {
    var safeMass = this.mass * .78;
    var r = this.getSize(); // The box area that the checked cell needs to be in to be considered eaten

    // Loop for potential prey
    for (var i in gameServer.nodesPlayer) {
        var check = gameServer.nodesPlayer[i];

        if (check.mass > safeMass) {
            // Too big to be consumed
            continue;
        }

        // Calculations
        var len = r - (check.getSize() / 2) >> 0;
        if ((this.abs(this.position.x - check.position.x) < len) && (this.abs(this.position.y - check.position.y) < len)) {
            // A second, more precise check
            var xs = Math.pow(check.position.x - this.position.x, 2);
            var ys = Math.pow(check.position.y - this.position.y, 2);
            var dist = Math.sqrt(xs + ys);

            if (r > dist) {
                // Eats the cell
                gameServer.removeNode(check);
                this.mass += check.mass;
            }
        }
    }
    for (var i in gameServer.movingNodes) {
        var check = gameServer.movingNodes[i];

        if ((check.getType() == 0) || (check.getType() == 1) || (check.mass > safeMass)) {
            // Too big to be consumed / No player cells / No food cells
            continue;
        }

        // Calculations
        var len = r >> 0;
        if ((this.abs(this.position.x - check.position.x) < len) && (this.abs(this.position.y - check.position.y) < len)) {
            // A second, more precise check
            var xs = Math.pow(check.position.x - this.position.x, 2);
            var ys = Math.pow(check.position.y - this.position.y, 2);
            var dist = Math.sqrt(xs + ys);
            if (r > dist) {
                // Eat the cell
                gameServer.removeNode(check);
                this.mass += check.mass;

                if (gameServer.config.motherCellMassProtection == 1) {
                    this.mass = Math.min(this.mass, gameServer.config.motherCellMaxMass)
                }
            }
        }
    }
}
MotherCell.prototype.abs = function(n) {
    // Because Math.abs is slow
    return (n < 0) ? -n : n;
}

MotherCell.prototype.spawnFood = function(gameServer) {
    // Get starting position
    var angle = Math.random() * 6.28; // (Math.PI * 2) ??? Precision is not our greatest concern here
    var r = this.getSize();
    var pos = {
        x: this.position.x + (r * Math.sin(angle)),
        y: this.position.y + (r * Math.cos(angle))
    };

    // Spawn food
    var f = new Food(gameServer.getNextNodeId(), null, pos, gameServer.config.foodMass, gameServer);
    f.setColor(gameServer.getRandomColor());

    gameServer.addNode(f);
    gameServer.currentFood++;

    // Move engine
    f.angle = angle;
    var dist = (Math.random() * 10) + 22; // Random distance
    f.setMoveEngineData(dist, 15);

    gameServer.setAsMovingNode(f);
};

MotherCell.prototype.onConsume = Virus.prototype.onConsume; // Copies the virus prototype function

MotherCell.prototype.onAdd = function(gameServer) {
    gameServer.gameMode.nodesMother.push(this);
};

MotherCell.prototype.onRemove = function(gameServer) {
    var index = gameServer.gameMode.nodesMother.indexOf(this);
    if (index != -1) {
        gameServer.gameMode.nodesMother.splice(index, 1);
    }
};

MotherCell.prototype.visibleCheck = function(box, centerPos) {
    // Checks if this cell is visible to the player
    var cellSize = this.getSize();
    var lenX = cellSize + box.width >> 0; // Width of cell + width of the box (Int)
    var lenY = cellSize + box.height >> 0; // Height of cell + height of the box (Int)

    return (this.abs(this.position.x - centerPos.x) < lenX) && (this.abs(this.position.y - centerPos.y) < lenY);
};
