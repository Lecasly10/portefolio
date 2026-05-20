// Enums et constantes
const PieceType = {
    PION: 'P',
    TOUR: 'R',
    CAVALIER: 'N',
    FOU: 'B',
    REINE: 'Q',
    ROI: 'K'
};

const Color = {
    BLANC: 'white',
    NOIR: 'black'
};

// Classe Case
class Case {
    constructor(x, y, piece = null) {
        this.x = x;
        this.y = y;
        this.piece = piece;
    }

    isEmpty() {
        return this.piece === null;
    }

    hasPiece(type, color) {
        return this.piece && this.piece.type === type && this.piece.color === color;
    }

    toString() {
        return `${String.fromCharCode(97 + this.x)}${8 - this.y}`;
    }
}

// Classe Piece
class Piece {
    constructor(type, color) {
        this.type = type;
        this.color = color;
        this.hasMoved = false;
    }

    toString() {
        const symbols = {
            [PieceType.PION]: { [Color.BLANC]: '♙', [Color.NOIR]: '♟' },
            [PieceType.TOUR]: { [Color.BLANC]: '♖', [Color.NOIR]: '♜' },
            [PieceType.CAVALIER]: { [Color.BLANC]: '♘', [Color.NOIR]: '♞' },
            [PieceType.FOU]: { [Color.BLANC]: '♗', [Color.NOIR]: '♝' },
            [PieceType.REINE]: { [Color.BLANC]: '♕', [Color.NOIR]: '♛' },
            [PieceType.ROI]: { [Color.BLANC]: '♔', [Color.NOIR]: '♚' }
        };
        return symbols[this.type][this.color];
    }

    getUnicodeSymbol() {
        return this.toString();
    }
}

// Classe Player
class Player {
    constructor(color) {
        this.color = color;
        this.pieces = [];
        this.capturedPieces = [];
        this.canCastleKingSide = true;
        this.canCastleQueenSide = true;
        this.lastMove = null;
        this.isInCheck = false;
    }

    addPiece(piece) {
        this.pieces.push(piece);
    }

    removePiece(piece) {
        const index = this.pieces.indexOf(piece);
        if (index > -1) {
            this.pieces.splice(index, 1);
        }
    }

    capturePiece(piece) {
        this.capturedPieces.push(piece);
    }

    getKing() {
        return this.pieces.find(p => p.type === PieceType.ROI);
    }

    findKingPosition(plateau) {
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                if (plateau[y][x].piece && 
                    plateau[y][x].piece.type === PieceType.ROI && 
                    plateau[y][x].piece.color === this.color) {
                    return { x, y };
                }
            }
        }
        return null;
    }
}

// Classe principale ChessEngine
class ChessEngine {
    constructor() {
        this.plateau = this.initializePlateau();
        this.players = {
            [Color.BLANC]: new Player(Color.BLANC),
            [Color.NOIR]: new Player(Color.NOIR)
        };
        this.currentPlayer = this.players[Color.BLANC];
        this.moveHistory = [];
        this.gameState = 'playing'; // playing, check, checkmate, stalemate, draw
        this.selectedSquare = null;
        this.possibleMoves = [];
        this.lastMove = null;
        this.promotionPending = null;
        // Historique des positions pour la répétition (clé position -> compteur)
        this.positionHistory = new Map();
        // Drapeaux pour éviter les effets de bord lors de la recherche IA
        this.suppressPositionHistory = false;
        this.suppressMoveHistory = false;
        
        this.initializePieces();

        // Enregistrer la position initiale
        this.recordPosition();
    }

    initializePlateau() {
        const plateau = [];
        for (let y = 0; y < 8; y++) {
            plateau[y] = [];
            for (let x = 0; x < 8; x++) {
                plateau[y][x] = new Case(x, y);
            }
        }
        return plateau;
    }

    initializePieces() {
        // Pions blancs
        for (let x = 0; x < 8; x++) {
            const pawn = new Piece(PieceType.PION, Color.BLANC);
            this.plateau[6][x].piece = pawn;
            this.players[Color.BLANC].addPiece(pawn);
        }

        // Pions noirs
        for (let x = 0; x < 8; x++) {
            const pawn = new Piece(PieceType.PION, Color.NOIR);
            this.plateau[1][x].piece = pawn;
            this.players[Color.NOIR].addPiece(pawn);
        }

        // Pièces blanches
        const whitePieces = [
            PieceType.TOUR, PieceType.CAVALIER, PieceType.FOU, PieceType.REINE,
            PieceType.ROI, PieceType.FOU, PieceType.CAVALIER, PieceType.TOUR
        ];
        for (let x = 0; x < 8; x++) {
            const piece = new Piece(whitePieces[x], Color.BLANC);
            this.plateau[7][x].piece = piece;
            this.players[Color.BLANC].addPiece(piece);
        }

        // Pièces noires
        const blackPieces = [
            PieceType.TOUR, PieceType.CAVALIER, PieceType.FOU, PieceType.REINE,
            PieceType.ROI, PieceType.FOU, PieceType.CAVALIER, PieceType.TOUR
        ];
        for (let x = 0; x < 8; x++) {
            const piece = new Piece(blackPieces[x], Color.NOIR);
            this.plateau[0][x].piece = piece;
            this.players[Color.NOIR].addPiece(piece);
        }
    }

    isValidPosition(x, y) {
        return x >= 0 && x < 8 && y >= 0 && y < 8;
    }

    getOppositeColor(color) {
        return color === Color.BLANC ? Color.NOIR : Color.BLANC;
    }

    // Mouvements possibles pour chaque type de pièce
    getPossibleMoves(x, y) {
        const piece = this.plateau[y][x].piece;
        if (!piece) return [];

        let moves = [];
        
        switch (piece.type) {
            case PieceType.PION:
                moves = this.getPawnMoves(x, y, piece.color);
                break;
            case PieceType.TOUR:
                moves = this.getRookMoves(x, y, piece.color);
                break;
            case PieceType.CAVALIER:
                moves = this.getKnightMoves(x, y, piece.color);
                break;
            case PieceType.FOU:
                moves = this.getBishopMoves(x, y, piece.color);
                break;
            case PieceType.REINE:
                moves = this.getQueenMoves(x, y, piece.color);
                break;
            case PieceType.ROI:
                moves = this.getKingMoves(x, y, piece.color);
                break;
        }

        // Filtrer les mouvements légaux (qui ne mettent pas le roi en échec)
        return moves.filter(move => this.isLegalMove(x, y, move.x, move.y));
    }

    getPawnMoves(x, y, color) {
        const moves = [];
        const direction = color === Color.BLANC ? -1 : 1;
        const startRow = color === Color.BLANC ? 6 : 1;

        // Mouvement simple
        if (this.isValidPosition(x, y + direction) && this.plateau[y + direction][x].isEmpty()) {
            moves.push({ x, y: y + direction });

            // Mouvement double depuis la position de départ
            if (y === startRow && this.plateau[y + 2 * direction][x].isEmpty()) {
                moves.push({ x, y: y + 2 * direction });
            }
        }

        // Captures diagonales
        for (const dx of [-1, 1]) {
            if (this.isValidPosition(x + dx, y + direction)) {
                const targetSquare = this.plateau[y + direction][x + dx];
                if (!targetSquare.isEmpty() && targetSquare.piece.color !== color) {
                    moves.push({ x: x + dx, y: y + direction });
                }
            }
        }

        // En passant
        if (this.lastMove && 
            this.lastMove.piece.type === PieceType.PION &&
            Math.abs(this.lastMove.toY - this.lastMove.fromY) === 2 &&
            this.lastMove.toY === y &&
            Math.abs(this.lastMove.toX - x) === 1) {
            moves.push({ x: this.lastMove.toX, y: y + direction });
        }

        return moves;
    }

    getRookMoves(x, y, color) {
        const moves = [];
        const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];

        for (const [dx, dy] of directions) {
            for (let i = 1; i < 8; i++) {
                const newX = x + dx * i;
                const newY = y + dy * i;

                if (!this.isValidPosition(newX, newY)) break;

                const targetSquare = this.plateau[newY][newX];
                if (targetSquare.isEmpty()) {
                    moves.push({ x: newX, y: newY });
                } else {
                    if (targetSquare.piece.color !== color) {
                        moves.push({ x: newX, y: newY });
                    }
                    break;
                }
            }
        }

        return moves;
    }

    getKnightMoves(x, y, color) {
        const moves = [];
        const knightMoves = [
            [-2, -1], [-2, 1], [-1, -2], [-1, 2],
            [1, -2], [1, 2], [2, -1], [2, 1]
        ];

        for (const [dx, dy] of knightMoves) {
            const newX = x + dx;
            const newY = y + dy;

            if (this.isValidPosition(newX, newY)) {
                const targetSquare = this.plateau[newY][newX];
                if (targetSquare.isEmpty() || targetSquare.piece.color !== color) {
                    moves.push({ x: newX, y: newY });
                }
            }
        }

        return moves;
    }

    getBishopMoves(x, y, color) {
        const moves = [];
        const directions = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

        for (const [dx, dy] of directions) {
            for (let i = 1; i < 8; i++) {
                const newX = x + dx * i;
                const newY = y + dy * i;

                if (!this.isValidPosition(newX, newY)) break;

                const targetSquare = this.plateau[newY][newX];
                if (targetSquare.isEmpty()) {
                    moves.push({ x: newX, y: newY });
                } else {
                    if (targetSquare.piece.color !== color) {
                        moves.push({ x: newX, y: newY });
                    }
                    break;
                }
            }
        }

        return moves;
    }

    getQueenMoves(x, y, color) {
        return [...this.getRookMoves(x, y, color), ...this.getBishopMoves(x, y, color)];
    }

    getKingMoves(x, y, color) {
        const moves = [];
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];

        for (const [dx, dy] of directions) {
            const newX = x + dx;
            const newY = y + dy;

            if (this.isValidPosition(newX, newY)) {
                const targetSquare = this.plateau[newY][newX];
                if (targetSquare.isEmpty() || targetSquare.piece.color !== color) {
                    moves.push({ x: newX, y: newY });
                }
            }
        }

        // Roque
        const player = this.players[color];
        if (!player.isInCheck) {
            // Roque côté roi
            if (player.canCastleKingSide && 
                this.plateau[y][x + 1].isEmpty() && 
                this.plateau[y][x + 2].isEmpty() &&
                !this.isSquareThreatened(x + 1, y, color) &&
                !this.isSquareThreatened(x + 2, y, color)) {
                moves.push({ x: x + 2, y });
            }

            // Roque côté reine
            if (player.canCastleQueenSide &&
                this.plateau[y][x - 1].isEmpty() &&
                this.plateau[y][x - 2].isEmpty() &&
                this.plateau[y][x - 3].isEmpty() &&
                !this.isSquareThreatened(x - 1, y, color) &&
                !this.isSquareThreatened(x - 2, y, color)) {
                moves.push({ x: x - 2, y });
            }
        }

        return moves;
    }

    // Vérification des menaces
    isSquareThreatened(x, y, byColor) {
        const oppositeColor = this.getOppositeColor(byColor);
        
        for (let py = 0; py < 8; py++) {
            for (let px = 0; px < 8; px++) {
                const piece = this.plateau[py][px].piece;
                if (piece && piece.color === oppositeColor) {
                    const moves = this.getRawMoves(px, py);
                    if (moves.some(move => move.x === x && move.y === y)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    getRawMoves(x, y) {
        const piece = this.plateau[y][x].piece;
        if (!piece) return [];

        switch (piece.type) {
            case PieceType.PION:
                return this.getRawPawnMoves(x, y, piece.color);
            case PieceType.TOUR:
                return this.getRookMoves(x, y, piece.color);
            case PieceType.CAVALIER:
                return this.getKnightMoves(x, y, piece.color);
            case PieceType.FOU:
                return this.getBishopMoves(x, y, piece.color);
            case PieceType.REINE:
                return this.getQueenMoves(x, y, piece.color);
            case PieceType.ROI:
                return this.getRawKingMoves(x, y, piece.color);
            default:
                return [];
        }
    }

    getRawPawnMoves(x, y, color) {
        const moves = [];
        const direction = color === Color.BLANC ? -1 : 1;

        // Captures diagonales seulement
        for (const dx of [-1, 1]) {
            if (this.isValidPosition(x + dx, y + direction)) {
                moves.push({ x: x + dx, y: y + direction });
            }
        }

        return moves;
    }

    getRawKingMoves(x, y, _color) {
        const moves = [];
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1],           [0, 1],
            [1, -1],  [1, 0],  [1, 1]
        ];

        for (const [dx, dy] of directions) {
            const newX = x + dx;
            const newY = y + dy;

            if (this.isValidPosition(newX, newY)) {
                moves.push({ x: newX, y: newY });
            }
        }

        return moves;
    }

    isInCheck(color) {
        const king = this.players[color].findKingPosition(this.plateau);
        if (!king) return false;
        return this.isSquareThreatened(king.x, king.y, color);
    }

    isLegalMove(fromX, fromY, toX, toY) {
        // Sauvegarder l'état actuel
        const originalPiece = this.plateau[fromY][fromX].piece;
        const capturedPiece = this.plateau[toY][toX].piece;
        const originalHasMoved = originalPiece ? originalPiece.hasMoved : false;

        // Effectuer le mouvement temporairement
        this.plateau[toY][toX].piece = originalPiece;
        this.plateau[fromY][fromX].piece = null;
        if (originalPiece) originalPiece.hasMoved = true;

        // Vérifier si le roi est en échec après le mouvement
        const isLegal = !this.isInCheck(originalPiece.color);

        // Restaurer l'état
        this.plateau[fromY][fromX].piece = originalPiece;
        this.plateau[toY][toX].piece = capturedPiece;
        if (originalPiece) originalPiece.hasMoved = originalHasMoved;

        return isLegal;
    }

    makeMove(fromX, fromY, toX, toY) {
        const piece = this.plateau[fromY][fromX].piece;
        if (!piece || piece.color !== this.currentPlayer.color) {
            return false;
        }

        const possibleMoves = this.getPossibleMoves(fromX, fromY);
        const isValidMove = possibleMoves.some(move => move.x === toX && move.y === toY);

        if (!isValidMove) {
            return false;
        }

        const capturedPiece = this.plateau[toY][toX].piece;
        
        // Gestion des mouvements spéciaux
        let specialMove = null;

        // Roque
        if (piece.type === PieceType.ROI && Math.abs(toX - fromX) === 2) {
            specialMove = 'castle';
            const isKingSide = toX > fromX;
            const rookFromX = isKingSide ? 7 : 0;
            const rookToX = isKingSide ? toX - 1 : toX + 1;
            
            // Déplacer la tour
            this.plateau[toY][rookToX].piece = this.plateau[fromY][rookFromX].piece;
            this.plateau[fromY][rookFromX].piece = null;
            this.plateau[toY][rookToX].piece.hasMoved = true;

            // Mettre à jour les droits de roque
            this.currentPlayer.canCastleKingSide = false;
            this.currentPlayer.canCastleQueenSide = false;
        }

        // En passant
        if (piece.type === PieceType.PION && Math.abs(toX - fromX) === 1 && !capturedPiece) {
            specialMove = 'enPassant';
            const capturedPawnY = fromY;
            this.currentPlayer.capturePiece(this.plateau[capturedPawnY][toX].piece);
            this.plateau[capturedPawnY][toX].piece = null;
        }

        // Effectuer le mouvement
        this.plateau[toY][toX].piece = piece;
        this.plateau[fromY][fromX].piece = null;
        piece.hasMoved = true;

        // Capturer la pièce si nécessaire
        if (capturedPiece) {
            this.currentPlayer.capturePiece(capturedPiece);
            this.getOpponentPlayer().removePiece(capturedPiece);
        }

        // Promotion des pions
        if (piece.type === PieceType.PION && 
            ((piece.color === Color.BLANC && toY === 0) || 
             (piece.color === Color.NOIR && toY === 7))) {
            specialMove = 'promotion';
            this.promotionPending = { x: toX, y: toY, color: piece.color };
            return 'promotion'; // Retour spécial pour indiquer qu'une promotion est nécessaire
        }

        // Mettre à jour les droits de roque
        if (piece.type === PieceType.ROI) {
            this.currentPlayer.canCastleKingSide = false;
            this.currentPlayer.canCastleQueenSide = false;
        } else if (piece.type === PieceType.TOUR) {
            if (fromX === 0) {
                this.currentPlayer.canCastleQueenSide = false;
            } else if (fromX === 7) {
                this.currentPlayer.canCastleKingSide = false;
            }
        }

        // Enregistrer le mouvement
        this.lastMove = {
            fromX, fromY, toX, toY,
            piece: piece,
            capturedPiece,
            specialMove
        };

        if (!this.suppressMoveHistory) {
            this.moveHistory.push(this.lastMove);
        }

        // Vérifier l'état du jeu
        this.updateGameState();

        // Changer de joueur
        this.switchPlayer();

        // Enregistrer et vérifier la répétition si autorisé
        if (!this.suppressPositionHistory) {
            const count = this.recordPosition();
            // Nulle automatique à la 5ème répétition
            if (count >= 5) {
                this.gameState = 'draw';
            }
        }

        return true;
    }

    getOpponentPlayer() {
        return this.currentPlayer.color === Color.BLANC ? 
               this.players[Color.NOIR] : this.players[Color.BLANC];
    }

    switchPlayer() {
        this.currentPlayer = this.getOpponentPlayer();
        this.currentPlayer.isInCheck = this.isInCheck(this.currentPlayer.color);
    }

    // Génère une clé unique pour la position courante (pièces + trait + droits de roque)
    computePositionKey() {
        let boardKey = '';
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                const piece = this.plateau[y][x].piece;
                if (!piece) {
                    boardKey += '.';
                } else {
                    const c = piece.color === Color.BLANC ? 'w' : 'b';
                    boardKey += piece.type + c;
                }
            }
        }
        const turnKey = this.currentPlayer.color === Color.BLANC ? 'w' : 'b';
        const rights = this.getCastlingRightsString();
        return `${boardKey}|${turnKey}|${rights}`;
    }

    getCastlingRightsString() {
        const w = this.players[Color.BLANC];
        const b = this.players[Color.NOIR];
        let s = '';
        if (w.canCastleKingSide) s += 'K';
        if (w.canCastleQueenSide) s += 'Q';
        if (b.canCastleKingSide) s += 'k';
        if (b.canCastleQueenSide) s += 'q';
        return s || '-';
    }

    recordPosition() {
        const key = this.computePositionKey();
        const prev = this.positionHistory.get(key) || 0;
        const next = prev + 1;
        this.positionHistory.set(key, next);
        return next;
    }

    updateGameState() {
        const opponent = this.getOpponentPlayer();
        const isInCheck = this.isInCheck(opponent.color);
        
        if (isInCheck) {
            if (this.isCheckmate(opponent.color)) {
                this.gameState = 'checkmate';
            } else {
                this.gameState = 'check';
            }
        } else {
            if (this.isStalemate(opponent.color)) {
                this.gameState = 'stalemate';
            } else {
                this.gameState = 'playing';
            }
        }
    }

    isCheckmate(color) {
        if (!this.isInCheck(color)) return false;
        return this.getAllLegalMoves(color).length === 0;
    }

    isStalemate(color) {
        if (this.isInCheck(color)) return false;
        return this.getAllLegalMoves(color).length === 0;
    }

    getAllLegalMoves(color) {
        const moves = [];
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                const piece = this.plateau[y][x].piece;
                if (piece && piece.color === color) {
                    const pieceMoves = this.getPossibleMoves(x, y);
                    moves.push(...pieceMoves.map(move => ({ fromX: x, fromY: y, ...move })));
                }
            }
        }
        return moves;
    }

    // Méthodes utilitaires pour l'interface
    selectSquare(x, y) {
        if (this.selectedSquare && this.selectedSquare.x === x && this.selectedSquare.y === y) {
            // Désélectionner si on clique sur la même case
            this.selectedSquare = null;
            this.possibleMoves = [];
            return 'deselected';
        }

        const piece = this.plateau[y][x].piece;
        
        if (this.selectedSquare) {
            // Tentative de mouvement
            const moveResult = this.makeMove(this.selectedSquare.x, this.selectedSquare.y, x, y);
            if (moveResult === 'promotion') {
                this.selectedSquare = null;
                this.possibleMoves = [];
                return 'promotion';
            } else if (moveResult === true) {
                this.selectedSquare = null;
                this.possibleMoves = [];
                return 'moved';
            } else {
                // Si le mouvement échoue, essayer de sélectionner une nouvelle pièce
                if (piece && piece.color === this.currentPlayer.color) {
                    this.selectedSquare = { x, y };
                    this.possibleMoves = this.getPossibleMoves(x, y);
                    return 'selected';
                } else {
                    // Désélectionner si on clique sur une case vide ou une pièce adverse après un mouvement invalide
                    this.selectedSquare = null;
                    this.possibleMoves = [];
                    return 'deselected';
                }
            }
        } else {
            // Première sélection
            if (piece && piece.color === this.currentPlayer.color) {
                this.selectedSquare = { x, y };
                this.possibleMoves = this.getPossibleMoves(x, y);
                return 'selected';
            } else {
                // Ne rien faire si on clique sur une case vide ou une pièce adverse sans sélection
                return 'empty';
            }
        }
    }

    getGameStatus() {
        return {
            currentPlayer: this.currentPlayer.color,
            gameState: this.gameState,
            isInCheck: this.currentPlayer.isInCheck,
            selectedSquare: this.selectedSquare,
            possibleMoves: this.possibleMoves,
            lastMove: this.lastMove,
            moveCount: this.moveHistory.length
        };
    }

    exportPGN() {
        // Implémentation basique du PGN
        let pgn = '';
        for (let i = 0; i < this.moveHistory.length; i += 2) {
            const moveNumber = Math.floor(i / 2) + 1;
            const whiteMove = this.moveHistory[i];
            const blackMove = this.moveHistory[i + 1];
            
            pgn += `${moveNumber}. ${this.moveToAlgebraic(whiteMove)}`;
            if (blackMove) {
                pgn += ` ${this.moveToAlgebraic(blackMove)}`;
            }
            pgn += ' ';
        }
        
        return pgn.trim();
    }

    moveToAlgebraic(move) {
        // Conversion simplifiée en notation algébrique
        const fromSquare = String.fromCharCode(97 + move.fromX) + (8 - move.fromY);
        const toSquare = String.fromCharCode(97 + move.toX) + (8 - move.toY);
        
        let notation = '';
        if (move.piece.type !== PieceType.PION) {
            notation += move.piece.type;
        }
        
        if (move.capturedPiece) {
            if (move.piece.type === PieceType.PION) {
                notation += fromSquare[0];
            }
            notation += 'x';
        }
        
        notation += toSquare;
        
        if (move.specialMove === 'castle') {
            notation = move.toX > move.fromX ? 'O-O' : 'O-O-O';
        }
        
        return notation;
    }

    // Promotion des pions
    promotePawn(pieceType) {
        if (!this.promotionPending) return false;
        
        const { x, y, color } = this.promotionPending;
        const oldPawn = this.plateau[y][x].piece;
        
        // Créer la nouvelle pièce
        const newPiece = new Piece(pieceType, color);
        newPiece.hasMoved = true;
        
        // Remplacer le pion par la nouvelle pièce
        this.plateau[y][x].piece = newPiece;
        
        // Mettre à jour les listes de pièces
        this.currentPlayer.removePiece(oldPawn);
        this.currentPlayer.addPiece(newPiece);
        
        // Finaliser le mouvement après promotion
        this.lastMove.promotedTo = pieceType;
        
        // Vérifier l'état du jeu
        this.updateGameState();
        
        // Changer de joueur
        this.switchPlayer();
        
        // Nettoyer l'état de promotion
        this.promotionPending = null;
        
        return true;
    }

    isPromotionPending() {
        return this.promotionPending !== null;
    }
}

// Export pour utilisation dans le navigateur
if (typeof globalThis !== 'undefined') {
    globalThis.ChessEngine = ChessEngine;
    globalThis.PieceType = PieceType;
    globalThis.Color = Color;
}