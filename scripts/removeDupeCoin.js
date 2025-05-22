const fs = require('fs');
const path = require('path');

// Path to your data file
const dataFilePath = path.join(__dirname, '../src/components/TransferMarket/assets/data.json');
const D1 = 'Binance Coin';
const D2 = 'BNB';
function processCoinData(data) {
    const processedData = data.map(weekData => {
        const coins = weekData.coins;
        let d1Idx = -1;
        let dtIdx = -1;

        // Find the indices of USDC and USD Coin
        for (let i = 0; i < coins.length; i++) {
            if (coins[i].name === D1 && dtIdx === -1) {
                dtIdx = i;
            } else if (coins[i].name === D2 && d1Idx === -1) {
                d1Idx = i;
            }
        }

        // Modify the coins array based on the indices
        if (d1Idx !== -1 && dtIdx !== -1) {
            if (d1Idx < dtIdx) {
                // Keep USDC, remove USD Coin
                coins.splice(dtIdx, 1); // Remove the element at dtIdx
            } else {
                // Keep USD Coin, remove USDC
                coins.splice(d1Idx, 1); // Remove the element at d1Idx
            }
        }

        return {
            weekStart: weekData.weekStart,
            coins: coins // Return modified coins array
        };
    });

    return processedData;
}

// Load and parse the data file
fs.readFile(dataFilePath, 'utf8', (err, data) => {
    if (err) {
        console.error('Error reading data file:', err);
        return;
    }

    try {
        let jsonData = JSON.parse(data);

        // Process the data
        jsonData = processCoinData(jsonData);

        // Write the modified data back to the file (optional)
        fs.writeFile(dataFilePath, JSON.stringify(jsonData, null, 2), err => {
            if (err) {
                console.error('Error writing data file:', err);
            } else {
                console.log('Data file updated successfully!');
            }
        });


        // Optionally, you can log the processed data to the console
        // console.log(JSON.stringify(jsonData, null, 2));

    } catch (error) {
        console.error('Error processing data:', error);
    }
});