// Interface utilisateur pour le jeu d'échecs
class ChessUI {
    constructor() {
        this.engine = new ChessEngine();
        this.boardElement = document.getElementById('chessboard');
        this.ai = new ChessAI(3); // Difficulté moyenne
        this.gameMode = 'pvp'; // 'pvp' ou 'ai'
        this.playerColor = Color.BLANC; // Couleur du joueur humain en mode IA
        this.isAIThinking = false;
        
        this.initializeUI();
        
        // Forcer la mise à jour après l'initialisation complète
        setTimeout(() => {
            // Synchroniser le mode de jeu avec la valeur initiale du sélecteur
            const gameModeSelect = document.getElementById('gameModeSelect');
            if (gameModeSelect) {
                this.gameMode = gameModeSelect.value || 'pvp';
                if (this.gameMode === 'ai') {
                    this.playerColor = Color.BLANC; // Humain = Blanc par défaut
                }
            }
            this.updateBoard();
            this.updateGameInfo();
            this.updatePlayerInfo();
        }, 0);
    }



    initializeUI() {
        this.createBoard();
        this.setupEventListeners();
        this.updatePlayerInfo();
    }

    createBoard() {
        this.boardElement.innerHTML = '';
        
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                const square = document.createElement('div');
                square.className = `square ${(x + y) % 2 === 0 ? 'light' : 'dark'}`;
                square.dataset.x = x;
                square.dataset.y = y;
                
                square.addEventListener('click', (e) => this.handleSquareClick(e));
                
                this.boardElement.appendChild(square);
            }
        }
    }

    setupEventListeners() {
        // Boutons de contrôle (vérifier l'existence avant d'ajouter les listeners)
        const newGameBtn = document.getElementById('newGameBtn');
        if (newGameBtn) newGameBtn.addEventListener('click', () => this.newGame());
        
        const headerNewGame = document.getElementById('headerNewGame');
        if (headerNewGame) headerNewGame.addEventListener('click', () => this.newGame());
        
        const resignBtn = document.getElementById('resignBtn');
        if (resignBtn) resignBtn.addEventListener('click', () => this.resign());
        
        const drawBtn = document.getElementById('drawBtn');
        if (drawBtn) drawBtn.addEventListener('click', () => this.offerDraw());
        
        // Sélecteur de mode de jeu
        const gameModeSelect = document.getElementById('gameModeSelect');
        if (gameModeSelect) {
            gameModeSelect.addEventListener('change', (e) => {
                this.gameMode = e.target.value;
                this.newGame();
            });
        }
        
        // Boutons de modal
        const modalNewGame = document.getElementById('modalNewGame');
        if (modalNewGame) modalNewGame.addEventListener('click', () => this.newGame());
        
        const modalClose = document.getElementById('modalClose');
        if (modalClose) modalClose.addEventListener('click', () => this.closeModal());
        
        // Attacher les event listeners de promotion
        this.attachPromotionListeners();
    }

    attachPromotionListeners() {
        // Boutons de promotion - utiliser une approche différente pour éviter les doublons
        document.querySelectorAll('.promotion-btn').forEach(btn => {
            // Supprimer tous les listeners existants en recréant l'élément
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            
            // Ajouter le nouveau listener
            newBtn.addEventListener('click', () => {
                const pieceType = newBtn.dataset.piece;
                this.handlePromotion(pieceType);
            });
        });
    }

    handleSquareClick(event) {
        console.log('Click détecté - Mode:', this.gameMode, 'Joueur couleur:', this.playerColor, 'IA réfléchit:', this.isAIThinking);

        // Ne pas permettre de jouer si l'IA réfléchit
        if (this.isAIThinking) return;

        // En mode IA, ne permettre de jouer que si c'est le tour du joueur
        if (this.gameMode === 'ai' && this.engine.currentPlayer.color !== this.playerColor) {
            console.log('Pas le tour du joueur - Tour actuel:', this.engine.currentPlayer.color);
            return;
        }

        const x = parseInt(event.target.dataset.x);
        const y = parseInt(event.target.dataset.y);

        // En mode IA, ne permettre de sélectionner qu'une pièce du joueur si aucune pièce n'est encore sélectionnée
        if (this.gameMode === 'ai') {
            const square = this.engine.plateau[y][x];
            const hasSelection = !!this.engine.selectedSquare;
            if (!hasSelection) {
                // Aucune sélection en cours: n'autoriser que la sélection d'une pièce du joueur
                if (!square.piece || square.piece.color !== this.playerColor) {
                    console.log('Sélection initiale bloquée - case vide ou pièce adverse');
                    return;
                }
            }
            // Si une pièce du joueur est déjà sélectionnée, on laisse le moteur gérer (y compris les captures sur une pièce adverse)
        }
        
        const result = this.engine.selectSquare(x, y);
        
        switch (result) {
            case 'selected':
                this.playSound('select');
                break;
            case 'moved': {
                this.playSound('move');
                this.updateBoard();
                this.updateGameInfo();
                this.updatePlayerInfo();
                const gameEnded = this.checkGameEnd();
                
                // Si le jeu n'est pas fini et qu'on est en mode IA et que c'est maintenant au tour de l'IA
                console.log('Après mouvement - Jeu fini:', gameEnded, 'Mode:', this.gameMode, 'Tour actuel:', this.engine.currentPlayer.color, 'Joueur:', this.playerColor);
                if (!gameEnded && this.gameMode === 'ai' && this.engine.currentPlayer.color !== this.playerColor) {
                    console.log('Déclenchement IA');
                    this.makeAIMove();
                } else {
                    console.log('IA non déclenchée');
                }
                break;
            }
            case 'promotion': {
                this.playSound('move');
                this.showPromotionModal();
                break;
            }
            case 'deselected':
                // Pièce désélectionnée, pas de son ni message
                break;
            case 'empty':
                // Clic sur case vide, pas d'action
                break;
            default:
                // Cas imprévu
                console.log('Résultat inattendu:', result);
                break;
        }
        
        this.updateBoard();
    }

    updateBoard() {
        const squares = this.boardElement.children;
        const gameStatus = this.engine.getGameStatus();
        
        for (let i = 0; i < squares.length; i++) {
            const square = squares[i];
            const x = parseInt(square.dataset.x);
            const y = parseInt(square.dataset.y);
            const piece = this.engine.plateau[y][x].piece;
            
            // Nettoyer les classes
            square.className = `square ${(x + y) % 2 === 0 ? 'light' : 'dark'}`;
            square.innerHTML = '';
            
            // Ajouter la pièce
            if (piece) {
                square.innerHTML = piece.toString();
            }
            
            // Ajouter les indicateurs visuels
            if (gameStatus.selectedSquare && 
                gameStatus.selectedSquare.x === x && 
                gameStatus.selectedSquare.y === y) {
                square.classList.add('selected');
            }
            
            if (gameStatus.possibleMoves.some(move => move.x === x && move.y === y)) {
                if (piece && piece.color !== this.engine.currentPlayer.color) {
                    square.classList.add('possible-capture');
                } else {
                    square.classList.add('possible-move');
                }
            }
            
            if (gameStatus.lastMove && 
                ((gameStatus.lastMove.fromX === x && gameStatus.lastMove.fromY === y) ||
                 (gameStatus.lastMove.toX === x && gameStatus.lastMove.toY === y))) {
                square.classList.add('last-move');
            }
            
            // Indiquer l'échec
            if (piece && piece.type === PieceType.ROI && 
                piece.color === this.engine.currentPlayer.color && 
                gameStatus.isInCheck) {
                square.classList.add('check');
            }
        }
    }

    updatePlayerInfo() {
        const whitePlayer = document.querySelector('.white-player');
        const blackPlayer = document.querySelector('.black-player');
        
        // Mettre à jour le joueur actif
        if (whitePlayer) whitePlayer.classList.toggle('active', this.engine.currentPlayer.color === Color.BLANC);
        if (blackPlayer) blackPlayer.classList.toggle('active', this.engine.currentPlayer.color === Color.NOIR);
        // Ne plus afficher la liste des pièces capturées (demande utilisateur)
    }

    updateCapturedPieces(selector, capturedPieces) {
        const container = document.querySelector(selector);
        if (!container) {
            console.warn(`Élément avec le sélecteur "${selector}" non trouvé`);
            return;
        }
        
        container.innerHTML = '';
        
        capturedPieces.forEach(piece => {
            const span = document.createElement('span');
            span.className = 'captured-piece';
            span.innerHTML = piece.toString();
            container.appendChild(span);
        });
    }

    updateGameInfo() {
        // Mettre à jour le tour actuel
        const currentTurnElement = document.querySelector('.current-turn');
        const colorName = this.engine.currentPlayer.color === Color.BLANC ? 'Blancs' : 'Noirs';
        currentTurnElement.innerHTML = `
            <i class="fas fa-chess"></i>
            <span>Tour des ${colorName}</span>
        `;
        
        // Mettre à jour les informations de jeu
        document.querySelector('.info-item .value[data-info="moves"]').textContent = 
            Math.ceil(this.engine.moveHistory.length / 2);
        document.querySelector('.info-item .value[data-info="state"]').textContent = 
            this.getGameStateText();
        

    }

    getGameStateText() {
        switch (this.engine.gameState) {
            case 'check': return 'Échec';
            case 'checkmate': return 'Échec et mat';
            case 'stalemate': return 'Pat';
            case 'draw': return 'Nulle';
            default: return 'En cours';
        }
    }





    checkGameEnd() {
        const gameStatus = this.engine.getGameStatus();
        
        switch (gameStatus.gameState) {
            case 'checkmate': {
                const winner = this.engine.currentPlayer.color === Color.BLANC ? 'Noirs' : 'Blancs';
                const winnerIcon = winner === 'Blancs' ? '♔' : '♚';
                this.showVictoryModal(winner, winnerIcon);
                return true;
            }
            case 'stalemate': {
                this.showGameEndModal('🤝 Pat !', 'La partie se termine par un pat. Égalité parfaite !');
                return true;
            }
            case 'draw': {
                this.showGameEndModal('🤝 Match nul !', 'La partie se termine par une nulle.');
                return true;
            }
            case 'check': {
                const playerInCheck = this.engine.currentPlayer.color === Color.BLANC ? 'Blancs' : 'Noirs';
                this.showNotification(`⚠️ Échec aux ${playerInCheck} !`, 'warning');
                return false;
            }
        }
        return false;
    }

    showGameEndModal(title, message) {
        document.querySelector('.modal-title').textContent = title;
        document.querySelector('.modal-message').textContent = message;
        document.getElementById('gameEndModal').classList.add('show');
    }

    showVictoryModal(winner, winnerIcon) {
        const modal = document.getElementById('gameEndModal');
        const modalContent = modal.querySelector('.modal-content');
        
        // Déterminer victoire/défaite selon le point de vue du joueur en mode IA
        const winnerColor = (winner === 'Blancs') ? Color.BLANC : Color.NOIR;
        const isHumanWinner = (this.gameMode === 'ai') ? (winnerColor === this.playerColor) : true;
        const titleText = isHumanWinner ? 'VICTOIRE !' : 'DÉFAITE';
        const subText = isHumanWinner 
            ? `Les ${winner} ont gagné ! Échec et mat !`
            : `Les ${winner} ont gagné... Vous avez perdu cette partie.`;
        
        // Créer un contenu spécial pour la victoire
        modalContent.innerHTML = `
            <div class="victory-header">
                <div class="crown-animation">👑</div>
                <h2 class="victory-title">${titleText}</h2>
            </div>
            <div class="winner-display">
                <div class="winner-icon">${winnerIcon}</div>
                <div class="winner-text">
                    <h3>${subText}</h3>
                    <p>${isHumanWinner ? 'Félicitations pour cette belle victoire !' : 'Ne lâchez rien, la prochaine sera la bonne !'}</p>
                </div>
            </div>
            <div class="modal-actions">
                <button class="modal-btn primary" id="modalNewGameVictory">
                    <i class="fas fa-trophy"></i> Nouvelle Partie
                </button>
                <button class="modal-btn secondary" id="modalCloseVictory">
                    <i class="fas fa-times"></i> Fermer
                </button>
            </div>
        `;
        
        // Réattacher les event listeners pour les nouveaux boutons
        modalContent.querySelector('#modalNewGameVictory').addEventListener('click', () => this.newGame());
        modalContent.querySelector('#modalCloseVictory').addEventListener('click', () => this.closeModal());
        
        modal.classList.add('show', 'victory');
        if (!isHumanWinner) {
            modal.classList.add('defeat');
        } else {
            modal.classList.remove('defeat');
        }
    }

    closeModal() {
    const modal = document.getElementById('gameEndModal');
    modal.classList.remove('show', 'victory', 'defeat');
        
        // Remettre le contenu original du modal après fermeture
        setTimeout(() => {
            const modalContent = modal.querySelector('.modal-content');
            modalContent.innerHTML = `
                <h2 class="modal-title"></h2>
                <p class="modal-message"></p>
                <div class="modal-actions">
                    <button class="modal-btn primary" id="modalNewGame">
                        <i class="fas fa-plus"></i> Nouvelle Partie
                    </button>
                    <button class="modal-btn secondary" id="modalClose">
                        <i class="fas fa-times"></i> Fermer
                    </button>
                </div>
            `;
            // Réattacher les event listeners
            modalContent.querySelector('#modalNewGame').addEventListener('click', () => this.newGame());
            modalContent.querySelector('#modalClose').addEventListener('click', () => this.closeModal());
        }, 300);
    }

    showPromotionModal() {
        // Mettre à jour les symboles selon la couleur du joueur
        const color = this.engine.promotionPending.color;
        const symbols = {
            'Q': color === Color.BLANC ? '♕' : '♛',
            'R': color === Color.BLANC ? '♖' : '♜', 
            'B': color === Color.BLANC ? '♗' : '♝',
            'N': color === Color.BLANC ? '♘' : '♞'
        };
        
        document.querySelectorAll('.promotion-btn').forEach(btn => {
            const pieceType = btn.dataset.piece;
            btn.querySelector('.promotion-piece').textContent = symbols[pieceType];
        });
        
        // S'assurer que les event listeners sont attachés
        this.attachPromotionListeners();
        
        document.getElementById('promotionModal').classList.add('show');
    }

    closePromotionModal() {
        document.getElementById('promotionModal').classList.remove('show');
    }

    handlePromotion(pieceType) {
        if (this.engine.promotePawn(pieceType)) {
            this.closePromotionModal();
            this.updateBoard();
            this.updateGameInfo();
            this.updatePlayerInfo();
            this.checkGameEnd();
            this.showNotification(`🎉 Pion promu en ${this.getPieceDisplayName(pieceType)} !`, 'success');
        }
    }

    getPieceDisplayName(pieceType) {
        const names = {
            'Q': 'Reine',
            'R': 'Tour',
            'B': 'Fou', 
            'N': 'Cavalier'
        };
        return names[pieceType] || pieceType;
    }

    newGame() {
        this.closeModal();
        this.closePromotionModal(); // Fermer aussi le modal de promotion s'il est ouvert
        
        // Créer un nouveau moteur d'échecs
        this.engine = new ChessEngine();
        
        // Réinitialiser l'affichage
        this.updateBoard();
        this.updateGameInfo();
        this.updatePlayerInfo();
        
        this.showNotification('🎉 Nouvelle partie commencée!', 'success');
    }

    resign() {
        const winner = this.engine.currentPlayer.color === Color.BLANC ? 'Noirs' : 'Blancs';
        const resigned = this.engine.currentPlayer.color === Color.BLANC ? 'Blancs' : 'Noirs';
        this.showGameEndModal('🏳️ Abandon !', `Les ${winner} remportent la partie ! Les ${resigned} ont abandonné.`);
    }

    offerDraw() {
        // Dans un vrai jeu, cela enverrait une offre à l'adversaire
        this.showNotification('🤝 Nulle proposée', 'info');
    }

    playSound(type) {
        // Simulation de sons - dans un vrai jeu, vous chargeriez des fichiers audio
        console.log(`🔊 Sound: ${type}`);
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const content = document.createElement('div');
        content.className = 'notification-content';
        
        const icon = document.createElement('i');
        switch (type) {
            case 'success':
                icon.className = 'fas fa-check-circle';
                break;
            case 'error':
                icon.className = 'fas fa-exclamation-triangle';
                break;
            case 'warning':
                icon.className = 'fas fa-exclamation-circle';
                break;
            default:
                icon.className = 'fas fa-info-circle';
        }
        
        const text = document.createElement('span');
        text.textContent = message;
        
        const closeBtn = document.createElement('button');
        closeBtn.className = 'notification-close';
        closeBtn.innerHTML = '&times;';
        closeBtn.addEventListener('click', () => notification.remove());
        
        content.appendChild(icon);
        content.appendChild(text);
        notification.appendChild(content);
        notification.appendChild(closeBtn);
        
        document.body.appendChild(notification);
        
        // Animer l'entrée
        setTimeout(() => notification.classList.add('show'), 10);
        
        // Supprimer automatiquement après 5 secondes
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }

    // Méthode pour faire jouer l'IA
    makeAIMove() {
        console.log('makeAIMove appelée');
        if (this.isAIThinking) return;

        this.isAIThinking = true;
        this.showAIThinking();

        // Faire réfléchir l'IA avec un petit délai pour l'effet visuel
        setTimeout(async () => {
            try {
                const bestMove = await this.ai.getBestMove(this.engine);
                console.log('Mouvement IA résolu:', bestMove);

                if (!bestMove) {
                    console.log('Aucun mouvement IA disponible');
                    return;
                }

                const { fromX, fromY, toX, toY } = bestMove;
                if ([fromX, fromY, toX, toY].some(v => typeof v !== 'number' || v < 0 || v > 7)) {
                    console.warn('Mouvement IA invalide:', bestMove);
                    return;
                }

                // Utiliser directement l'API du moteur pour jouer le coup
                const moveResult = this.engine.makeMove(fromX, fromY, toX, toY);

                if (moveResult === 'promotion') {
                    // L'IA choisit automatiquement une Reine pour la promotion
                    this.engine.promotePawn(PieceType.REINE);
                } else if (moveResult !== true) {
                    console.warn('Le moteur a rejeté le coup IA:', bestMove, 'résultat:', moveResult);
                    return;
                }

                this.playSound('move');
                this.updateBoard();
                this.updateGameInfo();
                this.updatePlayerInfo();
                this.checkGameEnd();
            } catch (e) {
                console.error('Erreur pendant makeAIMove:', e);
            } finally {
                this.isAIThinking = false;
                this.hideAIThinking();
            }
        }, 300); // Délai pour simuler la réflexion
    }

    // Afficher l'indicateur de réflexion de l'IA
    showAIThinking() {
        let thinkingIndicator = document.getElementById('ai-thinking');
        if (!thinkingIndicator) {
            thinkingIndicator = document.createElement('div');
            thinkingIndicator.id = 'ai-thinking';
            thinkingIndicator.className = 'ai-thinking';
            thinkingIndicator.innerHTML = '🤖 IA réfléchit...';
            // Placer l'indicateur au-dessus de la zone de l'échiquier
            const targetContainer = document.querySelector('.board-main') ||
                                    document.querySelector('.board-container') ||
                                    document.body;
            targetContainer.appendChild(thinkingIndicator);
        }
        thinkingIndicator.style.display = 'block';
    }

    // Masquer l'indicateur de réflexion de l'IA
    hideAIThinking() {
        const thinkingIndicator = document.getElementById('ai-thinking');
        if (thinkingIndicator) {
            thinkingIndicator.style.display = 'none';
        }
    }
}

// Initialisation du jeu
document.addEventListener('DOMContentLoaded', () => {
    const _game = new ChessUI();
    
    // Ajouter des styles CSS supplémentaires
    const style = document.createElement('style');
    style.textContent = `
        .notification {
            animation: slideIn 0.3s ease;
        }
        
        @keyframes slideIn {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
        }
    `;
    document.head.appendChild(style);
});