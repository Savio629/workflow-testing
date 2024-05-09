### We need to scrap the data from [ejalshakti.gov.in](https://ejalshakti.gov.in/JJM/JJMReports/BasicInformation/JJMRep_AbstractData_D.aspx?Istate=9or6Umv%2bgig%3d&IAgency=9or6Umv%2bgig%3d&IDistrict=gMqMutIC0u0%3d&Iblock=gMqMutIC0u0%3d&IFinyear=joOf9Wxy6nf0qdH7vFm42w%3d%3d&ICategory=5C1KxeqUjmo%3d)
 
This pull request consists of workflow code and the index.js https://github.com/ChakshuGautam/ejalshakti.gov.in-scraper/pull/3/files

Successfully runned job in the workflow: https://github.com/Savio629/workflow-testing/actions/runs/8973011035
(We just deleted the data folder for testing parellization)

The index.js iteratets through all the dropdown present on the website using puppeteer and it works fine

The issue right now is to run this jobs parallely as it can take a lot of time to download the data

Ref of one job that is running right now
https://github.com/Savio629/workflow-testing/actions/runs/8982203324/job/24669283595#step:5:19

### The recent pr does the following : 

-  The script successfully interacts with various dropdown menus, including those for years, states, districts, blocks, and categories. It adapts dynamically to fetch pertinent data based on the selected options at each level.

-  It organizes the data by creating a nested directory structure for each selected year, state, district, and block, systematically storing CSV files in their respective folders.

-  Specifically for the year 2024-2025, where radio buttons are present, the script is capable of clicking through these to either display or directly fetch category-based data, ensuring comprehensive form handling.

-  Once the correct page is loaded and the data is displayed, the script extracts table contents and converts them into CSV files, which are then saved under appropriate directories.

-  Throughout the scraping process, the script includes several checks and error handling mechanisms to address issues such as timeouts or missing elements, allowing the process to continue with subsequent data combinations without interruption.
