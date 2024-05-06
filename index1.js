const puppeteer = require('puppeteer');
const fs = require('fs');
const { stringify } = require('csv-stringify');
const path = require('path');

// Function to get dropdown options
async function getOptions(page, selector) {
    return await page.evaluate((selector) => {
        const options = Array.from(document.querySelector(selector).options);
        return options.map(option => ({
            text: option.text,
            value: option.value
        }));
    }, selector);
}

// Function to scrape data
async function scrapeData() {
    try {
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        await page.goto('https://ejalshakti.gov.in/JJM/JJMReports/BasicInformation/JJMRep_AbstractData_D.aspx', { waitUntil: 'networkidle0' });
        await page.waitForSelector('#CPHPage_ddFinyear'); // Wait for the first dropdown to appear

        const dataDir = path.join(__dirname, 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir);
        }

        const years = await getOptions(page, '#CPHPage_ddFinyear');
        const validYears = years.filter(year => year.value !== "-1" && year.text !== "2024-2025");

        for (let year of validYears) {
            const yearFolder = path.join(dataDir, year.text.replace(/[\\/:*?"<>|]/g, '-'));
            if (!fs.existsSync(yearFolder)) {
                fs.mkdirSync(yearFolder);
            }

            await page.select('#CPHPage_ddFinyear', year.value);
            await new Promise(resolve => setTimeout(resolve, 500));

            const states = await getOptions(page, '#CPHPage_ddState');
            for (let state of states) {
                console.log(`Processing State: ${state.text}`);
                const stateFolder = path.join(yearFolder, state.text.replace(/[\\/:*?"<>|]/g, '-'));
                if (!fs.existsSync(stateFolder)) {
                    fs.mkdirSync(stateFolder);
                }

                await page.select('#CPHPage_ddState', state.value);
                await new Promise(resolve => setTimeout(resolve, 500));
                
                let districts = await getOptions(page, '#CPHPage_ddDistrict');
                for (let district of districts) {
                    console.log(`  Processing District: ${district.text}`);
                    const districtFolder = path.join(stateFolder, district.text.replace(/[\\/:*?"<>|]/g, '-'));
                    if (!fs.existsSync(districtFolder)) {
                        fs.mkdirSync(districtFolder);
                    }

                    await page.select('#CPHPage_ddDistrict', district.value);
                    await new Promise(resolve => setTimeout(resolve, 500));
                    let blocks = await getOptions(page, '#CPHPage_ddBlock');

                    for (let block of blocks) {
                        const blockFolder = path.join(districtFolder, block.text.replace(/[\\/:*?"<>|]/g, '-'));
                        if (!fs.existsSync(blockFolder)) {
                            fs.mkdirSync(blockFolder);
                        }

                        await page.select('#CPHPage_ddBlock', block.value);
                        await new Promise(resolve => setTimeout(resolve, 500));
                        let categories = await getOptions(page, '#CPHPage_ddCategory');

                        for (let category of categories) {
                            const categoryNameForFile = category.text.replace(/[\\/:*?"<>|]/g, '-');
                            await page.select('#CPHPage_ddCategory', category.value);
                            await page.click('#CPHPage_btnShow');
                            await new Promise(resolve => setTimeout(resolve, 5000));

                            try {
                                await page.waitForSelector('#tableReportTable', { timeout: 5000 });
                                const data = await page.evaluate(() => {
                                    const rows = Array.from(document.querySelectorAll('#tableReportTable tr'));
                                    return rows.map(row => {
                                        const columns = row.querySelectorAll('th, td');
                                        return Array.from(columns, column => column.innerText.trim().replace(/\n/g, ' '));
                                    });
                                });

                                const csvFilePath = path.join(blockFolder, `${categoryNameForFile}.csv`);
                                stringify(data, (err, output) => {
                                    if (err) throw err;
                                    fs.writeFile(csvFilePath, output, (err) => {
                                        if (err) throw err;
                                        console.log(`Data saved: ${csvFilePath}`);
                                    });
                                });
                            } catch (error) {
                                console.log(`Table not found for ${categoryNameForFile}, skipped.`);
                            }
                        }
                    }
                }
            }
        }

        await browser.close();
    } catch (err) {
        console.error(`An error occurred: ${err}`);
    }
}

scrapeData();
