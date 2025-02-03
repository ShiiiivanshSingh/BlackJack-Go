let balance = 1000;
const suits = {
    'hearts': { symbol: '♥', color: 'red' },
    'diamonds': { symbol: '♦', color: 'red' },
    'clubs': { symbol: '♣', color: 'black' },
    'spades': { symbol: '♠', color: 'black' }
};
const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
let playerHand = [], dealerHand = [];
let gameInProgress = false;
let stats = {
    gamesWon: 0,
    gamesLost: 0
};

function createCardElement(card, isHidden = false) {
    if (isHidden) {
        return `
            <div class="card">
                <div class="card-placeholder"></div>
                <img 
                    src="https://deckofcardsapi.com/static/img/back.png" 
                    class="w-full h-full rounded-lg"
                    onload="this.previousElementSibling.remove()"
                >
            </div>`;
    }

    const valueMap = {
        'A': 'A', '2': '2', '3': '3', '4': '4', '5': '5',
        '6': '6', '7': '7', '8': '8', '9': '9', '10': '0',
        'J': 'J', 'Q': 'Q', 'K': 'K'
    };
    
    const suitMap = {
        'hearts': 'H',
        'diamonds': 'D',
        'clubs': 'C',
        'spades': 'S'
    };

    const cardCode = `${valueMap[card.value]}${suitMap[card.suit]}`;
    return `
        <div class="card">
            <div class="card-placeholder"></div>
            <img 
                src="https://deckofcardsapi.com/static/img/${cardCode}.png" 
                class="w-full h-full rounded-lg"
                onload="this.previousElementSibling.remove()"
            >
        </div>`;
}

function drawCard() {
    let suit = Object.keys(suits)[Math.floor(Math.random() * 4)];
    let value = values[Math.floor(Math.random() * values.length)];
    return { suit, value };
}

function startGame() {
    if (balance <= 0) {
        alert("You're out of money! Game over!");
        return;
    }
    
    document.getElementById('landingPage').classList.add('hidden');
    document.getElementById('gameScreen').classList.remove('hidden');
    document.getElementById('gameOverScreen').classList.add('hidden');
    
    playerHand = [drawCard(), drawCard()];
    dealerHand = [drawCard()];
    gameInProgress = true;
    enableButtons(true);
    renderGame(true);
    updateTotals();
}

function renderGame(isInitial = false) {
    document.getElementById('playerCards').innerHTML = 
        playerHand.map(card => createCardElement(card)).join('');
    
    document.getElementById('dealerCards').innerHTML = 
        dealerHand.map((card, index) => 
            createCardElement(card, isInitial && index > 0)
        ).join('');
    
    updateTotals();
}

function updateTotals() {
    document.getElementById('playerTotal').textContent = getHandValue(playerHand);
    document.getElementById('dealerTotal').textContent = 
        gameInProgress ? getHandValue([dealerHand[0]]) : getHandValue(dealerHand);
}

function enableButtons(enabled) {
    const buttons = ['hitButton', 'standButton'];
    buttons.forEach(buttonId => {
        const button = document.getElementById(buttonId);
        button.disabled = !enabled;
        button.style.opacity = enabled ? '1' : '0.5';
    });
}

function hit() {
    if (!gameInProgress) return;
    
    playerHand.push(drawCard());
    renderGame(true);
    
    let playerTotal = getHandValue(playerHand);
    if (playerTotal > 21) {
        balance -= 100;
        document.getElementById('balance').textContent = `$${balance}`;
        endGame("You Bust! Dealer Wins.", false);
    }
}

function stand() {
    if (!gameInProgress) return;
    
    while (getHandValue(dealerHand) < 17) {
        dealerHand.push(drawCard());
    }
    
    renderGame(false);
    determineWinner();
}

function getHandValue(hand) {
    let total = 0;
    let aces = 0;
    
    hand.forEach(card => {
        if (['J', 'Q', 'K'].includes(card.value)) {
            total += 10;
        } else if (card.value === 'A') {
            aces += 1;
            total += 11;
        } else {
            total += parseInt(card.value);
        }
    });
    
    while (total > 21 && aces > 0) {
        total -= 10;
        aces--;
    }
    
    return total;
}

function determineWinner() {
    let playerTotal = getHandValue(playerHand);
    let dealerTotal = getHandValue(dealerHand);
    
    if (playerTotal > 21) {
        balance -= 100;
        endGame("You Bust! Dealer Wins.", false);
    } else if (dealerTotal > 21) {
        balance += 100;
        endGame("Dealer Busts! You Win!", true);
    } else if (playerTotal > dealerTotal) {
        balance += 100;
        endGame("You Win!", true);
    } else if (dealerTotal > playerTotal) {
        balance -= 100;
        endGame("Dealer Wins!", false);
    } else {
        endGame("It's a Tie!", false);
    }
    
    document.getElementById('balance').textContent = `$${balance}`;
}

function endGame(message, isWin = false) {
    gameInProgress = false;
    const gameOverText = document.getElementById('gameOverText');
    gameOverText.textContent = message;
    gameOverText.className = isWin ? 
        'casino-title game-over-text win celebrate' : 
        'casino-title game-over-text shake';
    
    if (isWin) {
        stats.gamesWon++;
    } else {
        stats.gamesLost++;
    }
    
    const totalGames = stats.gamesWon + stats.gamesLost;
    const winRate = totalGames > 0 ? Math.round((stats.gamesWon / totalGames) * 100) : 0;
    
    document.getElementById('finalGamesWon').textContent = stats.gamesWon;
    document.getElementById('finalGamesLost').textContent = stats.gamesLost;
    document.getElementById('winRate').textContent = winRate;
    document.getElementById('finalBalance').textContent = balance;
    
    const playAgainBtn = document.getElementById('playAgainBtn');
    const resetBtn = document.getElementById('resetBtn');
    if (balance <= 0) {
        playAgainBtn.classList.add('hidden');
        resetBtn.classList.remove('hidden');
    } else {
        playAgainBtn.classList.remove('hidden');
        resetBtn.classList.add('hidden');
    }
    
    document.getElementById('gameScreen').classList.add('hidden');
    document.getElementById('gameOverScreen').classList.remove('hidden');
}

function resetGame() {
    balance = 1000;
    stats = {
        gamesWon: 0,
        gamesLost: 0
    };
    document.getElementById('balance').textContent = `$${balance}`;
    startGame();
}

function restartGame() {
    if (balance <= 0) {
        const playAgainBtn = document.getElementById('playAgainBtn');
        const resetBtn = document.getElementById('resetBtn');
        playAgainBtn.classList.add('hidden');
        resetBtn.classList.remove('hidden');
        return;
    }
    startGame();
}

function showInstructions() {
    document.getElementById('instructionsModal').classList.remove('hidden');
}

function hideInstructions() {
    document.getElementById('instructionsModal').classList.add('hidden');
}

function exitToMenu() {
    document.getElementById('gameOverScreen').classList.add('hidden');
    document.getElementById('landingPage').classList.remove('hidden');
}

document.addEventListener('DOMContentLoaded', function() {
    const hitButton = document.getElementById('hitButton');
    const standButton = document.getElementById('standButton');
    
    hitButton.addEventListener('click', hit);
    standButton.addEventListener('click', stand);
    
    balance = 1000;
    document.getElementById('balance').textContent = `$${balance}`;
}); 