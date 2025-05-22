const fs = require('fs');
const path = require('path');

// Path to your data file and image directory
const dataFilePath = path.join(__dirname, '../src/components/TransferMarket/assets/data.json');
const imageDirectory = path.join(__dirname, '../public/race-images'); // Corrected path.  Assumed in same directory.


function sanitizeFilename(name) {
    return name.replace(/[^a-zA-Z0-9\-_]/g, '_').toLowerCase();
}


fs.readdir(imageDirectory, (err, files) => {
    if (err) {
        console.error('Error reading image directory:', err);
        return;
    }

    // Extract filenames without extensions from the image directory
    const existingImageFilenames = new Set(files.map(file => path.parse(file).name));

    // Load and parse the data file
    fs.readFile(dataFilePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading data file:', err);
            return;
        }

        try {
            const jsonData = JSON.parse(data);

            // Collect unique coin names from the top 10 of each data frame
            const uniqueCoinNames = new Set();
            jsonData.forEach(frame => {
                if (frame.coins && Array.isArray(frame.coins)) {
                    const topTenCoins = frame.coins.slice(0, 10); // Take the first 10 (already sorted)
                    topTenCoins.forEach(coin => {
                        uniqueCoinNames.add(coin.name);
                    });
                }
            });

            // Sanitize and map the unique coin names
            const sanitizedCoinNames = Array.from(uniqueCoinNames).map(sanitizeFilename);

            // Find missing images
            const missingImages = sanitizedCoinNames.filter(name => !existingImageFilenames.has(name));

            // Log the missing images
            if (missingImages.length > 0) {
                console.log('Missing images:');
                missingImages.forEach(imageName => console.log(imageName));
            } else {
                console.log('All required images are present.');
            }

        } catch (error) {
            console.error('Error processing data:', error);
        }
    });
});