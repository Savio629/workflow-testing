const puppeteer = require('puppeteer');
const fs = require('fs');
const { stringify } = require('csv-stringify');
const path = require('path');

async function scrapeData() {
    try {
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        await page.goto('https://ejalshakti.gov.in/JJM/JJMReports/BasicInformation/JJMRep_AbstractData_D.aspx', { waitUntil: 'networkidle0' });

        await page.waitForSelector('#CPHPage_ddFinyear'); 

        const dataDir = path.join(__dirname, 'data');

        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir);
        }

        await page.select('#CPHPage_ddFinyear', '2019-2020');
        await new Promise(resolve => setTimeout(resolve, 2000));

        await page.select('#CPHPage_ddState', '1');
        await new Promise(resolve => setTimeout(resolve, 2000));

        await page.click('#CPHPage_btnShow'); 
        await new Promise(resolve => setTimeout(resolve, 5000));
        await page.waitForSelector('#tableReportTable');

        const data = await page.evaluate(() => {
            const rows = Array.from(document.querySelectorAll('#tableReportTable tr'));
            return rows.map(row => {
                const columns = row.querySelectorAll('th, td');
                return Array.from(columns, column => column.innerText.trim().replace(/\n/g, ' '));
            });
        });

        const csvFilePath = path.join(dataDir, 'Andaman-Nicobar.csv');
        stringify(data, (err, output) => {
            if (err) throw err;
            fs.writeFile(csvFilePath, output, (err) => {
                if (err) throw err;
                console.log("Andaman-Nicobar.csv saved in data folder.");
            });
        });

        await browser.close();
    } catch (err) {
        console.error(err);
    }
}

scrapeData();