// Intelligence Artificielle pour les échecs
// Utilise l'algorithme Minimax avec élagage Alpha-Beta

class ChessAI {
    constructor(difficulty = 3) {
        this.difficulty = difficulty; // Profondeur de recherche (1-5)
        this.isThinking = false;
        this.pieceValues = {
            [PieceType.PION]: 100,
            [PieceType.CAVALIER]: 320,
            [PieceType.FOU]: 330,
            [PieceType.TOUR]: 500,
            [PieceType.REINE]: 900,
            [PieceType.ROI]: 20000
        };
        
        // Tables de position pour évaluer l'emplacement des pièces
        this.positionTables = this.initPositionTables();
    }

    initPositionTables() {
        // Tables simplifiées pour l'évaluation positionnelle
        const pawnTable = [
            0,  0,  0,  0,  0,  0,  0,  0,
            78, 83, 86, 73, 102, 82, 85, 90,
            7, 29, 21, 44, 40, 31, 44, 7,
            -17, 16, -2, 15, 14, 0, 15, -13,
            -26, 3, 10, 9, 6, 1, 0, -23,
            -22, 9, 5, -11, -10, -2, 3, -19,
            -31, 8, -7, -37, -36, -14, 3, -31,
            0,  0,  0,  0,  0,  0,  0,  0
        ];

        const knightTable = [
            -66, -53, -75, -75, -10, -55, -58, -70,
            -3, -6, 100, -36, 4, 62, -4, -14,
            10, 67, 1, 74, 73, 27, 62, -2,
            24, 24, 45, 37, 33, 41, 25, 17,
            -1, 5, 31, 21, 22, 35, 2, 0,
            -18, 10, 13, 22, 18, 15, 11, -14,
            -23, -15, 2, 0, 2, 0, -23, -20,
            -74, -23, -26, -24, -19, -35, -22, -69
        ];

        const bishopTable = [
            -59, -78, -82, -76, -23,-107, -37, -50,
            -11,  20,  35, -42, -39,  31,   2, -22,
            -9,  39, -32,  41,  52, -10,  28, -14,
            25,  17,  20,  34,  26,  25,  15,  10,
            13,  10,  17,  23,  17,  16,  0,   7,
            14,  25,  24,  15,   8,  25,  20,  15,
            19,  20,  11,   6,   7,   6,  20,  16,
            -7,   2, -15, -12, -14, -15, -10, -10
        ];

        return {
            [PieceType.PION]: pawnTable,
            [PieceType.CAVALIER]: knightTable,
            [PieceType.FOU]: bishopTable,
            [PieceType.TOUR]: Array(64).fill(0), // Tables neutres pour tour
            [PieceType.REINE]: Array(64).fill(0), // et reine
            [PieceType.ROI]: Array(64).fill(0)
        };
    }

    // Méthode principale pour obtenir le meilleur mouvement
    async getBestMove(engine) {
        if (this.isThinking) return null;
        
        this.isThinking = true;
        console.log('🤖 IA réfléchit...');
        
        // Simuler un délai de réflexion
        await this.delay(500);
        
        try {
            const bestMove = this.minimax(engine, this.difficulty, -Infinity, Infinity, true);
            console.log('🎯 IA a choisi:', bestMove);
            return bestMove.move;
        } catch (error) {
            console.error('Erreur IA:', error);
            // Fallback : mouvement aléatoire
            return this.getRandomMove(engine);
        } finally {
            this.isThinking = false;
        }
    }

    // Algorithme Minimax avec élagage Alpha-Beta
    minimax(engine, depth, alpha, beta, maximizingPlayer) {
        // Arrêt uniquement sur positions terminales vraies ou profondeur nulle
        if (depth === 0 || engine.gameState === 'checkmate' || engine.gameState === 'stalemate' || engine.gameState === 'draw') {
            return {
                score: this.evaluatePosition(engine),
                move: null
            };
        }

        // Toujours générer les coups pour le joueur au trait (engine.currentPlayer)
        const allMoves = this.getAllPossibleMoves(engine, engine.currentPlayer.color);

        if (allMoves.length === 0) {
            // Aucun coup légal: pat ou mat selon l'état du roi au trait
            const noMovesScore = engine.isInCheck(engine.currentPlayer.color) ? -Infinity : 0;
            return { score: noMovesScore, move: null };
        }

        // Trier les mouvements par priorité pour améliorer l'élagage
        allMoves.sort((a, b) => this.getMoveScore(b, engine) - this.getMoveScore(a, engine));

        let bestMove = null;

        if (maximizingPlayer) {
            let maxEval = -Infinity;
            
            for (const move of allMoves) {
                const savedState = this.saveGameState(engine);
                
                if (this.makeTemporaryMove(engine, move)) {
                    const evaluation = this.minimax(engine, depth - 1, alpha, beta, false);
                    
                    if (evaluation.score > maxEval) {
                        maxEval = evaluation.score;
                        bestMove = move;
                    }
                    
                    alpha = Math.max(alpha, evaluation.score);
                }
                
                this.restoreGameState(engine, savedState);
                
                if (beta <= alpha) {
                    break; // Élagage Alpha-Beta
                }
            }
            
            return { score: maxEval, move: bestMove };
        } else {
            let minEval = Infinity;
            
            for (const move of allMoves) {
                const savedState = this.saveGameState(engine);
                
                if (this.makeTemporaryMove(engine, move)) {
                    const evaluation = this.minimax(engine, depth - 1, alpha, beta, true);
                    
                    if (evaluation.score < minEval) {
                        minEval = evaluation.score;
                        bestMove = move;
                    }
                    
                    beta = Math.min(beta, evaluation.score);
                }
                
                this.restoreGameState(engine, savedState);
                
                if (beta <= alpha) {
                    break; // Élagage Alpha-Beta
                }
            }
            
            return { score: minEval, move: bestMove };
        }
    }

    // Évalue la position actuelle du plateau
    evaluatePosition(engine) {
        if (engine.gameState === 'checkmate') {
            // Côté au trait est échec et mat: très mauvais pour lui
            return engine.currentPlayer.color === Color.NOIR ? -10000 : 10000;
        }
        
        if (engine.gameState === 'stalemate' || engine.gameState === 'draw') {
            return 0;
        }

        let score = 0;

        // Évaluation des pièces et positions
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                const piece = engine.plateau[y][x].piece;
                if (piece) {
                    const pieceScore = this.pieceValues[piece.type];
                    
                    // Bonus de position
                    const positionIndex = y * 8 + x;
                    const positionBonus = this.positionTables[piece.type][positionIndex] || 0;
                    
                    if (piece.color === Color.NOIR) {
                        score += pieceScore + positionBonus;
                    } else {
                        score -= pieceScore + positionBonus;
                    }
                }
            }
        }

        // Bonus pour la mobilité (nombre de mouvements possibles)
        const blackMoves = this.getAllPossibleMoves(engine, Color.NOIR).length;
        const whiteMoves = this.getAllPossibleMoves(engine, Color.BLANC).length;
        score += (blackMoves - whiteMoves) * 10;

        // Pénalité pour le roi en échec
        if (engine.isInCheck(Color.NOIR)) score -= 50;
        if (engine.isInCheck(Color.BLANC)) score += 50;

        return score;
    }

    // Obtient tous les mouvements possibles pour une couleur
    getAllPossibleMoves(engine, color) {
        const moves = [];
        
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                const piece = engine.plateau[y][x].piece;
                if (piece && piece.color === color) {
                    const pieceMoves = engine.getPossibleMoves(x, y);
                    for (const move of pieceMoves) {
                        moves.push({
                            fromX: x,
                            fromY: y,
                            toX: move.x,
                            toY: move.y,
                            piece: piece,
                            capturedPiece: engine.plateau[move.y][move.x].piece
                        });
                    }
                }
            }
        }
        
        return moves;
    }

    // Donne un score à un mouvement pour le tri
    getMoveScore(move, _engine) {
        let score = 0;
        
        // Privilégier les captures
        if (move.capturedPiece) {
            score += this.pieceValues[move.capturedPiece.type];
        }
        
        // Privilégier les mouvements vers le centre
        const centerDistance = Math.abs(3.5 - move.toX) + Math.abs(3.5 - move.toY);
        score += (7 - centerDistance) * 10;
        
        return score;
    }

    // Sauvegarde l'état du jeu
    saveGameState(engine) {
        return {
            plateau: engine.plateau.map(row => row.map(case_ => ({
                x: case_.x,
                y: case_.y,
                piece: case_.piece ? {
                    type: case_.piece.type,
                    color: case_.piece.color,
                    hasMoved: case_.piece.hasMoved
                } : null
            })) ),
            currentPlayer: engine.currentPlayer.color,
            gameState: engine.gameState,
            lastMove: engine.lastMove ? {
                fromX: engine.lastMove.fromX,
                fromY: engine.lastMove.fromY,
                toX: engine.lastMove.toX,
                toY: engine.lastMove.toY,
                piece: engine.lastMove.piece ? { type: engine.lastMove.piece.type, color: engine.lastMove.piece.color } : null,
                capturedPiece: engine.lastMove.capturedPiece ? { type: engine.lastMove.capturedPiece.type, color: engine.lastMove.capturedPiece.color } : null,
                specialMove: engine.lastMove.specialMove,
                promotedTo: engine.lastMove.promotedTo
            } : null,
            players: {
                [Color.BLANC]: {
                    canCastleKingSide: engine.players[Color.BLANC].canCastleKingSide,
                    canCastleQueenSide: engine.players[Color.BLANC].canCastleQueenSide,
                    isInCheck: engine.players[Color.BLANC].isInCheck,
                    capturedPieces: engine.players[Color.BLANC].capturedPieces.map(p => ({ type: p.type, color: p.color }))
                },
                [Color.NOIR]: {
                    canCastleKingSide: engine.players[Color.NOIR].canCastleKingSide,
                    canCastleQueenSide: engine.players[Color.NOIR].canCastleQueenSide,
                    isInCheck: engine.players[Color.NOIR].isInCheck,
                    capturedPieces: engine.players[Color.NOIR].capturedPieces.map(p => ({ type: p.type, color: p.color }))
                }
            },
            moveHistory: engine.moveHistory.map(m => ({
                fromX: m.fromX, fromY: m.fromY, toX: m.toX, toY: m.toY,
                piece: m.piece ? { type: m.piece.type, color: m.piece.color } : null,
                capturedPiece: m.capturedPiece ? { type: m.capturedPiece.type, color: m.capturedPiece.color } : null,
                specialMove: m.specialMove, promotedTo: m.promotedTo
            })),
            promotionPending: engine.promotionPending ? { ...engine.promotionPending } : null
        };
    }

    // Restaure l'état du jeu
    restoreGameState(engine, savedState) {
        // Restaurer le plateau
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                const savedCase = savedState.plateau[y][x];
                engine.plateau[y][x].piece = savedCase.piece ? 
                    new Piece(savedCase.piece.type, savedCase.piece.color) : null;
                
                if (engine.plateau[y][x].piece && savedCase.piece) {
                    engine.plateau[y][x].piece.hasMoved = savedCase.piece.hasMoved;
                }
            }
        }
        
        // Recalculer les listes de pièces depuis le plateau
        engine.players[Color.BLANC].pieces = [];
        engine.players[Color.NOIR].pieces = [];
        for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
                const pc = engine.plateau[y][x].piece;
                if (pc) engine.players[pc.color].pieces.push(pc);
            }
        }

        // Restaurer l'état des joueurs
        engine.players[Color.BLANC].canCastleKingSide = savedState.players[Color.BLANC].canCastleKingSide;
        engine.players[Color.BLANC].canCastleQueenSide = savedState.players[Color.BLANC].canCastleQueenSide;
        engine.players[Color.NOIR].canCastleKingSide = savedState.players[Color.NOIR].canCastleKingSide;
        engine.players[Color.NOIR].canCastleQueenSide = savedState.players[Color.NOIR].canCastleQueenSide;
        engine.players[Color.BLANC].isInCheck = savedState.players[Color.BLANC].isInCheck;
        engine.players[Color.NOIR].isInCheck = savedState.players[Color.NOIR].isInCheck;
        engine.players[Color.BLANC].capturedPieces = savedState.players[Color.BLANC].capturedPieces.map(p => new Piece(p.type, p.color));
        engine.players[Color.NOIR].capturedPieces = savedState.players[Color.NOIR].capturedPieces.map(p => new Piece(p.type, p.color));

        // Restaurer l'état du jeu
        engine.currentPlayer = engine.players[savedState.currentPlayer];
        engine.gameState = savedState.gameState;
        engine.lastMove = savedState.lastMove ? {
            ...savedState.lastMove,
            piece: savedState.lastMove.piece ? new Piece(savedState.lastMove.piece.type, savedState.lastMove.piece.color) : null,
            capturedPiece: savedState.lastMove.capturedPiece ? new Piece(savedState.lastMove.capturedPiece.type, savedState.lastMove.capturedPiece.color) : null
        } : null;
        engine.moveHistory = savedState.moveHistory.map(m => ({
            ...m,
            piece: m.piece ? new Piece(m.piece.type, m.piece.color) : null,
            capturedPiece: m.capturedPiece ? new Piece(m.capturedPiece.type, m.capturedPiece.color) : null
        }));
        engine.promotionPending = savedState.promotionPending ? { ...savedState.promotionPending } : null;
    }

    // Effectue un mouvement temporaire
    makeTemporaryMove(engine, move) {
        const prevPos = engine.suppressPositionHistory;
        const prevHist = engine.suppressMoveHistory;
        engine.suppressPositionHistory = true;
        engine.suppressMoveHistory = true;

        const res = engine.makeMove(move.fromX, move.fromY, move.toX, move.toY);
        if (res === 'promotion') {
            // Pour l'évaluation, promouvoir automatiquement en reine
            engine.promotePawn(PieceType.REINE);
            engine.suppressPositionHistory = prevPos;
            engine.suppressMoveHistory = prevHist;
            return true;
        }
        engine.suppressPositionHistory = prevPos;
        engine.suppressMoveHistory = prevHist;
        return res === true;
    }

    // Mouvement aléatoire de secours
    getRandomMove(engine) {
        const allMoves = this.getAllPossibleMoves(engine, engine.currentPlayer.color);
        if (allMoves.length === 0) return null;
        
        return allMoves[Math.floor(Math.random() * allMoves.length)];
    }

    // Délai asynchrone
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Définit la difficulté
    setDifficulty(level) {
        this.difficulty = Math.max(1, Math.min(5, level));
        console.log(`🎯 Difficulté IA définie sur: ${this.difficulty}`);
    }
}

// Export pour utilisation dans le navigateur
if (typeof globalThis !== 'undefined') {
    globalThis.ChessAI = ChessAI;
}