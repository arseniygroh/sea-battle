const socket = io();

socket.on('serverFull', () => {
    alert("Server is full");
});

socket.on('connect', () => {
    console.log(`Connection is estabilished: ${socket.id}`);
});

const cols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

function generateBoardData() {
    const data = [];
    for (let row = 1; row <= 10; row++) {
        for (const col of cols) {
            data.push({
                x: col,    
                y: row,    
                state: 0   // means water
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

function displayShip(startXIndex, startY, length, isHorizontal, currentState) {
    for (let i = 0; i < length; i++) {
        let currentX = isHorizontal ? cols[startXIndex + i] : cols[startXIndex];
        let currentY = isHorizontal ? startY : startY + i;

        let index = currentState.findIndex(obj => obj.x === currentX && obj.y === currentY);
        currentState[index].state = 3;
    }
}

function generateRandomFleet(currentState, pivotInstance) {
    const fleet = [4, 3, 3, 2, 2, 2, 1, 1, 1, 1];
    let success = false;

    while (!success) {
        currentState.forEach(cell => cell.state = 0);
        let isStuck = false;

        for (let length of fleet) {
            let isPlaced = false;
            let attempts = 0;

            while (!isPlaced && attempts < 200) {
                let randomXIndex = Math.floor(Math.random() * 10);
                let randomY = Math.floor(Math.random() * 10) + 1;
                let isHorizontal = Math.random() > 0.5;

                if (canPlaceShip(randomXIndex, randomY, length, isHorizontal, currentState)) {
                    displayShip(randomXIndex, randomY, length, isHorizontal, currentState);
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
    generateRandomFleet(gameState, pivot); 
});

// enemyPivot.on('reportcomplete', function() {
//     enemyPivot.off('reportcomplete');
//     generateRandomFleet(enemyGameState, enemyPivot);
// });

function handleCellClick(cell) {
    if ((cell.rowIndex < 2 || cell.rowIndex > 11) || cell.type === "header") return;
    if ((cell.columnIndex < 1 || cell.columnIndex > 10) || cell.type === "header") return;
    const targetCol = cell.columns[0].caption;
    const targetRow = +cell.rows[0].caption;

    socket.emit('fire', {
        x: targetCol, 
        y: targetRow
    });

}


enemyPivot.on("cellclick", handleCellClick)

socket.on('incomingFire', (coords) => {
    const targetCell = gameState.find(obj => obj.x === coords.x && obj.y === coords.y);
    let isHit = false; 
        
    if (targetCell.state === 0) {
        targetCell.state = 1; // means miss
    } else if (targetCell.state === 3) {
        targetCell.state = 2; // means hit
        isHit = true;       
    }
    
    pivot.updateData({ data: gameState });

    socket.emit('fireReply', {
        x: coords.x,
        y: coords.y,
        isHit: isHit
    });
});

socket.on('fireReply', result => {
    const targetCell = enemyGameState.find(obj => obj.x === result.x && obj.y === result.y);
    
    if (result.isHit) {
        targetCell.state = 2;
    } else {
        targetCell.state = 1;
    }

    enemyPivot.updateData({ data: enemyGameState });
});

