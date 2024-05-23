const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const args = process.argv.slice(2);
const startIndex = parseInt(args[0]);
const endIndex = parseInt(args[1]);

if (isNaN(startIndex) || isNaN(endIndex) || startIndex < 0 || endIndex < startIndex) {
    console.error('Invalid arguments. Usage: node index.js <startIndex> <endIndex>');
    process.exit(1);
}

(async () => {
    const browser = await puppeteer.launch({ headless: false }); 
    const page = await browser.newPage();
    await page.goto('https://ejalshakti.gov.in/jjm/JJMReports/profiles/rpt_VillageProfile.aspx', { waitUntil: 'networkidle2' });

    const selectors = {
        state: '#CPHPage_ddState',
        district: '#CPHPage_ddDistrict',
        block: '#CPHPage_ddblock',
        panchayat: '#CPHPage_ddPanchayat',
        village: '#CPHPage_ddVillage',
        showButton: '#CPHPage_btnShow'
    };

    async function selectOption(selector, value, waitTime = 3000) {
        await page.select(selector, value);
        await new Promise(resolve => setTimeout(resolve, waitTime)); 
    }

    async function getOptions(selector) {
        return await page.evaluate((selector) => {
            const options = Array.from(document.querySelector(selector).options);
            return options.filter(opt => opt.value !== '-1').map(opt => ({ value: opt.value, text: opt.text }));
        }, selector);
    }

    function createDirectory(dir) {
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir, { recursive: true });
        }
    }

    async function saveToCsv(data, dir, filename) {
        createDirectory(dir);
        const csvWriter = createCsvWriter({
            path: path.join(dir, filename),
            header: Object.keys(data[0]).map(key => ({id: key, title: key}))
        });
        await csvWriter.writeRecords(data);
    }

    async function scrapeAndSaveData(state, district, block, panchayat, village) {
        try {
            await page.click(selectors.showButton);
            await new Promise(resolve => setTimeout(resolve, 7000)); 

            const populationData = await page.evaluate(() => {
                const totalPopulation = document.querySelector('#CPHPage_lblToptalPop')?.innerText.trim();
                const scPopulation = document.querySelector('#CPHPage_lblSCPop')?.innerText.trim();
                const stPopulation = document.querySelector('#CPHPage_lblSTPop')?.innerText.trim();
                const genPopulation = document.querySelector('#CPHPage_lblGENPop')?.innerText.trim();

                if (!totalPopulation || !scPopulation || !stPopulation || !genPopulation) {
                    throw new Error('Population data not available');
                }

                return {
                    totalPopulation,
                    scPopulation,
                    stPopulation,
                    genPopulation
                };
            });

            const connectionData = await page.evaluate(() => {
                const totalHouseholds = document.querySelector('#CPHPage_lblHouseHolds')?.innerText.trim();
                const tapConnections = document.querySelector('#CPHPage_lblHouseConnection')?.innerText.trim();
                const pwsAvailable = document.querySelector('#CPHPage_lblIsPWS')?.innerText.trim();
                const jjmStatus = document.querySelector('#CPHPage_lblvillagestatus')?.innerText.trim();

                if (!totalHouseholds || !tapConnections || !pwsAvailable || !jjmStatus) {
                    throw new Error('Connection data not available');
                }

                return {
                    totalHouseholds,
                    tapConnections,
                    pwsAvailable,
                    jjmStatus
                };
            });

            const baseDir = path.join(__dirname, 'dataVillages', state, district, block, panchayat, village);
            await saveToCsv([populationData], baseDir, 'population.csv');
            await saveToCsv([connectionData], baseDir, 'connection_information.csv');
        } catch (error) {
            console.error(`Skipping village ${village}: ${error.message}`);
        }
    }

    const odishaValue = '24'; 
    await selectOption(selectors.state, odishaValue, 3000);

    const districts = await getOptions(selectors.district);
    const districtsToProcess = districts.slice(startIndex - 1, endIndex);

    for (const district of districtsToProcess) {
        console.log(`Starting district: ${district.text}`);
        await selectOption(selectors.district, district.value, 3000);
        const blocks = await getOptions(selectors.block);
        for (const block of blocks) {
            await selectOption(selectors.block, block.value, 3000);
            const panchayats = await getOptions(selectors.panchayat);
            for (const panchayat of panchayats) {
                await selectOption(selectors.panchayat, panchayat.value, 3000);
                const villages = await getOptions(selectors.village);
                for (const village of villages) {
                    await selectOption(selectors.village, village.value, 3000);
                    await scrapeAndSaveData('Odisha', district.text, block.text, panchayat.text, village.text);
                }
            }
        }
    }

    await browser.close();
})();
