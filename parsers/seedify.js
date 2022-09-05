const cheerio = require("cheerio");
const puppeteer = require('puppeteer');
const pretty = require("pretty");
const fs = require("fs");
const path = require("path");
const { waitTillHTMLRendered } = require('../utils/helper')

const URL = 'https://launchpad.seedify.fund'

async function parseSeedify() {

    let upcomingIDO = []

    const browser = await puppeteer.launch({
        headless: false,
    });

    const page = await browser.newPage();

    await page.goto(`${URL}`, {waitUntil: 'load', timeout: 0});

    await page.waitForSelector('.upcomeing-d .pool_card')
    await waitTillHTMLRendered(page)

    const content = await page.content();
    const $ = cheerio.load(content);

    const projects = [];

    $('.upcomeing-d .pool_card').each(function (i, e) {
        const $card = cheerio.load(e)
        projects.push({
            link: `${URL}${$card('h3 a').attr('href')}`,
            name: $card('h3 a').first().text()
        })
    })

    console.log(projects)

    const filteredProjects = projects.filter((v,i,a)=>a.findIndex(t=>(t.name===v.name))===i)

    for (let i = 0; i < filteredProjects.length; i++) {
        try {
            projectDetails = {}
            const project = filteredProjects[i]
            console.log(project)
            page.goto(project.link, {
                waitUntil: "networkidle2",
                timeout: 60000
            })
            await page.waitForSelector('.inner_pool_details')
            await waitTillHTMLRendered(page)

            let projectContent = await page.content()
            
            let $projectPage = cheerio.load(projectContent)
            
            projectDetails.data = {}
            projectDetails.name = $projectPage('.socia_grd h3').text()
            projectDetails.url = project.link
            projectDetails.provider = 'SEEDIFY'
            projectDetails.image = $projectPage('.inner_pool_detail_banner img').attr('src')

            $projectPage('.tble tbody tr').each(function(i, e) {
                let $row = cheerio.load(e)
                let key = $row('td').first().text()
                let formatedKey = key.toLocaleLowerCase().trim().replace(/\s+/g, "_").replace('.', '')
                let value = $row('td').text().replace(key, '').trim()
                if (formatedKey === 'symbol') {
                    projectDetails.symbol = value
                } else {
                    projectDetails.data[formatedKey] = value
                }
            })
        } catch (e) {
            console.log(e)
        }
        upcomingIDO.push(projectDetails)
    }
    fs.writeFileSync(path.resolve('./data/seedify.json'), JSON.stringify(upcomingIDO, null, 4));

    browser.close()
}

module.exports = {
    parseSeedify
}