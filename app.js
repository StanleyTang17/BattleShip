const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server, {});

const SOCKETS = new Map();
const FREE_SOCKET_LIST = [];

app.use(express.static(__dirname + '/public'));

server.listen(process.env.PORT || 8080);

io.sockets.on('connection', socket => {
    SOCKETS.set(socket.id, socket);
    
    socket.on('disconnect', () => {
        if(socket.opponent) {
            socket.opponent.opponent = null;
            socket.opponent.emit('opponent disconnected');
        }
        SOCKETS.delete(socket.id);
        const index = FREE_SOCKET_LIST.indexOf(socket);
        if(index != -1) FREE_SOCKET_LIST.splice(index, 1);
    });

    socket.on('join', data => {
        socket.name = data.name;
    });

    socket.on('matchmake', () => {
        console.log(socket.name + ' has started matchmaking...');
        FREE_SOCKET_LIST.push(socket);
        if(FREE_SOCKET_LIST.length > 1) {
            var index = 0;
            var other;
            do {
                index = Math.floor(Math.random() * FREE_SOCKET_LIST.length);
                other = FREE_SOCKET_LIST[index];
            }while(other.id === socket.id);
            socket.opponent = other;
            other.opponent = socket;
            FREE_SOCKET_LIST.splice(index, 1);
            FREE_SOCKET_LIST.splice(FREE_SOCKET_LIST.indexOf(socket), 1);
            
            socket.emit('opponent found', {name: other.name, first: true});
            other.emit('opponent found', {name: socket.name, first: false});

            console.log(`matched ${socket.name} with ${other.name}`);
        }
    });

    socket.on('strike', pos => {
        socket.opponent.emit('receive strike', pos);
    });

    socket.on('strike feedback', result => {
        socket.opponent.emit('strike feedback', result);
    });

    socket.on('reset', () => {
        if(socket.opponent) {
            socket.opponent.opponent = null;
            socket.opponent = null;
            console.log('resetting');
        }
    });
});
