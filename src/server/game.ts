import WebSocket from 'ws';
const wss = new WebSocket.Server({ port: 8081 });

const games: Record<string, any> = {};
const users: Record<string, any> = {};
const websockets: Record<string, WebSocket> = {};

wss.on('connection', (ws) => {
    console.log('Client connected!');

    ws.on('message', (message) => {
        const data = JSON.parse(message.toString());
        console.log('Received message:', data);
        switch (data.type) {
            case 'find-match':
                const userId = data.userId;
                addUserToQueue(userId);
                websockets[userId] = ws;
                // Find a match for the user
                const opponentId = findOpponent(userId);
                console.log('Opponent found:', opponentId);
                
                if (opponentId) {
                    // Create a new game
                    const game = createGame(userId, opponentId);
                    games[game.id] = game;
                    console.log('Game created:', game);
                    // Send a message to both players to start the game
                    ws.send(JSON.stringify({ type: 'match-found', gameId: game.id }));
                    const opponent = users[opponentId];
                    wss.clients.forEach((client) => {
                        if (client !== ws && client.readyState === WebSocket.OPEN) {
                            // Check if the client is not the opponent
                            if (websockets[opponentId] === client) {
                                client.send(JSON.stringify({ type: 'match-found', gameId: game.id }));
                            }
                        }
                    });
                } else {
                    // No match found
                    ws.send(JSON.stringify({ type: 'waiting-for-match' }));
                }
                break;
            case 'make-move':
                const choice = data.choice;
                const gameId = data.gameId;
                const game = games[gameId];
                console.log('Games:', games, 'gameId:', gameId);
                if (game) {
                    // Update the game state
                    if (game.userId1 === data.userId) {
                        game.userId1Choices.push(choice);
                        game.userId1PendingMove = false;
                    } else if (game.userId2 === data.userId) {
                        game.userId2Choices.push(choice);
                        game.userId2PendingMove = false;
                    }
                    if (game.userId1Choices.length === game.round && game.userId2Choices.length === game.round) {
                        const currentUserId1Move = game.userId1Choices[game.userId1Choices.length-1];
                        const currentUserId2Move = game.userId2Choices[game.userId2Choices.length-1];
                        if (currentUserId1Move === currentUserId2Move) {
                            console.log('Draw!');
                        } else if (currentUserId1Move === 'Rock' && currentUserId2Move === 'Scissors') {
                            console.log(`${game.userId1} wins!`, currentUserId1Move, currentUserId2Move);
                            game.userId1Score += 1;
                        } else if (currentUserId1Move === 'Scissors' && currentUserId2Move === 'Paper') {
                            console.log(`${game.userId1} wins!`, currentUserId1Move, currentUserId2Move);
                            game.userId1Score += 1;
                        } else if (currentUserId1Move === 'Paper' && currentUserId2Move === 'Rock') {
                            console.log(`${game.userId1} wins!`, currentUserId1Move, currentUserId2Move);
                            game.userId1Score += 1;
                        } else {
                            console.log(`${game.userId2} wins!`, currentUserId1Move, currentUserId2Move);
                            game.userId2Score += 1;
                        }
                        game.state = 'next-round';
                        game.round += 1;
                        game.userId1PendingMove = true;
                        game.userId2PendingMove = true;
                        console.log('Game state updated:', game.state, 'Round:', game.round);
                        const message = JSON.stringify({ 
                            type: 'opponent-move', 
                            userId1Score: game.userId1Score, 
                            userId2Score: game.userId2Score, 
                            round: game.round, 
                            userId1: game.userId1, 
                            userId2: game.userId2,
                            currentUserId1Move, 
                            currentUserId2Move
                        });
                        websockets[game.userId1].send(message);
                        websockets[game.userId2].send(message);
                        if (game.round-1 === game.totalRounds) {
                            game.state = 'game-over';
                            game.userId1PendingMove = false;
                            game.userId2PendingMove = false;
                            const result = game.userId1Score > game.userId2Score ? `${game.userId1} wins!` : `${game.userId2} wins!`;
                            const resultMessage = JSON.stringify({ type: 'game-result', result });
                            websockets[game.userId1].send(resultMessage);
                            websockets[game.userId2].send(resultMessage);
                        }
                    }
                    console.log('Game updated:', game);
                } else {
                    ws.send(JSON.stringify({ type: 'game-not-found' }));
                }
                break;
            default:
                console.log('Unknown message type:', data.type);
                break;
        }
    });   
});

function findOpponent(userId: string) {
    // Get a list of users who are waiting for a match
    const waitingUsers = getUsersWaitingForMatch();

    // Filter the list to find a suitable opponent
    const opponent = waitingUsers.find((user) => {
        // Check if the user is not the same as the current user
        return user.id !== userId;
    });

    // Return the ID of the opponent, or null if no opponent is found
    return opponent ? opponent.id : null;
}

function getUsersWaitingForMatch() {
    const _users = Object.values(users);
    return _users.filter((user) => user.waitingForMatch);
}

function createGame(userId1: string, userId2: string) {
    // This function creates a new game instance with the given user IDs
    // In a real-world implementation, this data would likely be stored in a database or a data structure
    // For simplicity, let's assume we have a game object with the user IDs and a unique game ID
    const gameId = Math.random().toString(36).substr(2, 9); // generate a random game ID
    const game = {
        id: gameId,
        userId1,
        userId2,
        state: 'pending', // initial game state
        round: 1,
        userId1Choices: [],
        userId2Choices: [],
        userId1Score: 0,
        userId2Score: 0,
        userId1PendingMove: true,
        userId2PendingMove: true,
        totalRounds: 3
    };
    removeUserFromQueue(userId1);
    removeUserFromQueue(userId2);

    return game;
}

function addUserToQueue(userId: string) {
    if (users[userId]) {
        users[userId].waitingForMatch = true;
    } else {
        users[userId] = { id: userId, waitingForMatch: true };
    }
}

function removeUserFromQueue(userId: string) {
    if (users[userId]) {
        users[userId].waitingForMatch = false;
    }
}