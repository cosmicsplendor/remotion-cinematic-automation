const fs = require('fs');
const path = require('path');

// Path to your data file
const dataFilePath = path.join(__dirname, '../src/components/TransferMarket/assets/data.json');

function processCoinData(data) {
    const processedData = data.map(weekData => {
        const coins = weekData.coins;
        let usdcIndex = -1;
        let usdCoinIndex = -1;

        // Find the indices of USDC and USD Coin
        for (let i = 0; i < coins.length; i++) {
            if (coins[i].name === 'USD Coin' && usdCoinIndex === -1) {
                usdCoinIndex = i;
            } else if (coins[i].name === 'USDC' && usdcIndex === -1) {
                usdcIndex = i;
            }
        }

        // Modify the coins array based on the indices
        if (usdcIndex !== -1 && usdCoinIndex !== -1) {
            if (usdcIndex < usdCoinIndex) {
                // Keep USDC, remove USD Coin
                coins.splice(usdCoinIndex, 1); // Remove the element at usdCoinIndex
            } else {
                // Keep USD Coin, remove USDC
                coins.splice(usdcIndex, 1); // Remove the element at usdcIndex
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