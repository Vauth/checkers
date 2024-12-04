class CheckersGame {
    constructor() {
        this.board = Array(8).fill().map(() => Array(8).fill(null));
        this.currentPlayer = 'red';
        this.selectedPiece = null;
        this.validMoves = [];
        this.gameHistory = [];
        this.redoHistory = [];
        this.difficulty = 'hard';
        this.initialize();
    }

    initialize() {
        // Place initial pieces
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if ((row + col) % 2 === 1) {
                    if (row < 3) this.board[row][col] = { color: 'black', king: false };
                    if (row > 4) this.board[row][col] = { color: 'red', king: false };
                }
            }
        }
        this.saveState();
    }

    isValidMove(startRow, startCol, endRow, endCol) {
        if (endRow < 0 || endRow > 7 || endCol < 0 || endCol > 7) return false;
        if (this.board[endRow][endCol]) return false;

        const piece = this.board[startRow][startCol];
        const rowDiff = endRow - startRow;
        const colDiff = Math.abs(endCol - startCol);

        if (!piece.king && piece.color === 'red' && rowDiff >= 0) return false;
        if (!piece.king && piece.color === 'black' && rowDiff <= 0) return false;

        if (Math.abs(rowDiff) === 1 && colDiff === 1) return true;

        if (Math.abs(rowDiff) === 2 && colDiff === 2) {
            const jumpRow = startRow + rowDiff / 2;
            const jumpCol = startCol + (endCol - startCol) / 2;
            const jumpedPiece = this.board[jumpRow][jumpCol];
            return jumpedPiece && jumpedPiece.color !== piece.color;
        }

        return false;
    }

    getValidMoves(row, col) {
        const moves = [];
        const piece = this.board[row][col];
        if (!piece || piece.color !== this.currentPlayer) return moves;

        const directions = piece.king ? [-1, 1] : piece.color === 'red' ? [-1] : [1];

        for (const rowDir of directions) {
            for (const colDir of [-1, 1]) {
                // Single moves
                if (this.isValidMove(row, col, row + rowDir, col + colDir)) {
                    moves.push({ row: row + rowDir, col: col + colDir, isJump: false });
                }
                // Jump moves
                if (this.isValidMove(row, col, row + 2 * rowDir, col + 2 * colDir)) {
                    moves.push({ row: row + 2 * rowDir, col: col + 2 * colDir, isJump: true });
                }
            }
        }

        return moves;
    }

    getAllValidMoves(color) {
        const moves = [];
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece && piece.color === color) {
                    const pieceMoves = this.getValidMoves(row, col);
                    pieceMoves.forEach(move => {
                        moves.push({
                            from: { row, col },
                            to: { row: move.row, col: move.col },
                            isJump: move.isJump
                        });
                    });
                }
            }
        }
        return moves;
    }

    movePiece(startRow, startCol, endRow, endCol) {
        const piece = this.board[startRow][startCol];
        if (!piece) return false;

        if (this.isValidMove(startRow, startCol, endRow, endCol)) {
            this.board[endRow][endCol] = { ...piece };
            this.board[startRow][startCol] = null;

            // Handle jumps
            if (Math.abs(endRow - startRow) === 2) {
                const jumpRow = startRow + (endRow - startRow) / 2;
                const jumpCol = startCol + (endCol - startCol) / 2;
                this.board[jumpRow][jumpCol] = null;
            }

            // King promotion
            if ((piece.color === 'red' && endRow === 0) || 
                (piece.color === 'black' && endRow === 7)) {
                this.board[endRow][endCol].king = true;
            }

            this.saveState();
            return true;
        }
        return false;
    }

    saveState() {
        this.gameHistory.push({
            board: JSON.parse(JSON.stringify(this.board)),
            currentPlayer: this.currentPlayer
        });
        this.redoHistory = [];
    }

    undo() {
        if (this.gameHistory.length > 1) {
            this.redoHistory.push(this.gameHistory.pop());
            const previousState = this.gameHistory[this.gameHistory.length - 1];
            this.board = JSON.parse(JSON.stringify(previousState.board));
            this.currentPlayer = previousState.currentPlayer;
            return true;
        }
        return false;
    }

    redo() {
        if (this.redoHistory.length > 0) {
            const nextState = this.redoHistory.pop();
            this.board = JSON.parse(JSON.stringify(nextState.board));
            this.currentPlayer = nextState.currentPlayer;
            this.gameHistory.push(nextState);
            return true;
        }
        return false;
    }

    evaluatePosition() {
        let score = 0;
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece) {
                    const value = piece.king ? 3 : 1;
                    score += piece.color === 'red' ? value : -value;
                    
                    // Position bonus
                    if (piece.color === 'red') {
                        score += (7 - row) * 0.1; // Prefer forward positions
                    } else {
                        score -= row * 0.1;
                    }
                }
            }
        }
        return score;
    }

    minimax(depth, alpha, beta, maximizingPlayer) {
        if (depth === 0) return this.evaluatePosition();

        const moves = this.getAllValidMoves(maximizingPlayer ? 'red' : 'black');
        if (moves.length === 0) return maximizingPlayer ? -1000 : 1000;

        if (maximizingPlayer) {
            let maxEval = -Infinity;
            for (const move of moves) {
                const { from, to } = move;
                const oldBoard = JSON.parse(JSON.stringify(this.board));
                this.movePiece(from.row, from.col, to.row, to.col);
                const evals = this.minimax(depth - 1, alpha, beta, false);
                this.board = oldBoard;
                maxEval = Math.max(maxEval, evals);
                alpha = Math.max(alpha, evals);
                if (beta <= alpha) break;
            }
            return maxEval;
        } else {
            let minEval = Infinity;
            for (const move of moves) {
                const { from, to } = move;
                const oldBoard = JSON.parse(JSON.stringify(this.board));
                this.movePiece(from.row, from.col, to.row, to.col);
                const evals = this.minimax(depth - 1, alpha, beta, true);
                this.board = oldBoard;
                minEval = Math.min(minEval, evals);
                beta = Math.min(beta, evals);
                if (beta <= alpha) break;
            }
            return minEval;
        }
    }

    getBestMove() {
        const depth = {
            'easy': 2,
            'medium': 3,
            'hard': 4
        }[this.difficulty];

        const moves = this.getAllValidMoves('black');
        let bestMove = null;
        let bestValue = -Infinity;

        for (const move of moves) {
            const oldBoard = JSON.parse(JSON.stringify(this.board));
            this.movePiece(move.from.row, move.from.col, move.to.row, move.to.col);
            const value = this.minimax(depth - 1, -Infinity, Infinity, false);
            this.board = oldBoard;

            if (value > bestValue) {
                bestValue = value;
                bestMove = move;
            }
        }

        return bestMove;
    }

    checkGameOver() {
        const redPieces = this.countPieces('red');
        const blackPieces = this.countPieces('black');
        
        if (redPieces === 0) return 'black';
        if (blackPieces === 0) return 'red';
        
        const redMoves = this.getAllValidMoves('red');
        const blackMoves = this.getAllValidMoves('black');
        
        if (redMoves.length === 0 && blackMoves.length === 0) return 'draw';
        if (this.currentPlayer === 'red' && redMoves.length === 0) return 'black';
        if (this.currentPlayer === 'black' && blackMoves.length === 0) return 'red';
        
        return null;
    }

    countPieces(color) {
        let count = 0;
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (this.board[row][col]?.color === color) count++;
            }
        }
        return count;
    }
}

// UI Controller
class CheckersUI {
    constructor() {
        this.game = new CheckersGame();
        this.boardElement = document.getElementById('board');
        this.selectedCell = null;
        this.hints = [];
        
        this.initializeBoard();
        this.setupEventListeners();
        this.updateBoard();
    }

    initializeBoard() {
        this.boardElement.innerHTML = '';
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const cell = document.createElement('div');
                cell.className = `cell ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
                cell.dataset.row = row;
                cell.dataset.col = col;
                this.boardElement.appendChild(cell);
            }
        }
    }

    setupEventListeners() {
        this.boardElement.addEventListener('click', (e) => this.handleCellClick(e));
        
        document.getElementById('undoBtn').addEventListener('click', () => {
            if (this.game.undo()) {
                this.clearSelection();
                this.updateBoard();
            }
        });
        
        document.getElementById('redoBtn').addEventListener('click', () => {
            if (this.game.redo()) {
                this.clearSelection();
                this.updateBoard();
            }
        });
        
        document.getElementById('hintBtn').addEventListener('click', () => this.showHint());
        
        document.getElementById('difficulty').addEventListener('change', (e) => {
            this.game.difficulty = e.target.value;
        });
        
        document.getElementById('playAgainBtn').addEventListener('click', () => {
            this.game = new CheckersGame();
            this.clearSelection();
            this.updateBoard();
            document.getElementById('gameOverModal').style.display = 'none';
        });

        document.getElementById('newGameBtn').addEventListener('click', () => {
            this.game = new CheckersGame();
            this.clearSelection();
            this.updateBoard();
            document.getElementById('gameOverModal').style.display = 'none';
        });
    }

    handleCellClick(e) {
        const cell = e.target.closest('.cell');
        if (!cell) return;

        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        const piece = this.game.board[row][col];

        if (piece && piece.color === this.game.currentPlayer) {
            this.clearSelection();
            this.selectedCell = { row, col };
            cell.querySelector('.piece')?.classList.add('selected');
            this.showValidMoves(row, col);
        } else if (this.selectedCell) {
            const validMove = this.game.getValidMoves(this.selectedCell.row, this.selectedCell.col)
                .find(move => move.row === row && move.col === col);

            if (validMove) {
                this.game.movePiece(this.selectedCell.row, this.selectedCell.col, row, col);
                this.clearSelection();
                this.game.currentPlayer = this.game.currentPlayer === 'red' ? 'black' : 'red';
                this.updateBoard();

                // Check for game over
                const gameOver = this.game.checkGameOver();
                if (gameOver) {
                    this.showGameOver(gameOver);
                } else if (this.game.currentPlayer === 'black') {
                    // AI move
                    setTimeout(() => {
                        const aiMove = this.game.getBestMove();
                        if (aiMove) {
                            this.game.movePiece(aiMove.from.row, aiMove.from.col, aiMove.to.row, aiMove.to.col);
                            this.game.currentPlayer = 'red';
                            this.updateBoard();
                            
                            const gameOver = this.game.checkGameOver();
                            if (gameOver) {
                                this.showGameOver(gameOver);
                            }
                        }
                    }, 500);
                }
            }
        }
    }

    showValidMoves(row, col) {
        const validMoves = this.game.getValidMoves(row, col);
        validMoves.forEach(move => {
            const cell = this.boardElement.children[move.row * 8 + move.col];
            const hint = document.createElement('div');
            hint.className = 'hint';
            cell.appendChild(hint);
            this.hints.push(hint);
        });
    }

    clearSelection() {
        if (this.selectedCell) {
            const piece = this.boardElement.children[this.selectedCell.row * 8 + this.selectedCell.col]
                .querySelector('.piece');
            if (piece) piece.classList.remove('selected');
        }
        this.selectedCell = null;
        this.hints.forEach(hint => hint.remove());
        this.hints = [];
    }

    showHint() {
        if (this.game.currentPlayer === 'red') {
            this.clearSelection();
            const moves = this.game.getAllValidMoves('red');
            if (moves.length > 0) {
                const bestMove = moves[Math.floor(Math.random() * moves.length)];
                const fromCell = this.boardElement.children[bestMove.from.row * 8 + bestMove.from.col];
                const piece = fromCell.querySelector('.piece');
                if (piece) piece.classList.add('selected');
                this.selectedCell = bestMove.from;
                this.showValidMoves(bestMove.from.row, bestMove.from.col);
            }
        }
    }

    showGameOver(result) {
        const modal = document.getElementById('gameOverModal');
        const message = document.getElementById('gameOverMessage');
        
        if (result === 'draw') {
            message.textContent = "Game Over - It's a Draw!";
        } else {
            message.textContent = `Game Over - ${result.charAt(0).toUpperCase() + result.slice(1)} Wins!`;
        }
        
        modal.style.display = 'flex';
    }

    updateBoard() {
        const cells = this.boardElement.children;
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const cell = cells[row * 8 + col];
                const piece = this.game.board[row][col];
                
                // Clear existing piece
                cell.innerHTML = '';
                
                if (piece) {
                    const pieceElement = document.createElement('div');
                    pieceElement.className = `piece ${piece.color}${piece.king ? ' king' : ''}`;
                    cell.appendChild(pieceElement);
                }
            }
        }

        // Update turn indicator
        const turnPiece = document.getElementById('currentTurn');
        turnPiece.className = `piece ${this.game.currentPlayer}`;
    }
}

// Initialize the game
document.addEventListener('DOMContentLoaded', () => {
    new CheckersUI();
});