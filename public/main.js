var socket = io();
var announ = document.getElementById("announcement");
var name_container = document.getElementById("name_container");
var canvas_container = document.getElementById("canvas_container");
var name_input = document.getElementById("name_input");
var btn_join = document.getElementById("submit_name");
var btn_rotate = document.getElementById("rotate");
var btn_randomize = document.getElementById("randomize");
var btn_match = document.getElementById("find_match");
var btn_reset = document.getElementById("reset");
var my_title = document.getElementById("my_title");
var opponent_title = document.getElementById("opponent_title");

var ready = false;

canvas_container.style.display = 'none';

//konva
var width = 402;
var height = 402;
var size = 40;
var stage = new Konva.Stage({
    container: 'my_konva',
    width: width,
    height: height,
});

var board = createBoard();
board.konvaInit(stage);

function onClick(row, col) {
    socket.emit('strike', {row: row, col: col});
}

var opponentStage = new Konva.Stage({
    container: 'opponent_konva',
    width: width,
    height: height
});
var opponentBoard = createOpponentBoard(opponentStage, onClick);

//buttons
btn_join.addEventListener('click', () => {
    name_container.style.display = 'none';
    canvas_container.style.display = 'block';
    my_title.innerHTML = `${name_input.value}'s Board`;
    socket.emit('join', {
        name: name_input.value,
    });
    announ.innerHTML = 'Prepare Your Ships';
});

btn_rotate.addEventListener('click', () => {
    if(!ready)
        board.rotateShip(board.select);
});

btn_randomize.addEventListener('click', () => {
    board.randomize();
    board.konvaRefresh();
});

btn_match.addEventListener('click', () => {
    socket.emit('matchmake');
    ready = true;
    btn_rotate.disabled = true;
    btn_randomize.disabled = true;
    btn_match.disabled = true;
    board.konvaLock();
    announ.innerHTML = 'Finding Match...';
});

btn_reset.addEventListener('click', () => {
    socket.emit('reset');
    board.reset();
    opponentBoard.konvaOff();
    ready = false;
    btn_rotate.disabled = false;
    btn_randomize.disabled = false;
    btn_match.disabled = false;
    btn_reset.disabled = true;
    announ.innerHTML = 'Prepare Your Ships';
});

btn_reset.disabled = true;

//socket
socket.on('opponent found', data => {
    opponent_title.innerHTML = `${data.name}'s Board`;
    opponentBoard.konvaOn();
    if(data.first) {
        opponentBoard.lock = false;
        announ.innerHTML = 'Your Turn';
    }else {
        opponentBoard.lock = true;
        announ.innerHTML = 'Opponent\'s Turn';
    }
});

socket.on('opponent disconnected', () => {
    if(announ.innerHTML === 'Victory' || announ.innerHTML === 'Defeat') return;
    opponent_title.innerHTML = 'Opponent Board';
    ready = false;
    btn_rotate.disabled = false;
    btn_randomize.disabled = false;
    btn_match.disabled = false;
    board.reset();
    board.konvaUnlock();
    opponentBoard.konvaOff();
    announ.innerHTML = 'Opponent Disconnected';
});

socket.on('receive strike', pos => {
    const result = board.strike(pos.row, pos.col);
    if(result.defeat) {
        announ.innerHTML = 'Defeat';
        btn_reset.disabled = false;
    }else {
        opponentBoard.lock = false;
        announ.innerHTML = 'Your Turn';
    }
    socket.emit('strike feedback', result);
});

socket.on('strike feedback', result => {
    if(result.value === 'sunk')
        opponentBoard.konvaShip(result.shipRow, result.shipCol, result.direction, result.length);
    else if(result.value === 'hit')
        opponentBoard.konvaStrike(result.row, result.col);

    if(result.defeat) {
        announ.innerHTML = 'Victory';
        btn_reset.disabled = false;
    }
    else {
        opponentBoard.lock = true;
        announ.innerHTML = 'Opponent\'s Turn';
    }
});