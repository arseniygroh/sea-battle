const cols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

function generateBoardData() {
    const data = [];

    for (let row = 1; row <= 10; row++) {
        for (const col of cols) {
            data.push({
                x: col,    
                y: row,    
                state: 0   // means water
            })
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

let gameState = generateBoardData();
console.log(gameState);

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

function displayShip(startX, startY, length, isHorizontal) {
    const startXIndex = cols.indexOf(startX);
    if (isHorizontal && startXIndex + length > 10) {
        return false;
    }

    if (!isHorizontal && startY + length - 1 > 10) {
        return false;
    }

    for (let i = 0; i < length; i++) {
        let currentX = isHorizontal ? cols[startXIndex + i] : startX;
        let currentY = isHorizontal ? startY : startY + i;

        let index = gameState.findIndex(obj => obj.x === currentX && obj.y === currentY);

        gameState[index].state = 3;
    }
    pivot.updateData({data: gameState});
    
    return true;
}

setTimeout(() => {
    displayShip("A", 1, 1, true);
}, 100)