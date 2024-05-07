### We need to scrap the data from [ejalshakti.gov.in](https://ejalshakti.gov.in/JJM/JJMReports/BasicInformation/JJMRep_AbstractData_D.aspx?Istate=9or6Umv%2bgig%3d&IAgency=9or6Umv%2bgig%3d&IDistrict=gMqMutIC0u0%3d&Iblock=gMqMutIC0u0%3d&IFinyear=joOf9Wxy6nf0qdH7vFm42w%3d%3d&ICategory=5C1KxeqUjmo%3d)

This pull request consists of workflow code and the index.js https://github.com/ChakshuGautam/ejalshakti.gov.in-scraper/pull/3/files

Successfully runned job in the workflow: https://github.com/Savio629/workflow-testing/actions/runs/8973011035
(We just deleted the data folder for testing parellization)

The index.js iteratets through all the dropdown present on the website using puppeteer and it works fine

The issue right now is to run this jobs parallely as it can take a lot of time to download the data

Ref of one job that is running right now
https://github.com/Savio629/workflow-testing/actions/runs/8982203324/job/24669283595#step:5:19
