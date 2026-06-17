const socket = io();
let isMyTurn = false;
const turnDiv = document.querySelector(".turn");
socket.on('serverFull', () => {
    alert("Server is full");
});

socket.on('connect', () => {
    console.log(`Connection is estabilished: ${socket.id}`);
});

socket.on('gameStart', (data) => {
    isMyTurn = data.isYourTurn;
    if (isMyTurn) {
        turnDiv.textContent = "Game started, it is your turn";
    } else {
        turnDiv.textContent = "Game started, it is enemy's turn";
    }
});

const cols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
let fleetRegisty = new Map();

function generateBoardData() {
    const data = [];
    for (let row = 1; row <= 10; row++) {
        for (const col of cols) {
            data.push({
                x: col,    
                y: row,    
                state: 0,   // means water
                shipId: null
            });
        }
    }
    return data;
}

function generateTableSizes() {
    const sizes = { columns: [], rows: [] };
    sizes.columns.push({ idx: 0, width: 30 });
    sizes.rows.push({ idx: 0, height: 30 });
    
    for (let i = 1; i <= 11; i++) {
        sizes.columns.push({ idx: i, width: 40 });
        sizes.rows.push({ idx: i, height: 40 });
    }
    return sizes;
}

function customizeCellFunction(cellStyle, cellData) {
    if (cellData.type === "value") {
        cellStyle.text = "";
        switch(cellData.value) {
            case 0:
                cellStyle.addClass("cell-water");
                break;
            case 1:
                cellStyle.addClass("cell-miss");
                cellStyle.text = "*"; 
                break;
            case 2:
                cellStyle.addClass("cell-hit");
                cellStyle.text = "X";
                break;
            case 3:
                cellStyle.addClass("cell-ship");
                break;
        }
    }
}

function customizeEnemyCellFunction(cellStyle, cellData) {
    if (cellData.type === "value") {
        cellStyle.text = "";
        switch(cellData.value) {
            case 0:
            case 3:
                cellStyle.addClass("cell-water");
                break;
            case 1:
                cellStyle.addClass("cell-miss");
                cellStyle.text = "*"; 
                break;
            case 2:
                cellStyle.addClass("cell-hit");
                cellStyle.text = "X";
                break;
        }
    }
}

let gameState = generateBoardData();
let enemyGameState = generateBoardData();


const pivot = new WebDataRocks({
    container: "#pivotContainer",
    toolbar: false,
    width: 550,  
    height: 470,
    report: {
        dataSource: {
            data: gameState
        },
        slice: {
            rows: [{ uniqueName: "y"}],
            columns: [{ uniqueName: "x"}],
            measures: [{ uniqueName: "state", aggregation: "sum" }]
        },
        tableSizes: generateTableSizes(),
        options: {
            grid: {
                showFilter: false,      
                showGrandTotals: "none", 
                showTotals: "none",
                showHierarchies: false,
                showReportFiltersArea: false,  
                showHeaders: false,
            },
            configuratorButton: false,
            drillThrough: false,
            sorting: "off",
        }
    },
    customizeCell: customizeCellFunction
});


const enemyPivot = new WebDataRocks({
    container: "#enemyPivotContainer",
    toolbar: false,
    width: 550,  
    height: 470,
    report: {
        dataSource: {
            data: enemyGameState
        },
        slice: {
            rows: [{ uniqueName: "y"}],
            columns: [{ uniqueName: "x"}],
            measures: [{ uniqueName: "state", aggregation: "sum" }]
        },
        tableSizes: generateTableSizes(),
        options: {
            grid: {
                showFilter: false,      
                showGrandTotals: "none", 
                showTotals: "none",
                showHierarchies: false,
                showReportFiltersArea: false,  
                showHeaders: false,
            },
            configuratorButton: false,
            drillThrough: false,
            sorting: "off",
        }
    },
    customizeCell: customizeEnemyCellFunction
});

function canPlaceShip(startXIndex, startY, length, isHorizontal, currentState) {
    if (isHorizontal && startXIndex + length > 10) return false;
    if (!isHorizontal && startY + length - 1 > 10) return false;

    let startCheckX = Math.max(0, startXIndex - 1);
    let endCheckX = Math.min(9, isHorizontal ? startXIndex + length : startXIndex + 1);
    let startCheckY = Math.max(1, startY - 1);
    let endCheckY = Math.min(10, !isHorizontal ? startY + length : startY + 1);

    for (let dy = startCheckY; dy <= endCheckY; dy++) {
        for (let dx = startCheckX; dx <= endCheckX; dx++) {
            let colName = cols[dx];
            let index = currentState.findIndex(obj => obj.x === colName && obj.y === dy);
            if (index !== -1 && currentState[index].state === 3) {
                return false; 
            }
        }
    }

    return true; 
}

function displayShip(startXIndex, startY, length, isHorizontal, currentState, shipId, registry) {

    if (registry) {
        registry.set(shipId, {
            length: length,
            hits: 0,
            coords: []
        });
    }

    for (let i = 0; i < length; i++) {
        let currentX = isHorizontal ? cols[startXIndex + i] : cols[startXIndex];
        let currentY = isHorizontal ? startY : startY + i;

        let index = currentState.findIndex(obj => obj.x === currentX && obj.y === currentY);
        currentState[index].state = 3;
        currentState[index].shipId = shipId;

        if (registry) {
            registry.get(shipId).coords.push({
                x: currentX, 
                y: currentY
            });
        }
    }
}

function generateRandomFleet(currentState, pivotInstance, registry) {
    const fleet = [4, 3, 3, 2, 2, 2, 1, 1, 1, 1];
    let success = false;

    while (!success) {
        currentState.forEach(cell => {
            cell.state = 0;
            cell.shipId = null;
        });
        if (registry) {
            registry.clear();
        }

        let isStuck = false;
        let shipCounter = 0;

        for (let length of fleet) {
            let isPlaced = false;
            let attempts = 0;
            shipCounter++;
            let currentShipId = 'ship_' + shipCounter;

            while (!isPlaced && attempts < 200) {
                let randomXIndex = Math.floor(Math.random() * 10);
                let randomY = Math.floor(Math.random() * 10) + 1;
                let isHorizontal = Math.random() > 0.5;

                if (canPlaceShip(randomXIndex, randomY, length, isHorizontal, currentState)) {
                    displayShip(randomXIndex, randomY, length, isHorizontal, currentState, currentShipId, registry);
                    isPlaced = true;
                }
                attempts++;
            }

            if (!isPlaced) {
                isStuck = true;
                break; 
            }
        }
        if (!isStuck) {
            success = true;
        }
    }
    pivotInstance.updateData({data: currentState});
}

pivot.on('reportcomplete', function() {
    pivot.off('reportcomplete'); 
    generateRandomFleet(gameState, pivot, fleetRegisty);
});

enemyPivot.on('reportcomplete', function() {
    enemyPivot.off('reportcomplete');
    // generateRandomFleet(enemyGameState, enemyPivot, null); 
});

function handleCellClick(cell) {
    if (!isMyTurn) return;

    if ((cell.rowIndex < 2 || cell.rowIndex > 11) || cell.type === "header") return;
    if ((cell.columnIndex < 1 || cell.columnIndex > 10) || cell.type === "header") return;
    const targetCol = cell.columns[0].caption;
    const targetRow = +cell.rows[0].caption;

    isMyTurn = false;
    socket.emit('fire', {
        x: targetCol, 
        y: targetRow
    });

}


enemyPivot.on("cellclick", handleCellClick)

socket.on('incomingFire', (coords) => {
    const targetCell = gameState.find(obj => obj.x === coords.x && obj.y === coords.y);
    let isHit = false; 
    let isSunk = false;      
    let sunkCoords = [];
        
    if (targetCell.state === 0) {
        targetCell.state = 1; // means miss
        isMyTurn = true;
        turnDiv.textContent = "Enemy missed, it is now your turn";
    } else if (targetCell.state === 3) {
        targetCell.state = 2; // means hit
        isHit = true;
        turnDiv.textContent = "Enemy hit your ship, it is still enemy's turn";      
        
        let ship = fleetRegisty.get(targetCell.shipId); 
        ship.hits++;

        if (ship.hits === ship.length) {
            isSunk = true;
            sunkCoords = ship.coords;
            turnDiv.textContent = "Enemy sunk your ship! Still enemy's turn";
        }
    }
    
    pivot.updateData({data: gameState});

    socket.emit('fireReply', {
        x: coords.x,
        y: coords.y,
        isHit: isHit,
        isSunk: isSunk,
        sunkCoords: sunkCoords,
    });
});

socket.on('fireReply', result => {
    const targetCell = enemyGameState.find(obj => obj.x === result.x && obj.y === result.y);

    if (result.isHit) {
        targetCell.state = 2;
        isMyTurn = true;
        turnDiv.textContent = "You hit, it is still your turn";
        if (result.isSunk) {
            const ys = result.sunkCoords.map(obj => obj.y);
            const isHorizontal = new Set(ys).size === 1;
            if (isHorizontal) {
                result.sunkCoords.sort((a, b) => cols.indexOf(a.x) - cols.indexOf(b.x));
            } else {
                result.sunkCoords.sort((a, b) => a.y - b.y);
            }
    
            const markMiss = (xIdx, y) => {
                if (xIdx >= 0 && xIdx <= 9 && y >= 1 && y <= 10) {
                    let cell = enemyGameState.find(obj => obj.x === cols[xIdx] && obj.y === y);
                    if (cell && cell.state === 0) {
                        cell.state = 1; 
                    }
                }
            };
    
            for (let i = 0; i < result.sunkCoords.length; i++) {
                const coordObj = result.sunkCoords[i];
                console.log(coordObj);
                let xIndex = cols.indexOf(coordObj.x);
                let yIndex = Number(coordObj.y);
                console.log(xIndex, yIndex);
                
                if (isHorizontal) {
                    markMiss(xIndex, yIndex - 1);
                    markMiss(xIndex, yIndex + 1);
    
                    if (i === 0) {
                        markMiss(xIndex - 1, yIndex - 1);
                        markMiss(xIndex - 1, yIndex);
                        markMiss(xIndex - 1, yIndex + 1);
                    }
    
                    if (i === result.sunkCoords.length - 1) {
                        markMiss(xIndex + 1, yIndex - 1);
                        markMiss(xIndex + 1, yIndex);
                        markMiss(xIndex + 1, yIndex + 1);
                    }
                } else {
                    markMiss(xIndex - 1, yIndex);
                    markMiss(xIndex + 1, yIndex);
    
                    if (i === 0) {
                        markMiss(xIndex - 1, yIndex - 1);
                        markMiss(xIndex, yIndex - 1);
                        markMiss(xIndex + 1, yIndex - 1);
                    }
                    if (i === result.sunkCoords.length - 1) {
                        markMiss(xIndex - 1, yIndex + 1);
                        markMiss(xIndex, yIndex + 1);
                        markMiss(xIndex + 1, yIndex + 1);
                    }
                }
    
            }
        }
    } else {
        targetCell.state = 1;
        turnDiv.textContent = "You missed, it is now enemy's turn";
    }

    enemyPivot.updateData({data: enemyGameState});
});

