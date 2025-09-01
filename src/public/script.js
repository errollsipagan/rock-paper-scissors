const socket = new WebSocket('ws://localhost:8081');

const findMatchButton = document.getElementById('find-match');
const startButton = document.getElementById('start-button');
const userIdInput = document.getElementById('user-id');
const gameChoicesSelect = document.getElementById('game-choices');
const myScore = document.getElementById('my-score');
const opponentScore = document.getElementById('opponent-score');
const opponentMove = document.getElementById('opponent-move');
const gameResult = document.getElementById('game-result');
let gameId = null;

function init() {
    startButton.disabled = true;
}

init();

findMatchButton.addEventListener('click', () => {
    const userId = userIdInput.value;
    socket.send(JSON.stringify({ type: 'find-match', userId }));
});

startButton.addEventListener('click', () => {
    const choice = gameChoicesSelect.value;
    const userId = userIdInput.value;
    socket.send(JSON.stringify({ type: 'make-move', choice, gameId, userId }));
    startButton.disabled = true;
    gameResult.textContent = 'Waiting for opponent to make a move...';
});

socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    switch (data.type) {
        case 'opponent-move':
            console.log('Opponent made a move:', data);
            // Update the UI to show the opponent's move
            startButton.disabled = false;
            let opponentLastMove;
            if (data.userId1 === userIdInput.value) {
                myScore.textContent = data.userId1Score;
                opponentScore.textContent = data.userId2Score;
                opponentLastMove = data.currentUserId2Move;
            } else {
                myScore.textContent = data.userId2Score;
                opponentScore.textContent = data.userId1Score;
                opponentLastMove = data.currentUserId1Move;
            }
            opponentMove.textContent = opponentLastMove;
            gameResult.textContent = '';
            break;
        case 'game-result':
            console.log('Game result:', data.result);
            // Update the UI to show the game result
            gameResult.textContent = data.result;
            startButton.disabled = true;
            findMatchButton.disabled = false;
            break;
        case 'match-found':
            console.log('Match found!', data);
            gameId = data.gameId;
            findMatchButton.disabled = true;
            startButton.disabled = false;
            gameResult.textContent = 'Match found!';
            break;
        default:
            console.log('Unknown message type:', data.type);
    }
};

socket.onopen = () => {
    console.log('Connected to the WebSocket server!');
};

socket.onerror = (error) => {
    console.log('Error occurred:', error);
};

socket.onclose = () => {
    console.log('Disconnected from the WebSocket server!');
};