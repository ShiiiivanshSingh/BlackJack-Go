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
let usedCards = new Set();
let numberOfDecks = 6; // Standard casino usually uses 6-8 decks
let maxCardsBeforeReshuffle = 52 * numberOfDecks * 0.75; // Reshuffle at 75% penetration
let isAnimating = false;
let activeTimeouts = [];

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
    // Check if we need to reshuffle based on penetration
    if (usedCards.size >= maxCardsBeforeReshuffle) {
        usedCards.clear();
        showShuffleMessage();
        // Add a small delay to let the shuffle message be visible
        return new Promise(resolve => {
            setTimeout(() => {
                let card;
                do {
                    let suit = Object.keys(suits)[Math.floor(Math.random() * 4)];
                    let value = values[Math.floor(Math.random() * values.length)];
                    card = `${value}-${suit}`;
                } while (usedCards.has(card));
                
                usedCards.add(card);
                resolve({
                    suit: card.split('-')[1],
                    value: card.split('-')[0]
                });
            }, 1000);
        });
    }
    
    let card;
    do {
        let suit = Object.keys(suits)[Math.floor(Math.random() * 4)];
        let value = values[Math.floor(Math.random() * values.length)];
        card = `${value}-${suit}`;
    } while (usedCards.has(card) && usedCards.size < (52 * numberOfDecks));
    
    usedCards.add(card);
    return {
        suit: card.split('-')[1],
        value: card.split('-')[0]
    };
}

function startGame() {
    if (balance < 100) {
        document.getElementById('playAgainBtn').classList.add('hidden');
        document.getElementById('resetBtn').classList.remove('hidden');
        return;
    }
    
    // Reset game state
    gameInProgress = true;
    playerHand = [];
    dealerHand = [];
    
    // Draw initial cards
    playerHand = [drawCard(), drawCard()];
    dealerHand = [drawCard(), drawCard()];
    
    document.getElementById('landingPage').classList.add('hidden');
    document.getElementById('gameScreen').classList.remove('hidden');
    document.getElementById('gameOverScreen').classList.add('hidden');
    
    // Enable buttons and reset their styles
    const hitButton = document.getElementById('hitButton');
    const standButton = document.getElementById('standButton');
    
    hitButton.disabled = false;
    standButton.disabled = false;
    
    // Remove any disabled classes or styles
    hitButton.classList.remove('disabled');
    standButton.classList.remove('disabled');
    hitButton.style.opacity = '1';
    standButton.style.opacity = '1';
    
    renderGame(true);
    updateTotals();
    checkForBlackjack();
}

function renderGame(isInitial = false) {
    document.getElementById('playerCards').innerHTML = 
        playerHand.map(card => createCardElement(card)).join('');
    
    document.getElementById('dealerCards').innerHTML = 
        dealerHand.map((card, index) => 
            createCardElement(card, isInitial && index === 1)
        ).join('');
    
    updateTotals();
}

function updateTotals() {
    document.getElementById('playerTotal').textContent = calculateHandTotal(playerHand);
    document.getElementById('dealerTotal').textContent = gameInProgress ? 
        calculateHandTotal([dealerHand[0]]) : // Only first card during game
        calculateHandTotal(dealerHand);  // All cards when game is over
}

function enableButtons(enabled) {
    const buttons = ['hitButton', 'standButton'];
    buttons.forEach(buttonId => {
        const button = document.getElementById(buttonId);
        button.disabled = !enabled;
        button.style.opacity = enabled ? '1' : '0.5';
    });
}

function cleanupGame() {
    // Clear all timeouts
    activeTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
    activeTimeouts = [];
    
    // Remove all overlay messages
    const overlays = document.querySelectorAll('.shuffle-message, .reveal-message, [class*="fixed inset-0"]');
    overlays.forEach(overlay => overlay.remove());
    
    // Reset animation flag
    isAnimating = false;
    
    // Reset button states
    const hitButton = document.getElementById('hitButton');
    const standButton = document.getElementById('standButton');
    
    hitButton.disabled = false;
    standButton.disabled = false;
    hitButton.classList.remove('disabled');
    standButton.classList.remove('disabled');
    hitButton.style.opacity = '1';
    standButton.style.opacity = '1';
    
    // Reset game state
    gameInProgress = true;
}

function hit() {
    if (!gameInProgress || isAnimating) return;
    isAnimating = true;
    
    playerHand.push(drawCard());
    renderGame(true);
    
    let playerTotal = calculateHandTotal(playerHand);
    if (playerTotal > 21) {
        showRevealMessage();
        renderGame(false);
        updateTotals();
        
        safeSetTimeout(() => {
            balance -= 100;
            document.getElementById('balance').textContent = `$${balance}`;
            endGame("<div class='text-2xl sm:text-4xl mb-1'>YOU LOSE!</div><div class='text-xs sm:text-xl'>Bust!</div>", false);
            isAnimating = false;
        }, 1500);
    } else {
        isAnimating = false;
    }
}

function stand() {
    if (!gameInProgress || isAnimating) return;
    isAnimating = true;
    
    showRevealMessage();
    gameInProgress = false;
    renderGame(false);
    updateTotals();
    
    safeSetTimeout(() => {
        determineWinner();
        isAnimating = false;
    }, 1000);
}

function calculateHandTotal(hand) {
    let total = 0;
    let aces = 0;
    
    for (let card of hand) {
        if (card.value === 'A') {
            aces++;
            total += 11;
        } else if (['K', 'Q', 'J'].includes(card.value)) {
            total += 10;
        } else {
            total += parseInt(card.value);
        }
    }
    
    // Adjust for aces
    while (total > 21 && aces > 0) {
        total -= 10;
        aces--;
    }
    
    return total;
}

function showRoundOver(playerTotal, dealerTotal, playerBlackjack, dealerBlackjack) {
    const overlayDiv = document.createElement('div');
    overlayDiv.className = 'fixed inset-0 flex items-center justify-center z-40';
    overlayDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    overlayDiv.style.opacity = '0';
    overlayDiv.style.transition = 'opacity 0.3s ease';
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'text-[#ffd700] text-3xl sm:text-4xl font-bold text-center';
    messageDiv.style.transform = 'translateY(20px)';
    messageDiv.style.opacity = '0';
    messageDiv.style.transition = 'all 0.3s ease';
    
    if (dealerBlackjack) {
        messageDiv.textContent = 'Dealer Natural Blackjack!';
    } else if (playerTotal > 21) {
        messageDiv.textContent = 'Bust!';
    } else if (dealerTotal > 21) {
        messageDiv.textContent = 'Dealer Busts!';
    } else if (playerTotal > dealerTotal) {
        messageDiv.textContent = 'You Win!';
    } else if (dealerTotal > playerTotal) {
        messageDiv.textContent = 'Dealer Wins!';
    } else {
        messageDiv.textContent = 'Push!';
    }
    
    overlayDiv.appendChild(messageDiv);
    document.body.appendChild(overlayDiv);
    
    setTimeout(() => {
        overlayDiv.style.opacity = '1';
        messageDiv.style.opacity = '1';
        messageDiv.style.transform = 'translateY(0)';
    }, 30);
    
    // Remove after 1200ms (just before game over screen)
    setTimeout(() => {
        overlayDiv.style.opacity = '0';
        messageDiv.style.opacity = '0';
        messageDiv.style.transform = 'translateY(-20px)';
        
        setTimeout(() => {
            overlayDiv.remove();
        }, 300);
    }, 1200);
}

function determineWinner() {
    let playerTotal = calculateHandTotal(playerHand);
    let dealerTotal = calculateHandTotal(dealerHand);
    
    let playerBlackjack = playerTotal === 21 && playerHand.length === 2;
    let dealerBlackjack = dealerTotal === 21 && dealerHand.length === 2;
    
    showRoundOver(playerTotal, dealerTotal, playerBlackjack, dealerBlackjack);
    
    // Show game over screen after round over animation (1500ms total)
    setTimeout(() => {
        if (playerBlackjack && !dealerBlackjack) {
            balance += 150;
            endGame('<div class="text-2xl sm:text-4xl mb-1">YOU WIN!</div><div class="text-xs sm:text-xl">Natural Blackjack!</div>', true);
        } else if (!playerBlackjack && dealerBlackjack) {
            balance -= 100;
            endGame('<div class="text-2xl sm:text-4xl mb-1">YOU LOSE!</div><div class="text-xs sm:text-xl">Dealer has Natural Blackjack!</div>', false);
        } else if (playerBlackjack && dealerBlackjack) {
            endGame('<div class="text-2xl sm:text-4xl mb-1">PUSH!</div><div class="text-xs sm:text-xl">Both have Natural Blackjack!</div>', null);
        } else if (playerTotal > 21) {
            balance -= 100;
            endGame('<div class="text-2xl sm:text-4xl mb-1">YOU LOSE!</div><div class="text-xs sm:text-xl">Bust!</div>', false);
        } else if (dealerTotal > 21) {
            balance += 100;
            endGame('<div class="text-2xl sm:text-4xl mb-1">YOU WIN!</div><div class="text-xs sm:text-xl">Dealer Busts!</div>', true);
        } else if (playerTotal > dealerTotal) {
            balance += 100;
            endGame('<div class="text-2xl sm:text-4xl mb-1">YOU WIN!</div><div class="text-xs sm:text-xl">Higher Hand!</div>', true);
        } else if (dealerTotal > playerTotal) {
            balance -= 100;
            endGame('<div class="text-2xl sm:text-4xl mb-1">YOU LOSE!</div><div class="text-xs sm:text-xl">Dealer has Higher Hand</div>', false);
        } else {
            endGame('<div class="text-2xl sm:text-4xl mb-1">PUSH!</div><div class="text-xs sm:text-xl">Equal Hands</div>', null);
        }
        updateBalance();
        saveGameData();
    }, 1500);  // Reduced from 3000ms to match round over timing
}

function endGame(message, isWin = false) {
    gameInProgress = false;
    const gameOverText = document.getElementById('gameOverText');
    gameOverText.innerHTML = message;
    
    if (isWin !== null) {
        gameOverText.className = isWin ? 
            'casino-title game-over-text win celebrate' : 
            'casino-title game-over-text shake';
        
        if (isWin) {
            stats.gamesWon++;
        } else {
            stats.gamesLost++;
        }
    } else {
        gameOverText.className = 'casino-title game-over-text';
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
    stats.gamesWon = 0;
    stats.gamesLost = 0;
    saveGameData();
    updateBalance();
    updateStats();
    document.getElementById('playAgainBtn').classList.remove('hidden');
    document.getElementById('resetBtn').classList.add('hidden');
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

function showRevealMessage() {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'reveal-message';
    messageDiv.style.top = '40%'; 
    messageDiv.innerHTML = `
        <div class="reveal-text">
            <span>Dealer Card Revealed</span>
        </div>
    `;
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.remove();
    }, 1000);
}

function showShuffleMessage() {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'shuffle-message';
    messageDiv.textContent = 'Shuffling Decks...';
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.remove();
    }, 1500);
}

function revealDealerCard() {
    const dealerHiddenCard = document.querySelector('.dealer-cards .card.hidden');
    if (dealerHiddenCard) {
        dealerHiddenCard.classList.remove('hidden');
        // Update dealer's hand total display after revealing card
        updateHandTotal('dealer', calculateHandTotal(dealerHand));
    }
}

function showDealerDrawMessage() {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'shuffle-message';
    messageDiv.textContent = 'Dealer Drawing...';
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.remove();
    }, 800);
}

function showDealerStandMessage(total) {
    // Only show stand message if dealer's total is less than 21
    if (total < 21) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'shuffle-message';
        messageDiv.textContent = `Dealer Stands on ${total}`;
        document.body.appendChild(messageDiv);
        
        setTimeout(() => {
            messageDiv.remove();
        }, 800);
    }
}

function checkForBlackjack() {
    const playerTotal = calculateHandTotal(playerHand);
    const dealerTotal = calculateHandTotal(dealerHand);
    
    const playerBlackjack = playerTotal === 21 && playerHand.length === 2;
    const dealerBlackjack = dealerTotal === 21 && dealerHand.length === 2;
    
    if (playerBlackjack || dealerBlackjack) {
        gameInProgress = false;
        renderGame(false); // Show dealer's hidden card
        updateTotals();
        
        setTimeout(() => {
            if (playerBlackjack && !dealerBlackjack) {
                balance += 150; // Blackjack pays 3:2
                endGame('<div class="text-2xl sm:text-4xl mb-1">YOU WIN!</div><div class="text-xs sm:text-xl">Blackjack!</div>', true);
            } else if (!playerBlackjack && dealerBlackjack) {
                balance -= 100;
                endGame('<div class="text-2xl sm:text-4xl mb-1">YOU LOSE!</div><div class="text-xs sm:text-xl">Dealer has Blackjack</div>', false);
            } else if (playerBlackjack && dealerBlackjack) {
                endGame('<div class="text-2xl sm:text-4xl mb-1">PUSH!</div><div class="text-xs sm:text-xl">Both have Blackjack</div>', null);
            }
        }, 1200);
        return true;
    }
    return false;
}

function updateControls() {
    const hitButton = document.getElementById('hitButton');
    const standButton = document.getElementById('standButton');
    
    if (gameInProgress) {
        hitButton.disabled = false;
        hitButton.classList.remove('disabled');  // Remove any disabled styling
        standButton.disabled = false;
        standButton.classList.remove('disabled'); // Remove any disabled styling
    } else {
        hitButton.disabled = true;
        hitButton.classList.add('disabled');     // Add disabled styling
        standButton.disabled = true;
        standButton.classList.add('disabled');   // Add disabled styling
    }
}

function safeSetTimeout(callback, delay) {
    if (!gameInProgress && !isAnimating) return;
    const timeoutId = setTimeout(() => {
        const index = activeTimeouts.indexOf(timeoutId);
        if (index > -1) {
            activeTimeouts.splice(index, 1);
        }
        callback();
    }, delay);
    activeTimeouts.push(timeoutId);
    return timeoutId;
}

function playAgain() {
    if (balance < 100) {
        document.getElementById('playAgainBtn').classList.add('hidden');
        document.getElementById('resetBtn').classList.remove('hidden');
        return;
    }
    
    cleanupGame();
    
    playerHand = [drawCard(), drawCard()];
    dealerHand = [drawCard(), drawCard()];
    
    document.getElementById('gameOverScreen').classList.add('hidden');
    document.getElementById('gameScreen').classList.remove('hidden');
    
    renderGame(true);
    updateTotals();
    checkForBlackjack();
}

// Load saved data when game starts
function loadSavedData() {
    const savedData = localStorage.getItem('blackjackData');
    if (savedData) {
        const data = JSON.parse(savedData);
        balance = data.balance || 1000;
        stats.gamesWon = data.gamesWon || 0;
        stats.gamesLost = data.gamesLost || 0;
    }
    updateBalance();
    updateStats();
}

// Save data after each game
function saveGameData() {
    const gameData = {
        balance: balance,
        gamesWon: stats.gamesWon,
        gamesLost: stats.gamesLost
    };
    localStorage.setItem('blackjackData', JSON.stringify(gameData));
}

// Add updateBalance function
function updateBalance() {
    document.getElementById('balance').textContent = balance;
    document.getElementById('finalBalance').textContent = balance;
}

// Add updateStats function
function updateStats() {
    document.getElementById('finalGamesWon').textContent = stats.gamesWon;
    document.getElementById('finalGamesLost').textContent = stats.gamesLost;
    const totalGames = stats.gamesWon + stats.gamesLost;
    const winRate = totalGames > 0 ? Math.round((stats.gamesWon / totalGames) * 100) : 0;
    document.getElementById('winRate').textContent = winRate;
}

// Call loadSavedData when the game starts
window.onload = function() {
    loadSavedData();
    // ... any other initialization code ...
};

document.addEventListener('DOMContentLoaded', function() {
    const hitButton = document.getElementById('hitButton');
    const standButton = document.getElementById('standButton');
    
    hitButton.addEventListener('click', hit);
    standButton.addEventListener('click', stand);
    
    balance = 1000;
    document.getElementById('balance').textContent = `$${balance}`;
});

function showGameEndMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'shuffle-message';
    messageDiv.textContent = message;
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.remove();
    }, 1500);
} 