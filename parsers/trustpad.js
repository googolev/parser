const cheerio = require("cheerio");
const puppeteer = require('puppeteer');
const pretty = require("pretty");
const fs = require("fs");
const { waitTillHTMLRendered } = require("../utils/helper")
const { createPage } = require("../utils/steals")
const path = require("path");

const URL = 'https://trustpad.io'

async function parseTrustpad() {

    let upcomingIDO = []

    const browser = await puppeteer.launch({
        headless: false,
    });

    let page = await createPage(browser, `${URL}/?g=upcoming`);
    

    await waitTillHTMLRendered(page)

    let content = await page.content();
    let $ = cheerio.load(content);

    const projects = [];
    let filteredProjects = []
    let pages = []
    if ($('.gap-3 button').length) {
        pages = $('.gap-3 button').text().split('');
    } else {
        pages = ['1'];
    }
     

    for (let i = 0; i < pages.length; i++) {
        // let [button] = await page.$x(`//button[contains(., '${pages[i]}')]`);
        // if (button) {
        //     await button.click();
        // }

        await waitTillHTMLRendered(page)
            await page.waitForSelector('.mb-12 .row .col-md-6')
            let content = await page.content();
            let $ = cheerio.load(content);
            let cards =  $('.mb-12 .row .col-md-6')
            cards.each(function (j, e) {
                const $card = cheerio.load(e)
                projects.push({
                    link: `${URL}${$card('a').attr('href')}`,
                    name: $card('h2').text()
                })
        })
    }
    filteredProjects = projects.filter((v,i,a)=>a.findIndex(t=>(t.name===v.name))===i)

    for (let i = 0; i < filteredProjects.length; i++) {
        try {
            projectDetails = {}
            const project = filteredProjects[i]
            page.goto(project.link, {
                waitUntil: "networkidle2",
                timeout: 60000
            })
            await page.waitForSelector('.card-body h2 ~ div')
            await waitTillHTMLRendered(page)
            let projectContent = await page.content()
            let $projectPage = cheerio.load(projectContent)
            
            projectDetails.data = {}
            projectDetails.name = project.name
            projectDetails.symbol = $projectPage('.card-body h2 ~ div').text().split('/')[0].trim()
            projectDetails.url = project.link
            projectDetails.provider = 'TRUSTPAD'
            projectDetails.image =  `https://trustpad.io/${$projectPage('.card-body img.rounded-full').attr('src')}`
            console.log(projectDetails)
            $projectPage('.card-body  li.flex').each(function(i, e) {
                let $row = cheerio.load(e)
                let key = $row('.font-semibold').text()
                let formatedKey = key.toLocaleLowerCase().trim().replace(/\s+/g, "_").replace(':', '')
                let value = $(e).text().replace(key, '')
                projectDetails.data[formatedKey] = value
                console.log(projectDetails)
            })
        } catch (e) {
            console.log(e)
        }
        

    upcomingIDO.push(projectDetails)
    }
    fs.writeFileSync(path.resolve('./data/trustpad.json'), JSON.stringify(upcomingIDO, null, 4));

    browser.close()
}

module.exports = {
    parseTrustpad
}