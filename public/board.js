// const { default: Konva } = require("konva");

function shift(pointStr, r, c) {
    var row = parseInt(pointStr[0]) + r;
    var col = parseInt(pointStr[1]) + c;
    if(row < 0 || row > 9 || col < 0 || col > 9)
        return null;
    else
        return `${row}${col}`;
}

function suitable(ships, index, coords) {
    for(var i = 0; i < ships.length; ++i)
        if(index != i)
            for(let coord of coords) {
                if(ships[i].coordinates.has(coord))
                    return false;
            }
    return true;
}

function moveShip(ships, index, rowShift, colShift) {
    var newCoords = new Set();
    var iter = ships[index].coordinates.values();
    for(var i = 0; i < ships[index].hp; ++i) {
        var newCoord = shift(iter.next().value, rowShift, colShift);
        if(newCoord)
            newCoords.add(newCoord);
        else
            return false;
    }
    if(suitable(ships, index, newCoords)) {
        ships[index].coordinates = newCoords;
        return true;
    }
    return false;
}

function getPos(ships, index) {
    var pos = ships[index].coordinates.values().next().value;
    var row = parseInt(pos[0]);
    var col = parseInt(pos[1]);
    return {x: col * 40, y: row * 40};
}

function createBoard() {
    var board = {
        stage: null,
        layer: null,
        highlight: null,
        konvaImgs: [],
        select: -1,
        ships: [],
        suitable: function(index, coords) {
            return suitable(this.ships, index, coords);
        },
        moveShip: function(index, rowShift, colShift) {
            return moveShip(this.ships, index, rowShift, colShift);
        },
        rotateShip: function(index) {
            if(index < 0) return false;
            var newCoords = new Set();
            var ship = this.ships[index];
            var firstCoord = ship.coordinates.values().next().value;
            var newDir;
            newCoords.add(firstCoord);
            if(ship.direction == 'horizontal') {
                newDir = 'vertical';
                for(var i = 1; i < ship.hp; ++i) {
                    var newCoord = shift(firstCoord, i, 0);
                    if(newCoord)
                        newCoords.add(newCoord);
                    else
                        return false;
                }
            }else if(ship.direction == 'vertical') {
                newDir = 'horizontal';
                for(var i = 1; i < ship.hp; ++i) {
                    var newCoord = shift(firstCoord, 0, i);
                    if(newCoord)
                        newCoords.add(newCoord);
                    else
                        return false;
                }
            }
            
            if(this.suitable(index, newCoords)) {
                ship.coordinates = newCoords;
                ship.direction = newDir;
                this.konvaRotate(index, newDir);
                return true;
            }

            return false;
        },
        randomize: function() {
            this.ships = [];
            const sizes = [5, 4, 3, 3, 2];
            const directions = ['horizontal', 'vertical'];
            for(var i = 0; i < 5; ++i) {
                var coords = new Set();
                var size = sizes[i];
                var dir;
                do {
                    coords.clear();
                    dir = directions[Math.round(Math.random())];
                    if(dir === 'horizontal') {
                        const row = Math.floor(Math.random() * 9);
                        const col = Math.floor(Math.random() * (9 - size));
                        for(var c = col; c < col + size; ++c) {
                            coords.add(`${row}${c}`);
                        }
                    }else if(dir === 'vertical') {
                        const row = Math.floor(Math.random() * (9 - size));
                        const col = Math.floor(Math.random() * 9);
                        for(var r = row; r < row + size; ++r) {
                            coords.add(`${r}${col}`);
                        }
                    }
                }while(!this.suitable(i, coords));
                this.ships.push({
                    hp: size,
                    direction: dir,
                    coordinates: coords
                });
            }
            this.select = -1;
            this.konvaHightlight();
        },
        strike: function(row, col) {
            var posStr = `${row}${col}`;
            var shipsSunk = 0;
            var result = {
                value: 'miss',
                row: row,
                col: col,
                defeat: false
            };
            for(let ship of this.ships) {
                if(ship.coordinates.has(posStr)) {
                    ship.hp -= 1;
                    if(ship.hp > 0)
                        result.value = 'hit';
                    else {
                        var pos = ship.coordinates.values().next().value;
                        result.value = 'sunk';
                        result.shipRow = parseInt(pos[0]);
                        result.shipCol = parseInt(pos[1]);
                        result.direction = ship.direction;
                        result.length = ship.coordinates.size;
                    }
                }
                if(ship.hp === 0) shipsSunk++;
            }
            if(shipsSunk === 5) {
                result.defeat = true;
            }
            this.konvaStrike(row, col);
            return result;
        },
        reset: function() {
            var hps = [5, 4, 3, 3, 2];
            for(var i = 0; i < 5; ++i) {
                this.ships[i].hp = hps[i];
            }
            this.konvaUnlock();
            this.konvaClearDots();
        },
        konvaInit: function(stage) {
            this.stage = stage;
            this.layer = new Konva.Layer();
            for(var i = 0; i < 11; ++i) {
                const p = i * size + 1;
                var vertical = new Konva.Line({
                    points: [p, 0, p, height],
                    stroke: 'grey',
                });
                this.layer.add(vertical);
                var horizontal = new Konva.Line({
                    points: [0, p, width, p],
                    stroke: 'grey'
                });
                this.layer.add(horizontal);
            }
            for(var i = 0; i < 5; ++i)
                this.konvaShip(i);
            this.highlight = new Konva.Rect({
                stroke: 'red',
                strokeWidth: 2
            });
            this.highlight.hide();
            this.layer.add(this.highlight);
            this.stage.add(this.layer);
        },
        konvaShip: function(i) {
            var ships = this.ships;
            var ship = ships[i];
            var konvaImg;
            var img = new Image();
            img.onload = () => {
                var pos = ship.coordinates.values().next().value;
                var row = parseInt(pos[0]);
                var col = parseInt(pos[1]);

                konvaImg = new Konva.Image({
                    x: col * 40 + 1,
                    y: row * 40 + 1,
                    image: img,
                    draggable: true,
                    dragBoundFunc: function(pos) {
                        var x = pos.x;
                        var y = pos.y;

                        x = Math.round(x / 40) * 40 + 1;
                        y = Math.round(y / 40) * 40 + 1;

                        var pos = getPos(ships, i);
                        var rowShift = Math.round((y - pos.y) / 40);
                        var colShift = Math.round((x - pos.x) / 40);
                        moveShip(ships, i, rowShift, colShift);
                        
                        var newPos = getPos(ships, i);
                        return {x: newPos.x + 1, y: newPos.y + 1};
                    }
                });

                konvaImg.on('click', () => {
                    this.select = i;
                    this.konvaHightlight();
                });

                konvaImg.on('mousedown', () => {
                    this.select = i;
                    this.highlight.hide();
                });

                konvaImg.on('mouseup', () => {
                    this.highlight.show();
                    this.konvaHightlight();
                });
                
                this.layer.add(konvaImg);
                this.layer.batchDraw();
                this.konvaImgs[i] = konvaImg;
            };
            img.src = `imgs/ship_${i}${ship.direction === 'horizontal' ? 0 : 1}.png`;
        },
        konvaRotate: function(index, direction) {
            var img = new Image();
            img.onload = () => {
                this.konvaImgs[index].image(img);
                this.layer.batchDraw();
            };
            img.src = `imgs/ship_${index}${direction === 'horizontal' ? 0 : 1}.png`;
            this.konvaHightlight();
        },
        konvaHightlight: function(enable) {
            if(!this.highlight) return;
            if(this.select < 0) {
                this.highlight.hide();
                return;
            }
            var ship = this.ships[this.select];
            var pos = getPos(this.ships, this.select);
            this.highlight.x(pos.x);
            this.highlight.y(pos.y);
            if(ship.direction === 'horizontal') {
                this.highlight.width(ship.hp * 40 + 1);
                this.highlight.height(40);
            }else {
                this.highlight.width(40);
                this.highlight.height(ship.hp * 40 + 1);
            }
            this.highlight.show();
            this.layer.batchDraw();
        },
        konvaRefresh: function() {
            for(i = 0; i < 5; ++i)
                this.konvaImgs[i].destroy();
            this.konvaImgs.splice(0, 5);
            for(i = 0; i < 5; ++i)
                this.konvaShip(i);
        },
        konvaLock: function() {
            this.layer.getChildren(node => {
                return node.getClassName() === 'Image';
            }).forEach(img => img.draggable(false));
        },
        konvaUnlock: function() {
            this.layer.getChildren(node => {
                return node.getClassName() === 'Image';
            }).forEach(img => img.draggable(true));
        },
        konvaStrike: function(row, col) {
            var dot = new Konva.Circle({
                x: col * 40 + 20 + 1,
                y: row * 40 + 20 + 1,
                radius: 10,
                fill: 'red'
            });
            this.layer.add(dot);
            this.layer.batchDraw();
        },
        konvaClearDots: function() {
            this.layer.getChildren(node => {
                return node.getClassName() === 'Circle';
            }).forEach(dot => {
                dot.destroy();
                this.layer.batchDraw();
            });
        }
    };
    board.randomize();
    return board;
}

function createGrid(row, col) {
    var grid = new Konva.Rect({
        x: col * 40 + 1,
        y: row * 40 + 1,
        width: 40,
        height: 40,
        fill: 'grey',
        stroke: 'white',
        strokeWidth: 1
    });
    grid.hide();
    return grid;
}

function createOpponentBoard(stage, onclick) {
    var layer = new Konva.Layer();
    var border = new Konva.Rect({
        x: 0,
        y: 0,
        width: 402,
        height: 402,
        stroke: 'black'
    });
    layer.add(border);
    for(var i = 0; i < 10; ++i) {
        for(var j = 0; j < 10; ++j) {
            layer.add(createGrid(i, j));
        }
    }
    border.moveToBottom();
    layer.batchDraw();
    stage.add(layer);

    var opponentBoard = {
        stage: stage,
        layer: layer,
        onclick: onclick,
        lock: true,
        konvaOn: function() {
            this.layer.getChildren(node => {
                return node.getClassName() === 'Rect' && node.width() === 40;
            }).forEach(rect => {
                rect.show();
                rect.on('click', () => {
                    if(this.lock) return;
                    rect.off('click');
                    rect.hide();
                    this.lock = true;
                    onclick(Math.floor(rect.y() / 40), Math.floor(rect.x() / 40));
                    this.layer.batchDraw();
                });
                this.layer.batchDraw();
            });
            this.konvaClear();
        },
        konvaOff: function() {
            border.show();
            this.layer.getChildren(node => {
                return node.getClassName() === 'Rect' && node.width() === 40;
            }).forEach(rect => {
                rect.hide();
                lock = true;
                this.layer.batchDraw();
            });
            this.konvaClear();
        },
        konvaStrike: function(row, col) {
            var dot = new Konva.Circle({
                x: col * 40 + 20 + 1,
                y: row * 40 + 20 + 1,
                radius: 10,
                fill: 'red'
            });
            this.layer.add(dot);
            this.layer.batchDraw();
        },
        konvaShip: function(row, col, direction, length) {
            var ship = new Konva.Rect({
                x: col * 40 + 5,
                y: row * 40 + 5,
                width: direction === 'horizontal' ? length * 40 - 10 : 30,
                height: direction === 'horizontal' ? 30 : length * 40 - 10,
                fill: 'red',
                name: 'ship'
            });
            this.layer.add(ship);
            this.layer.batchDraw();
        },
        konvaClear: function() {
            this.layer.getChildren(node => {
                return node.getClassName() === 'Circle' || node.name() === 'ship';
            }).forEach(node => {
                node.destroy();
                this.layer.batchDraw();
            });
        }
    };

    return opponentBoard;
}