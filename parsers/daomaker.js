const cheerio = require("cheerio");
const puppeteer = require('puppeteer');
const pretty = require("pretty");
const fs = require("fs");
const path = require("path");
const { createPage } = require("../utils/steals")
const { waitTillHTMLRendered } = require("../utils/helper")

async function autoScroll(page){
    await page.evaluate(async () => {
        await new Promise((resolve, reject) => {
            var totalHeight = 0;
            var distance = 100;
            var timer = setInterval(() => {
                var scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                if(totalHeight >= scrollHeight){
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    });
}

const URL = 'https://daomaker.com/'
async function parseDaomaker() {

    let upcomingIDO = []

    const browser = await puppeteer.launch({
        headless: false,
    });

    let page = await createPage(browser, URL);

    await waitTillHTMLRendered(page)
    console.log(1)
    const content = await page.content();
    const $ = cheerio.load(content);
    let projects = []
    let filteredProjects = []

    $('.company_card').each(function(i, e) {
        let cardContent = cheerio.load(e)
        if (cardContent('.card-date').text() === 'Coming Soon' || cardContent('.card-date_alt').text() === 'Coming Soon') {
            let projectName = cardContent('.card-title_alt').text().trim().replace(/\s+/g, "-")
            let isActiveLink = cardContent('a.btn').text() === 'Research' || cardContent('a.btn').text() === 'See details'
            projects.push({
                name: projectName,
                isActiveLink: isActiveLink
            })
        }
    })

    console.log(projects)

    filteredProjects = projects.filter((v,i,a)=>a.findIndex(t=>(t.name===v.name))===i)

    for (let i = 0; i < filteredProjects.length; i++) {
        const project = filteredProjects[i];
        let projectDetails = {}
        if (project.isActiveLink) {
            console.log(project.name.replace(/([a-z])([A-Z])/g, '$1-$2'))
            await page.goto(`${URL}company/${project.name.replace(/([a-z])([A-Z][A-Z])/g, '$1-$2').toLocaleLowerCase()}`)
            await waitTillHTMLRendered(page)
            let projectContent = await page.content();
            let $projectPage = cheerio.load(projectContent)
            projectDetails.data = {}
            $projectPage('.metrics_card ul li').each(function (i, e) {
                let rowContent = cheerio.load(e)
                let key = rowContent('.metric_label').text().toLowerCase().replace(':', '').trim().replace(/\s+/g, "_")
                let value = rowContent('.metric_value').text()
                if (key === 'ticker') {
                    projectDetails.symbol = value
                } else {
                    projectDetails.data[key] = value
                }
            })
            projectDetails["url"] = `${URL}company/${project.name}`
            projectDetails["name"] = project.name
            projectDetails["provider"] = 'DAOMAKER'

            projectDetails["image"] = $projectPage('.company_brief .img-fluid').attr('src')
            upcomingIDO.push(projectDetails)
        }

    }
    fs.writeFileSync(path.resolve('./data/daomaker.json'), JSON.stringify(upcomingIDO, null, 4));

    browser.close()
}

module.exports = {
    parseDaomaker
}