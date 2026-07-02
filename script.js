const suits = { hearts: 'H', diamonds: 'D', clubs: 'C', spades: 'S' };
const values = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
const valueMap = { A:'A','2':'2','3':'3','4':'4','5':'5','6':'6','7':'7','8':'8','9':'9','10':'0',J:'J',Q:'Q',K:'K' };
const numberOfDecks = 6;
const SHOE_SIZE = 52 * numberOfDecks;

let balance = 1000;
let currentBet = 100;
let playerHand = [], dealerHand = [];
let gameInProgress = false;
let isAnimating = false;
let activeTimeouts = [];
let stats = { won: 0, lost: 0 };
let streak = 0;
let isParticlesPaused = false;

let shoe = [];
let shoeIndex = 0;

function buildShoe() {
shoe = [];
for (let d = 0; d < numberOfDecks; d++) {
for (const suit of Object.keys(suits)) {
for (const val of values) {
shoe.push({ value: val, suit });
}
}
}
shuffleShoe();
shoeIndex = 0;
}

function shuffleShoe() {
for (let i = shoe.length - 1; i > 0; i--) {
const j = Math.floor(Math.random() * (i + 1));
[shoe[i], shoe[j]] = [shoe[j], shoe[i]];
}
}

// Reshuffle only between rounds — never mid-hand, or a card already on the
// table could be dealt again after the shoe index resets to 0.
function maybeReshuffle() {
if (shoeIndex >= shoe.length * 0.75) {
buildShoe();
toast('🔀 Decks Shuffled');
}
}

function drawCard() {
return { ...shoe[shoeIndex++] };
}

buildShoe();

(function () {
const canvas = document.getElementById('particles');
const ctx = canvas.getContext('2d');
let W, H, particles = [];
function resize() { W = canvas.width = innerWidth; H = canvas.height = innerHeight; }
resize();
window.addEventListener('resize', resize);
for (let i = 0; i < 40; i++) particles.push({
x: Math.random() * 1000, y: Math.random() * 800,
r: Math.random() * 1.2 + 0.3,
vx: (Math.random() - 0.5) * 0.2, vy: (Math.random() - 0.5) * 0.2,
a: Math.random() * 0.4 + 0.05
});
function draw() {
if (!isParticlesPaused) {
ctx.clearRect(0, 0, W, H);
particles.forEach(p => {
p.x += p.vx; p.y += p.vy;
if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
ctx.beginPath();
ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
ctx.fillStyle = `rgba(255,215,0,${p.a})`;
ctx.fill();
});
}
requestAnimationFrame(draw);
}
draw();
})();

let confettiCanvas = null;
let confettiCtx = null;
let confettiParticles = [];
let confettiAnimId = null;

function spawnConfetti() {
if (!confettiCanvas) {
confettiCanvas = document.createElement('canvas');
confettiCanvas.className = 'confetti-canvas';
document.body.appendChild(confettiCanvas);
confettiCtx = confettiCanvas.getContext('2d');
}
confettiCanvas.width = window.innerWidth;
confettiCanvas.height = window.innerHeight;
confettiCanvas.style.display = 'block';
const colors = ['#ffd700','#ffb700','#fff5b0','#ff6b6b','#4ecdc4','#ffffff'];
confettiParticles = [];
for (let i = 0; i < 80; i++) {
confettiParticles.push({
x: Math.random() * window.innerWidth,
y: -10 - Math.random() * 200,
vx: (Math.random() - 0.5) * 3,
vy: Math.random() * 3 + 2,
rot: Math.random() * 360,
rotV: (Math.random() - 0.5) * 8,
w: Math.random() * 8 + 4,
h: Math.random() * 8 + 4,
color: colors[Math.floor(Math.random() * colors.length)],
circle: Math.random() > 0.5,
alpha: 1
});
}
if (confettiAnimId) cancelAnimationFrame(confettiAnimId);
const endTime = Date.now() + 3000;
function animateConfetti() {
confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
const now = Date.now();
const remaining = endTime - now;
confettiParticles.forEach(p => {
p.x += p.vx;
p.y += p.vy;
p.rot += p.rotV;
if (remaining < 800) p.alpha = Math.max(0, remaining / 800);
confettiCtx.save();
confettiCtx.globalAlpha = p.alpha;
confettiCtx.translate(p.x, p.y);
confettiCtx.rotate(p.rot * Math.PI / 180);
confettiCtx.fillStyle = p.color;
if (p.circle) {
confettiCtx.beginPath();
confettiCtx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
confettiCtx.fill();
} else {
confettiCtx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
}
confettiCtx.restore();
});
if (now < endTime) {
confettiAnimId = requestAnimationFrame(animateConfetti);
} else {
confettiCanvas.style.display = 'none';
confettiParticles = [];
}
}
confettiAnimId = requestAnimationFrame(animateConfetti);
}

function safeSetTimeout(fn, ms) {
const id = setTimeout(() => { activeTimeouts = activeTimeouts.filter(t => t !== id); fn(); }, ms);
activeTimeouts.push(id);
return id;
}

function cleanupGame() {
activeTimeouts.forEach(clearTimeout);
activeTimeouts = [];
isAnimating = false;
gameInProgress = false;
document.getElementById('dealerThinking').classList.remove('visible');
}

function toast(msg) {
const el = document.createElement('div');
el.className = 'toast';
el.textContent = msg;
document.getElementById('toastContainer').appendChild(el);
setTimeout(() => el.remove(), 2800);
}

function flashResult(type) {
const el = document.getElementById('resultFlash');
el.className = 'result-flash ' + type;
setTimeout(() => { el.className = 'result-flash'; }, 600);
}

function bumpBalance(newVal) {
const el = document.getElementById('balanceVal');
el.textContent = `$${newVal}`;
el.classList.remove('bump');
void el.offsetWidth;
el.classList.add('bump');
setTimeout(() => el.classList.remove('bump'), 400);
}

function setBet(amount) {
if (gameInProgress) return;
currentBet = amount;
document.querySelectorAll('.bet-chip').forEach(b => b.classList.remove('active'));
// An all-in remainder below the minimum chip has no matching button.
const chip = document.getElementById(`bet${amount}`);
if (chip) chip.classList.add('active');
}

function updateBetChipsAvailability() {
document.querySelectorAll('.bet-chip').forEach(b => {
b.disabled = gameInProgress;
});
}

function updateStreak(isWin) {
const pill = document.getElementById('streakPill');
if (isWin === null) {
streak = 0;
pill.classList.remove('visible', 'hot');
return;
}
if (isWin) {
streak = streak > 0 ? streak + 1 : 1;
} else {
streak = streak < 0 ? streak - 1 : -1;
}
if (Math.abs(streak) >= 2) {
pill.classList.add('visible');
if (streak >= 2) {
pill.textContent = `🔥 ${streak} WIN STREAK`;
pill.classList.add('hot');
} else {
pill.textContent = `${Math.abs(streak)} LOSS STREAK`;
pill.classList.remove('hot');
}
} else {
pill.classList.remove('visible');
}
}

function calcTotal(hand) {
let total = 0, aces = 0;
for (const c of hand) {
if (c.value === 'A') { aces++; total += 11; }
else if (['K','Q','J'].includes(c.value)) total += 10;
else total += parseInt(c.value);
}
while (total > 21 && aces > 0) { total -= 10; aces--; }
return total;
}

function cardLabel(card) {
const suitSymbols = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
return `${card.value}${suitSymbols[card.suit]}`;
}

function cardImgSrc(card) {
return `https://deckofcardsapi.com/static/img/${valueMap[card.value]}${suits[card.suit]}.png`;
}

function makeCardEl(card, hidden, dealDelay) {
const wrap = document.createElement('div');
wrap.className = 'card-wrap';
wrap.style.animationDelay = `${dealDelay}ms`;
const inner = document.createElement('div');
inner.className = 'card-inner';
const back = document.createElement('div');
back.className = 'card-back-face';
const face = document.createElement('div');
face.className = 'card-face';
const shimmer = document.createElement('div');
shimmer.className = 'card-shimmer';
const img = document.createElement('img');
img.src = cardImgSrc(card);
img.style.opacity = '0';
img.onload = () => {
shimmer.remove();
img.style.opacity = '1';
};
img.onerror = () => {
shimmer.remove();
const fallback = document.createElement('div');
fallback.className = 'card-error';
fallback.textContent = cardLabel(card);
face.appendChild(fallback);
};
face.appendChild(shimmer);
face.appendChild(img);
inner.appendChild(back);
inner.appendChild(face);
wrap.appendChild(inner);
if (!hidden) inner.classList.add('flipped');
requestAnimationFrame(() => wrap.classList.add('dealing'));
return wrap;
}

function flipCard(wrap) {
return new Promise(resolve => {
const inner = wrap.querySelector('.card-inner');
inner.classList.add('flipped');
setTimeout(resolve, 560);
});
}

function renderHands(dealerHidden) {
const dc = document.getElementById('dealerCards');
const pc = document.getElementById('playerCards');
dc.innerHTML = '';
pc.innerHTML = '';
dealerHand.forEach((card, i) => {
const hidden = dealerHidden && i === 1;
dc.appendChild(makeCardEl(card, hidden, i * 80));
});
playerHand.forEach((card, i) => {
pc.appendChild(makeCardEl(card, false, i * 80));
});
}

function appendCard(container, card, hidden) {
const el = makeCardEl(card, hidden, 0);
container.appendChild(el);
return el;
}

function updateTotals(dealerHidden) {
const pt = calcTotal(playerHand);
const dt = dealerHidden ? calcTotal([dealerHand[0]]) : calcTotal(dealerHand);
const ptEl = document.getElementById('playerTotal');
const dtEl = document.getElementById('dealerTotal');
ptEl.textContent = pt;
ptEl.className = 'total-pill' + (pt > 21 ? ' bust' : pt === 21 ? ' twenty-one' : '');
if (dealerHidden) {
dtEl.textContent = `${dt}+?`;
dtEl.className = 'total-pill';
} else {
dtEl.textContent = dt;
dtEl.className = 'total-pill' + (dt > 21 ? ' bust' : dt === 21 ? ' twenty-one' : '');
}
}

function startGame() {
if (balance < currentBet) {
if (balance <= 0) {
showGameOver('YOU LOSE', 'Out of funds!', 'loss');
return;
}
// Never wager more than the player actually has (payouts can leave a
// balance below the minimum chip).
currentBet = balance >= 25 ? 25 : balance;
setBet(currentBet);
}
cleanupGame();
maybeReshuffle();
playerHand = [];
dealerHand = [];
gameInProgress = true;
isAnimating = false;
isParticlesPaused = false;
document.getElementById('landingPage').classList.add('exit');
safeSetTimeout(() => { document.getElementById('landingPage').style.display = 'none'; }, 600);
document.getElementById('gameScreen').classList.add('visible');
document.getElementById('gameOverScreen').classList.remove('visible');
updateBetChipsAvailability();
playerHand = [drawCard(), drawCard()];
dealerHand = [drawCard(), drawCard()];
renderHands(true);
updateTotals(true);
enableButtons(false);
safeSetTimeout(() => {
if (!checkBlackjack()) enableButtons(true);
}, 600);
}

function enableButtons(on) {
document.getElementById('hitBtn').disabled = !on;
document.getElementById('standBtn').disabled = !on;
const canDouble = on && playerHand.length === 2 && balance >= currentBet * 2;
document.getElementById('doubleBtn').disabled = !canDouble;
updateBetChipsAvailability();
}

function hit() {
if (!gameInProgress || isAnimating) return;
enableButtons(false);
isAnimating = true;
const card = drawCard();
playerHand.push(card);
appendCard(document.getElementById('playerCards'), card, false);
updateTotals(true);
const total = calcTotal(playerHand);
if (total > 21) {
safeSetTimeout(() => { revealDealerAndResolve(false); }, 400);
} else if (total === 21) {
toast('21! Standing automatically');
safeSetTimeout(() => standInternal(), 500);
} else {
isAnimating = false;
enableButtons(true);
}
}

function doubleDown() {
if (!gameInProgress || isAnimating || playerHand.length !== 2) return;
if (balance < currentBet * 2) { toast('Not enough balance to double!'); return; }
currentBet *= 2;
toast(`Bet doubled to $${currentBet}!`);
enableButtons(false);
isAnimating = true;
const card = drawCard();
playerHand.push(card);
appendCard(document.getElementById('playerCards'), card, false);
updateTotals(true);
safeSetTimeout(() => standInternal(), 500);
}

function stand() {
if (!gameInProgress || isAnimating) return;
standInternal();
}

function standInternal() {
gameInProgress = false;
enableButtons(false);
isAnimating = true;
revealDealerAndResolve(true);
}

function revealDealerAndResolve(doDrawing) {
const dealerCards = document.getElementById('dealerCards');
const hiddenWrap = dealerCards.children[1];
if (hiddenWrap) {
flipCard(hiddenWrap).then(() => {
updateTotals(false);
if (doDrawing) {
safeSetTimeout(() => dealerDraw(), 400);
} else {
safeSetTimeout(() => { isAnimating = false; determineWinner(); }, 400);
}
});
} else {
if (doDrawing) dealerDraw();
else { isAnimating = false; determineWinner(); }
}
}

function dealerDraw() {
const total = calcTotal(dealerHand);
if (total < 17) {
document.getElementById('dealerThinking').classList.add('visible');
safeSetTimeout(() => {
document.getElementById('dealerThinking').classList.remove('visible');
const card = drawCard();
dealerHand.push(card);
appendCard(document.getElementById('dealerCards'), card, false);
updateTotals(false);
safeSetTimeout(() => dealerDraw(), 500);
}, 600);
} else {
isAnimating = false;
determineWinner();
}
}

function checkBlackjack() {
const pt = calcTotal(playerHand);
const dt = calcTotal(dealerHand);
const pBJ = pt === 21 && playerHand.length === 2;
const dBJ = dt === 21 && dealerHand.length === 2;
if (!pBJ && !dBJ) return false;
gameInProgress = false;
const hiddenWrap = document.getElementById('dealerCards').children[1];
if (hiddenWrap) flipCard(hiddenWrap).then(() => updateTotals(false));
safeSetTimeout(() => {
const bjPay = Math.floor(currentBet * 1.5);
if (pBJ && !dBJ) {
balance += bjPay;
bumpBalance(balance);
showGameOver('BLACKJACK!', `Natural 21 — +$${bjPay}`, 'win');
} else if (!pBJ && dBJ) {
balance -= currentBet;
bumpBalance(balance);
showGameOver('YOU LOSE', 'Dealer Blackjack', 'loss');
} else {
showGameOver('PUSH', 'Both have Blackjack', 'push');
}
isAnimating = false;
}, 1000);
return true;
}

function determineWinner() {
const pt = calcTotal(playerHand);
const dt = calcTotal(dealerHand);
const pBJ = pt === 21 && playerHand.length === 2;
const dBJ = dt === 21 && dealerHand.length === 2;
if (pt > 21) {
balance -= currentBet;
bumpBalance(balance);
showGameOver('YOU BUST', 'Over 21 — Dealer wins', 'loss');
} else if (dBJ && !pBJ) {
balance -= currentBet;
bumpBalance(balance);
showGameOver('YOU LOSE', 'Dealer Blackjack', 'loss');
} else if (dt > 21) {
balance += currentBet;
bumpBalance(balance);
showGameOver('YOU WIN', 'Dealer busts!', 'win');
} else if (pt > dt) {
balance += currentBet;
bumpBalance(balance);
showGameOver('YOU WIN', 'Higher hand!', 'win');
} else if (dt > pt) {
balance -= currentBet;
bumpBalance(balance);
showGameOver('YOU LOSE', 'Dealer wins', 'loss');
} else {
showGameOver('PUSH', 'Equal hands', 'push');
}
}

function buildHandHistory() {
const pt = calcTotal(playerHand);
const dt = calcTotal(dealerHand);
const playerCards = playerHand.map(cardLabel).join(' ');
const dealerCards = dealerHand.map(cardLabel).join(' ');
return `<strong>Round Recap</strong>Your hand: ${playerCards} = ${pt}<br>Dealer hand: ${dealerCards} = ${dt}`;
}

function showGameOver(title, sub, type) {
gameInProgress = false;
isParticlesPaused = true;
const isWin = type === 'win';
const isLoss = type === 'loss';
if (isWin) { stats.won++; flashResult('win-flash'); spawnConfetti(); updateStreak(true); }
else if (isLoss) { stats.lost++; flashResult('lose-flash'); updateStreak(false); }
document.getElementById('goResult').textContent = title;
document.getElementById('goResult').className = 'go-result' + (isLoss ? ' loss' : isWin ? '' : ' push');
document.getElementById('goSub').textContent = sub;
const total = stats.won + stats.lost;
const rate = total > 0 ? Math.round(stats.won / total * 100) : 0;
document.getElementById('statWon').textContent = stats.won;
document.getElementById('statLost').textContent = stats.lost;
document.getElementById('statRate').textContent = rate + '%';
document.getElementById('statBalance').textContent = '$' + balance;
document.getElementById('handHistory').innerHTML = buildHandHistory();
const preview = document.getElementById('finalCardsPreview');
preview.innerHTML = '';
[...dealerHand, ...playerHand].slice(0, 8).forEach(card => {
const mc = document.createElement('div');
mc.className = 'mini-card';
const img = document.createElement('img');
img.src = cardImgSrc(card);
img.onerror = () => { img.remove(); mc.textContent = cardLabel(card); };
mc.appendChild(img);
preview.appendChild(mc);
});
document.getElementById('playAgainBtn').classList.toggle('hidden', balance <= 0);
document.getElementById('resetBtn').classList.toggle('hidden', balance > 0);
const gos = document.getElementById('gameOverScreen');
gos.classList.add('visible', 'entering');
setTimeout(() => gos.classList.remove('entering'), 600);
if (currentBet > balance && balance > 0) {
currentBet = balance >= 25 ? 25 : balance;
setBet(currentBet);
}
}

function restartGame() {
if (balance <= 0) {
document.getElementById('playAgainBtn').classList.add('hidden');
document.getElementById('resetBtn').classList.remove('hidden');
return;
}
document.getElementById('gameOverScreen').classList.remove('visible');
startGame();
}

function resetGame() {
balance = 1000;
stats = { won: 0, lost: 0 };
streak = 0;
currentBet = 100;
setBet(100);
document.getElementById('streakPill').classList.remove('visible');
bumpBalance(balance);
document.getElementById('gameOverScreen').classList.remove('visible');
startGame();
}

function exitToMenu() {
cleanupGame();
playerHand = [];
dealerHand = [];
isParticlesPaused = false;
document.getElementById('gameOverScreen').classList.remove('visible');
document.getElementById('gameScreen').classList.remove('visible');
const lp = document.getElementById('landingPage');
lp.style.display = '';
lp.classList.remove('exit');
}

function openModal(id) { document.getElementById(id).classList.add('visible'); }
function closeModal(id) { document.getElementById(id).classList.remove('visible'); }

document.addEventListener('keydown', e => {
if (e.key === 'Escape') {
['howtoModal','aboutModal'].forEach(closeModal);
return;
}
if (['howtoModal','aboutModal'].some(id => document.getElementById(id).classList.contains('visible'))) return;
if (e.key === 'h' || e.key === 'H') hit();
if (e.key === 's' || e.key === 'S') stand();
if (e.key === 'd' || e.key === 'D') doubleDown();
});

document.addEventListener('DOMContentLoaded', () => { bumpBalance(balance); });
