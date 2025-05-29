const fs = require('fs');
const readline = require('readline');

const DATA_FILE = './src/components/TransferMarket/assets/data.json'; // Or your actual data file name

/**
 * Converts a date string to a 'Q_ YYYY' format.
 * @param {string} dateStr - ISO date string (e.g., "2016-01-15T00:00:00.000Z")
 * @returns {string} - Quarter and year (e.g., "Q1 2016")
 */
function getQuarterYear(dateStr) {
    const dtObj = new Date(dateStr);
    const quarter = Math.floor(dtObj.getUTCMonth() / 3) + 1; // getUTCMonth is 0-indexed
    const year = dtObj.getUTCFullYear();
    return `Q${quarter} ${year}`;
}

/**
 * Loads, filters top 10 per week, and groups data by quarter.
 * @param {string} filepath - Path to the JSON data file.
 * @returns {Array<{quarterKey: string, weeks: Array<Object>}> | null} - Sorted array of quarter data or null on error.
 */
function loadAndProcessData(filepath) {
    let rawData;
    try {
        const fileContent = fs.readFileSync(filepath, 'utf-8');
        rawData = JSON.parse(fileContent);
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.error(`Error: Data file '${filepath}' not found.`);
        } else if (error instanceof SyntaxError) {
            console.error(`Error: Could not decode JSON from '${filepath}'.`);
        } else {
            console.error(`Error reading or parsing file: ${error.message}`);
        }
        return null;
    }

    const quarterlyDataAggregator = {}; // Using an object for easy aggregation

    for (const weekEntry of rawData) {
        // Sort by marketCap descending and take top 10
        const sortedCryptos = [...weekEntry.data].sort((a, b) => b.marketCap - a.marketCap);
        const top10Cryptos = sortedCryptos.slice(0, 10);

        const processedWeekEntry = {
            weekStart: weekEntry.weekStart,
            data: top10Cryptos
        };

        const quarterKey = getQuarterYear(weekEntry.weekStart);
        if (!quarterlyDataAggregator[quarterKey]) {
            quarterlyDataAggregator[quarterKey] = [];
        }
        quarterlyDataAggregator[quarterKey].push(processedWeekEntry);
    }

    // Convert to an array and sort quarters chronologically
    const sortedQuarterlyData = Object.keys(quarterlyDataAggregator)
        .map(key => ({
            quarterKey: key,
            weeks: quarterlyDataAggregator[key]
        }))
        .sort((a, b) => {
            const [aQ, aY] = a.quarterKey.split(' ');
            const [bQ, bY] = b.quarterKey.split(' ');
            const yearDiff = parseInt(aY) - parseInt(bY);
            if (yearDiff !== 0) {
                return yearDiff;
            }
            return parseInt(aQ.substring(1)) - parseInt(bQ.substring(1));
        });

    return sortedQuarterlyData;
}

/**
 * Generates the boilerplate LLM prompt with the provided data.
 * @param {string} quarterKey - e.g., "Q1 2017"
 * @param {string} quarterJsonData - JSON string of the quarter's data
 * @returns {string} - The full LLM prompt.
 */
function generateLlmPrompt(quarterKey, quarterJsonData) {
    return `
You are an expert crypto market sports commentator.
Analyze the following data for ${quarterKey}, which contains weekly snapshots of the top 10 cryptocurrencies by market cap for that quarter.
Craft an engaging and exciting commentary, approximately 12 to 16 seconds long (roughly 40-70 words), delivered in the PRESENT TENSE.
Imagine you are live, watching the market unfold. Use dynamic pacing and enthusiastic language.

Highlight major movements, such as:
- Coins making big jumps in market cap.
- New entrants into the top 10.
- Coins falling out of the top 10 (implicitly, by their absence in later weeks of the quarter).
- Significant sustained gains or losses for prominent coins.
- Any interesting trends or shifts in dominance.
- Any other historical facts not obvious form the data

You should primarily base your commentary on the data provided. However, if you have relevant external knowledge about major events or narratives during ${quarterKey} that directly influenced these top 10 cryptos, you can subtly weave that in to add depth and analysis. Do not explicitly state "the data shows" or "according to the data." Just commentate.
Also if two significant events happen simulatneously, not back to back, focus on one or both, but you may not have time to describe one first and eplain the other, because this is happening live/realtime, and you'll have missed the chance to talk about the first event, if you've already spent considerable time on first. So Assume each data frame is consecutive and flows forward in time, you have to be realtime, and have to adjust your commentary as data flows forward, some periods that are significant can be considered longer duration (more words), so you don't necessarily need to divide the words equally across all the periods. don't necessarily have to reference the period by quarter, use specific month wherever applicable
Here's the data for ${quarterKey}:
${quarterJsonData}

Continue Your commentary in stylistic and storytelling continuum:
`;
}

/**
 * Displays the quarter data and the LLM prompt.
 * @param {string} quarterKey - The key for the current quarter.
 * @param {Array<Object>} dataForQuarter - The weekly data for this quarter.
 */
async function displayQuarterData(quarterKey, dataForQuarter) {
    console.log(`\n--- Data for ${quarterKey} ---`);

    const jsonOutputForQuarter = JSON.stringify(dataForQuarter, null, 0);
    // console.log(jsonOutputForQuarter);

    const llmFullInput = generateLlmPrompt(quarterKey, jsonOutputForQuarter);

    // console.log("\n--- LLM Input Instructions ---");
    // console.log(`Analyze the data for ${quarterKey} and craft an engaging 11-20 second commentary...`);
    // console.log("(Full instructions with data below have been prepared for LLM)");

    try {
        const clipboardy = await import('clipboardy');
        if (clipboardy && clipboardy.default && clipboardy.default.writeSync) {
            clipboardy.default.writeSync(llmFullInput);
            console.log("\n[SUCCESS] LLM input for this quarter (data + full prompt) copied to clipboard!");
        } else {
            throw new Error('clipboardy default export not found');
        }
    } catch (error) {
        console.warn("\n[WARNING] Could not copy to clipboard. Clipboardy might have an issue or no clipboard access.");
        console.warn("           Error:", error.message);
        console.warn("           The full LLM input is shown below if you need to copy it manually:\n");
        console.log("--------------------------------------------------------------------");
        console.log(llmFullInput);
        console.log("--------------------------------------------------------------------");
    }
}

/**
 * Main command-line interface loop.
 */
async function mainCli() {
    const processedData = loadAndProcessData(DATA_FILE);

    if (!processedData || processedData.length === 0) {
        if (processedData && processedData.length === 0) {
            console.log("No data found after processing.");
        }
        return;
    }

    let currentQuarterIndex = 0;

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    async function askQuestion() {
        const currentQuarter = processedData[currentQuarterIndex];
        await displayQuarterData(currentQuarter.quarterKey, currentQuarter.weeks);

        console.log(`\nDisplaying: ${currentQuarter.quarterKey} (${currentQuarterIndex + 1} of ${processedData.length})`);
        rl.question("Options: (n)ext, (p)revious, (q)uit: ", (action) => {
            action = action.trim().toLowerCase();
            if (action === 'n') {
                currentQuarterIndex = (currentQuarterIndex + 1) % processedData.length;
            } else if (action === 'p') {
                currentQuarterIndex = (currentQuarterIndex - 1 + processedData.length) % processedData.length;
            } else if (action === 'q') {
                console.log("Exiting.");
                rl.close();
                return;
            } else {
                console.log("Invalid option. Please try again.");
            }
            askQuestion(); // Recurse for next action
        });
    }

    askQuestion(); // Start the loop
}

// Run the CLI
mainCli().catch(err => console.error("Unhandled error in mainCli:", err));