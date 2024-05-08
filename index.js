const puppeteer = require('puppeteer');
const fs = require('fs');
const { stringify } = require('csv-stringify');
const path = require('path');

// Function to get dropdown options
async function getOptions(page, selector) {
    return await page.evaluate((selector) => {
        let options = Array.from(document.querySelector(selector).options);
        return options.map(option => ({
            text: option.text,
            value: option.value
        }));
    }, selector);
}

async function getValue(page, selector) {
    return await page.evaluate((selector) => {
        const selectedOption = document.querySelector(selector).value;
        return selectedOption;
    }, selector);
}
async function scrapeData() {
    try {
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        await page.goto('https://ejalshakti.gov.in/JJM/JJMReports/BasicInformation/JJMRep_AbstractData_D.aspx', { waitUntil: 'networkidle0' });

        await page.waitForSelector('#CPHPage_ddFinyear'); // Wait for the first dropdown to appear

        const dataDir = path.join(__dirname, 'data');

        // Create the parent directory if it doesn't exist
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir);
        }

        // Fetch dropdown options for the year
        const years = await getOptions(page, '#CPHPage_ddFinyear');

        // Filter out the "-Select Year-" option
        const validYears = years.filter(year => year.value === "2023-2024" );

         for (let year of validYears) {
            const yearFolder = path.join(dataDir, year.text.replace(/[\\/:*?"<>|]/g, '-'));
            if (!fs.existsSync(yearFolder)) {
                fs.mkdirSync(yearFolder);
            }
            console.log(year.value);
            await page.select('#CPHPage_ddFinyear', year.value);
            await new Promise(resolve => setTimeout(resolve, 500));

            // Select Odisha from the state dropdown
            await page.select('#CPHPage_ddState', '24');
            await new Promise(resolve => setTimeout(resolve, 500));

            // Fetch dropdown options
            // const states = await getOptions(page, '#CPHPage_ddState');
            const state = await page.select('#CPHPage_ddState', '24');
            // console.log(state.text);
            // for (let state of states) {
                const stateFolder = path.join(yearFolder, 'Odisha');
                if (!fs.existsSync(stateFolder)) {
                    fs.mkdirSync(stateFolder);
                }
                console.log('Odisha');
                // await page.select('#CPHPage_ddState', '24');
                await new Promise(resolve => setTimeout(resolve, 500));
                let districts = await getOptions(page, '#CPHPage_ddDistrict');

                for (let district of districts) {
                    const districtFolder = path.join(stateFolder, district.text.replace(/[\\/:*?"<>|]/g, '-'));
                    if (!fs.existsSync(districtFolder)) {
                        fs.mkdirSync(districtFolder);
                    }
                    console.log(district.text);
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
                            await new Promise(resolve => setTimeout(resolve, 2000));
                            const radioButtonsPresent = await page.evaluate(() => {
                                const radioButtons = document.querySelectorAll('#CPHPage_rdbvillages input[type="radio"]');
                                return radioButtons.length > 0;
                            });
                            if (radioButtonsPresent) {
                                // Handle radio buttons
                                const radioButtons = await page.evaluate(() => {
                                    const radios = Array.from(document.querySelectorAll('#CPHPage_rdbvillages input[type="radio"]'));
                                    return radios.map(radio => ({
                                        id: radio.id,
                                        value: radio.value,
                                        label: radio.nextElementSibling.textContent.trim() // Fetch text between <label> tags
                                    }));
                                });

                                if (radioButtons.length > 0) {
                                    // Handle radio buttons if available
                                    for (let radioButton of radioButtons) {
                                        try {
                                            await page.evaluate((id) => {
                                                const element = document.getElementById(id);
                                                if (element) {
                                                    element.click();
                                                } else {
                                                    throw new Error(`Element with id ${id} not found.`);
                                                }
                                            }, radioButton.id);

                                            // Click on the "Show" button
                                            await page.click('#CPHPage_btnShow');
                                            await new Promise(resolve => setTimeout(resolve, 5000));

                                            // Wait for the data to load
                                            await page.waitForSelector('#tableReportTable', { timeout: 5000 }).catch(() => console.log('Table not found, proceeding to next radio button'));

                                            const data = await page.evaluate(() => {
                                                const rows = Array.from(document.querySelectorAll('#tableReportTable tr'));
                                                return rows.map(row => {
                                                    const columns = row.querySelectorAll('th, td');
                                                    return Array.from(columns, column => column.innerText.trim().replace(/\n/g, ' '));
                                                });
                                            });

                                            // Save to CSV file using radio button label instead of value
                                            const csvFilePath = path.join(blockFolder, `${radioButton.label}.csv`);
                                            stringify(data, (err, output) => {
                                                if (err) throw err;
                                                fs.writeFile(csvFilePath, output, (err) => {
                                                    if (err) throw err;
                                                    // console.log(`${radioButton.label}.csv saved in ${block.text} folder.`);
                                                });
                                            });
                                        } catch (error) {
                                            console.error(error);
                                            continue;
                                        }
                                    }
                                }
                            } else {
                                // Handle categories if radio buttons are not present
                                await page.click('#CPHPage_btnShow');
                                await new Promise(resolve => setTimeout(resolve, 5000));

                                // Wait for the data to load
                                await page.waitForSelector('#tableReportTable', { timeout: 5000 }).catch(() => console.log('Table not found, proceeding to next category'));

                                const data = await page.evaluate(() => {
                                    const rows = Array.from(document.querySelectorAll('#tableReportTable tr'));
                                    return rows.map(row => {
                                        const columns = row.querySelectorAll('th, td');
                                        return Array.from(columns, column => column.innerText.trim().replace(/\n/g, ' '));
                                    });
                                });

                                // Save to CSV file using category name instead of value
                                const csvFilePath = path.join(blockFolder, `${categoryNameForFile}.csv`);
                                stringify(data, (err, output) => {
                                    if (err) throw err;
                                    fs.writeFile(csvFilePath, output, (err) => {
                                        if (err) throw err;
                                        // console.log(`${categoryNameForFile}.csv saved in ${block.text} folder.`);
                                    });
                                });
                            }
                        }
                    }
                }
             }
        // }

        await browser.close();
    } catch (err) {
        console.error(err);
    }
}

scrapeData();
