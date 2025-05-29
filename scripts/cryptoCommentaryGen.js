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
 * @param {string} previousCommentary - The commentary from the previous quarter, if available.
 * @returns {string} - The full LLM prompt.
 */
function generateLlmPrompt(quarterKey, quarterJsonData, previousCommentary = "") {
    // NOTE: The "previousCommentary" parameter is added if you want to explicitly pass it.
    // The current script structure runs each quarter independently, so true "memory" of the last LLM output
    // would require modifying the main loop to capture and pass it.
    // For now, the stylistic examples serve as the primary guide for continuum.

    let continuumInstruction = "Establish your commentary style based on the persona and examples below.";
    if (previousCommentary) {
        continuumInstruction = `Continue your commentary in stylistic and storytelling continuum from the previous quarter, which was: "${previousCommentary}"\nMaintain the established tone and energy, and build upon the narrative if appropriate, while focusing on the new data for ${quarterKey}.`;
    }


    return `
You are an expert crypto market sports commentator. Your voice is British.
Analyze the following data for ${quarterKey}, which contains weekly snapshots of the top 10 cryptocurrencies by market cap for that quarter.
Craft an engaging and exciting commentary, approximately 12 to 16 seconds long (roughly 40-70 words), delivered in the PRESENT TENSE.

KEY INSTRUCTIONS:
1.  **LIVE, CHRONOLOGICAL COMMENTARY:** You ARE LIVE, commentating as the market unfolds WEEK BY WEEK within this quarter. Your commentary MUST strictly follow the chronological progression of the data. Narrate the story of the quarter as it happens. Do NOT announce events or milestones (e.g., "Bitcoin hits 10 billion") before they appear in the weekly snapshots. If a coin hits a milestone in the last week, mention it THEN, not at the start.
2.  **DYNAMIC PACING & EMPHASIS:** Let the density of action in the weekly data dictate your pacing. Spend more "airtime" (words) on significant movements or weeks with multiple major changes. Use VIVID, ENERGETIC language, exclamations, and vary your sentence structure. Capitalize words for emphasis (e.g., "HUGE surge!", "ABSOLUTELY ON FIRE!").
3.  **HIGHLIGHT MAJOR MOVEMENTS:** Focus on:
    *   Coins making big jumps in market cap (quantify if impactful, e.g., "doubles in price!").
    *   New entrants storming into the top 10.
    *   Coins dramatically falling out of the top 10 (their absence is the cue).
    *   Significant sustained gains or losses for prominent coins.
    *   Interesting trends or shifts in dominance (e.g., "Altcoins are rallying hard!").
4.  **SUBTLE HISTORICAL CONTEXT:** If you have RELEVANT external knowledge about major events or narratives (e.g., specific partnerships, protocol updates, market sentiment, or reasons behind a pump/dump like the DAO hack) that DIRECTLY influenced these top 10 cryptos DURING THIS QUARTER, you can SUBTLY weave that in. This context must align with visible market movements in the data for that period. Keep it concise and integrated into the live action. Do NOT explicitly state "the data shows" or "according to the data." Just commentate.
5.  **SIMULTANEOUS EVENTS:** If multiple significant events occur in the same week, focus on the most impactful ones or try to cover them concisely. You're live, so you can't pause; capture the whirlwind.
6.  **MONTH-SPECIFIC REFERENCES:** Use specific months where appropriate (e.g., "as we head into May," "a late June surge") rather than just "this quarter."
7.  **WORD COUNT:** Strictly adhere to 40-70 words. Be punchy and concise.

STYLISTIC REFERENCE & CONTINUUM:
Your commentary should flow naturally from the established style. Here are examples of the tone and energy:
Previous Q1 2016 example: "Welcome to 2016! Bitcoin leads, but ETHEREUM IS ON FIRE! Climbing fast... IT'S right THERE. SNAGS number two! And it just KEEPS GOING, its market cap EXPLODING nearly tenfold this quarter! THEN, a late SHOCKER—Monero CRASHES into the top 10!"
Previous Q2 2016 example: "And the action continues into Q2! Bitcoin ROCKETS through June, smashing TEN BILLION! Ethereum also hits a billion! The DAO explodes onto the scene late May, a STUNNING rise... THEN BAM! It's June 17th, The DAO IS HACKED! This revolutionary project is in FREEFALL, folks!"

${continuumInstruction}

Here's the data for ${quarterKey}:
${quarterJsonData}

Your commentary for ${quarterKey}:
`;
}

/**
 * Displays the quarter data and the LLM prompt.
 * @param {string} quarterKey - The key for the current quarter.
 * @param {Array<Object>} dataForQuarter - The weekly data for this quarter.
 * @param {string} previousCommentary - Commentary from the previous quarter.
 */
async function displayQuarterData(quarterKey, dataForQuarter, previousCommentary = "") {
    console.log(`\n--- Data for ${quarterKey} ---`);

    const jsonOutputForQuarter = JSON.stringify(dataForQuarter, null, 0); // No pretty print for LLM

    const llmFullInput = generateLlmPrompt(quarterKey, jsonOutputForQuarter, previousCommentary);

    try {
        const clipboardy = await import('clipboardy');
        if (clipboardy && clipboardy.default && clipboardy.default.writeSync) {
            clipboardy.default.writeSync(llmFullInput);
            console.log("\n[SUCCESS] LLM input for this quarter (data + full prompt) copied to clipboard!");
        } else {
            throw new Error('clipboardy default export not found or writeSync missing');
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
    let previousQuarterCommentary = ""; // Variable to store the last commentary

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    async function handleQuarterDisplay() {
        const currentQuarter = processedData[currentQuarterIndex];
        // Pass previousQuarterCommentary to displayQuarterData, which passes it to generateLlmPrompt
        await displayQuarterData(currentQuarter.quarterKey, currentQuarter.weeks, previousQuarterCommentary);

        console.log(`\nDisplaying: ${currentQuarter.quarterKey} (${currentQuarterIndex + 1} of ${processedData.length})`);
        
        // Prompt for the user to paste the LLM's generated commentary for THIS quarter
        rl.question("Paste the LLM's commentary for the current quarter (or leave blank if none generated): ", (currentCommentary) => {
            previousQuarterCommentary = currentCommentary.trim(); // Store for the next iteration

            rl.question("Options: (n)ext, (p)revious, (q)uit: ", (action) => {
                action = action.trim().toLowerCase();
                if (action === 'n') {
                    currentQuarterIndex = (currentQuarterIndex + 1);
                    if (currentQuarterIndex >= processedData.length) {
                        console.log("Reached the end of data. Looping back to the start.");
                        currentQuarterIndex = 0;
                        previousQuarterCommentary = ""; // Reset commentary if looping
                    }
                } else if (action === 'p') {
                    currentQuarterIndex = (currentQuarterIndex - 1);
                    if (currentQuarterIndex < 0) {
                        console.log("Reached the beginning of data. Looping to the end.");
                        currentQuarterIndex = processedData.length - 1;
                        // Note: "previous" commentary logic gets tricky here if you truly want sequential flow backwards.
                        // For simplicity, we might just not carry "previous" commentary when going backwards,
                        // or you'd need a more sophisticated way to store all commentaries.
                        // For now, it will use the commentary of Q(N) as "previous" for Q(N-1), which might be okay.
                        previousQuarterCommentary = ""; // Or fetch stored commentary for Q(N-2)
                    }
                } else if (action === 'q') {
                    console.log("Exiting.");
                    rl.close();
                    return;
                } else if (action !== '') { // Allow empty input to just re-display current
                    console.log("Invalid option. Please try again.");
                }
                handleQuarterDisplay(); // Recurse for next action
            });
        });
    }

    handleQuarterDisplay(); // Start the loop
}

// Run the CLI
mainCli().catch(err => console.error("Unhandled error in mainCli:", err));