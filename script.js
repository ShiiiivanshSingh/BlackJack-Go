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
    
    gameInProgress = true;
    playerHand = [drawCard(), drawCard()];
    dealerHand = [drawCard(), drawCard()];
    
    document.getElementById('landingPage').classList.add('hidden');
    document.getElementById('gameScreen').classList.remove('hidden');
    document.getElementById('gameOverScreen').classList.add('hidden');
    
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

function hit() {
    if (!gameInProgress) return;
    enableButtons(false); // Prevent double-clicking during animation
    
    playerHand.push(drawCard());
    renderGame(true);
    
    let playerTotal = calculateHandTotal(playerHand);
    if (playerTotal > 21) {
        showRevealMessage();
        renderGame(false);
        updateTotals();
        
        setTimeout(() => {
            balance -= 100;
            document.getElementById('balance').textContent = `$${balance}`;
            endGame("<div class='text-2xl sm:text-4xl mb-1'>YOU LOSE!</div><div class='text-xs sm:text-xl'>Bust!</div>", false);
        }, 3000);
    } else {
        enableButtons(true); // Re-enable buttons if game continues
    }
}

function stand() {
    if (!gameInProgress) return;
    
    showRevealMessage();
    gameInProgress = false;
    renderGame(false);
    updateTotals();
    
    let dealerTotal = calculateHandTotal(dealerHand);
    
    setTimeout(() => {
        const drawDealerCard = () => {
            dealerTotal = calculateHandTotal(dealerHand);
            if (dealerTotal < 17) {
                showDealerDrawMessage();
                setTimeout(() => {
                    dealerHand.push(drawCard());
                    dealerTotal = calculateHandTotal(dealerHand);
                    renderGame(false);
                    updateTotals();
                    
                    if (dealerTotal < 17) {
                        setTimeout(drawDealerCard, 1000);
                    } else {
                        showDealerStandMessage(dealerTotal);
                        setTimeout(() => {
                            determineWinner();  
                        }, 3500);
                    }
                }, 800);
            } else {
                showDealerStandMessage(dealerTotal);
                setTimeout(() => {
                    determineWinner();  
                }, 3500);
            }
        };
        
        if (dealerTotal < 17) {
            drawDealerCard();
        } else {
            showDealerStandMessage(dealerTotal);
            setTimeout(() => {
                determineWinner();  // Now 3500ms delay
            }, 3500);
        }
        
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

function determineWinner() {
    let playerTotal = calculateHandTotal(playerHand);
    let dealerTotal = calculateHandTotal(dealerHand);
    
    let playerBlackjack = playerTotal === 21 && playerHand.length === 2;
    let dealerBlackjack = dealerTotal === 21 && dealerHand.length === 2;
    
    if (playerBlackjack && !dealerBlackjack) {
        balance += 150; // Blackjack pays 3:2
        endGame('<div class="text-2xl sm:text-4xl mb-1">YOU WIN!</div><div class="text-xs sm:text-xl">Blackjack!</div>', true);
    } else if (!playerBlackjack && dealerBlackjack) {
        balance -= 100;
        endGame('<div class="text-2xl sm:text-4xl mb-1">YOU LOSE!</div><div class="text-xs sm:text-xl">Dealer has Blackjack</div>', false);
    } else if (playerBlackjack && dealerBlackjack) {
        endGame('<div class="text-2xl sm:text-4xl mb-1">PUSH!</div><div class="text-xs sm:text-xl">Both have Blackjack</div>', null);
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
    
    document.getElementById('balance').textContent = `$${balance}`;
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

function showRevealMessage() {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'reveal-message';
    messageDiv.innerHTML = `
        <div class="reveal-text">
            <span>Dealer Card Revealed</span>
        </div>
    `;
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.remove();
    }, 3000);
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
    const messageDiv = document.createElement('div');
    messageDiv.className = 'shuffle-message';
    messageDiv.textContent = `Dealer Stands on ${total}`;
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.remove();
    }, 800);
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

document.addEventListener('DOMContentLoaded', function() {
    const hitButton = document.getElementById('hitButton');
    const standButton = document.getElementById('standButton');
    
    hitButton.addEventListener('click', hit);
    standButton.addEventListener('click', stand);
    
    balance = 1000;
    document.getElementById('balance').textContent = `$${balance}`;
}); 