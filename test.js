const puppeteer = require('puppeteer');
const fs = require('fs');
const { stringify } = require('csv-stringify');
const path = require('path');

const args = process.argv.slice(2);
const startIndex = parseInt(args[0], 10);
const endIndex = parseInt(args[1], 10);

async function getOptions(page, selector) {
    return await page.evaluate((selector) => {
        let options = Array.from(document.querySelector(selector).options);
        return options.map(option => ({
            text: option.text,
            value: option.value
        }));
    }, selector);
}

async function scrapeData() {
    try {
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        await page.goto('https://ejalshakti.gov.in/JJM/JJMReports/BasicInformation/JJMRep_AbstractData_D.aspx', { waitUntil: 'networkidle0' });

        await page.waitForSelector('#CPHPage_ddFinyear');
        
        const dataDir = path.join(__dirname, 'dataVillages');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir);
        }

        for (let i = startIndex; i <= endIndex; i++) {
            await page.select('#CPHPage_ddFinyear', '2024-2025');
            await new Promise(resolve => setTimeout(resolve, 1000));
            await page.select('#CPHPage_ddState', '24');
            await new Promise(resolve => setTimeout(resolve, 1000));
            await page.click('#CPHPage_btnShow');
            await new Promise(resolve => setTimeout(resolve, 12000));

            const district = await page.evaluate((index) => {
                const selector = `#CPHPage_rpt_lnkbtn_${index}`;
                const selectedOption = document.querySelector(selector);
                return selectedOption ? selectedOption.text : 'Unknown';
            }, i);

            console.log(`Processing data for district: ${district}`);

            await new Promise(resolve => setTimeout(resolve, 500));
            await page.click(`#CPHPage_rpt_Village_${i}`);
            await new Promise(resolve => setTimeout(resolve, 7000));

            try {
                await page.select('select[name="ctl00$CPHPage$ddPagrno"]', '0');
            } catch (error) {
                console.error(`Error: No element found for selector: select[name="ctl00$CPHPage$ddPagrno"] for village ID ${i}`);
                continue;
            }

            await new Promise(resolve => setTimeout(resolve, 60000));
            await page.waitForSelector('#tableReportTable');

            const data = await page.evaluate(() => {
                const rows = Array.from(document.querySelectorAll('#tableReportTable tr'));
                return rows.map(row => {
                    const columns = row.querySelectorAll('th, td');
                    return Array.from(columns, column => column.innerText.trim().replace(/\n/g, ' '));
                });
            });

            const districtFolder = path.join(dataDir, '2024-2025', 'odisha');
            if (!fs.existsSync(districtFolder)) {
                fs.mkdirSync(districtFolder, { recursive: true });
            }

            const csvFilePath = path.join(districtFolder, `${district}.csv`);
            stringify(data, (err, output) => {
                if (err) throw err;
                fs.writeFile(csvFilePath, output, (err) => {
                    if (err) throw err;
                });
            });

            await page.goBack({ waitUntil: 'networkidle0' });
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        await browser.close();
    } catch (err) {
        console.error(err);
    }
}

scrapeData();
