const cheerio = require("cheerio");
const puppeteer = require('puppeteer');
const pretty = require("pretty");
const fs = require("fs");
const path = require("path");
const { waitTillHTMLRendered } = require('../utils/helper')

const URL = 'https://www.poolz.finance'

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

async function parsePoolz() {

    let upcomingIDO = []

    const browser = await puppeteer.launch({
        headless: false,
        args: ['--start-maximized']
    });

    const page = await browser.newPage();
    await page.setViewport({width:0, height:0});

    await page.goto(`${URL}`, {waitUntil: 'load', timeout: 0});

    await waitTillHTMLRendered(page)

    await autoScroll(page);

    const content = await page.content();
    const $ = cheerio.load(content);

    const upcoming_ido_section = cheerio.load($('div[data-testid=carousel-id]')[0])
    const projects = [];
    upcoming_ido_section('.slick-slide').each(function(i, e) {
        let slideContent = cheerio.load(e)
        const projectName = slideContent('p').first().text()
        const projectLink = slideContent('a').attr('href')
        console.log(slideContent('img'))
        const projectImage = slideContent('img').first().attr('src')
        projects.push({
            name: projectName,
            link: `${URL}${projectLink}`,
            image: projectImage
        })
    })

    console.log(projects)

    for (let i = 0; i < projects.length; i++) {
        projectDetails = {}
        const project = projects[i]
        await page.goto(project.link)
        await waitTillHTMLRendered(page)
        let projectContent = await page.content();
        let $projectPage = cheerio.load(projectContent)
        projectDetails.data = {}
        projectDetails.name = project.name
        projectDetails.url = project.link
        projectDetails.provider = 'POOLZ'
        projectDetails.symbol = project.name
        projectDetails.image = $projectPage('.logo-name .logo').attr('src') ? $projectPage('.logo-name .logo').attr('src') : project.image
        
        $projectPage('.table div').each(function(i,e) {
            let $row = cheerio.load(e)
            let value = $row('span').text()
            let key = $row.text().replace(value, '').toLocaleLowerCase().replace(/\s+/g, "_")
            if (key === 'symbols') {
                projectDetails.symbol = value ? value.replace('$', '') : project.name
                projectDetails.symbol = projectDetails.symbol === 'N/A' ? project.name : projectDetails.symbol
            } else {
                projectDetails.data[key] = value
            }
        })

        upcomingIDO.push(projectDetails)
    }
    fs.writeFileSync(path.resolve('./data/poolz.json'), JSON.stringify(upcomingIDO, null, 4));

    browser.close()
}

module.exports = {
    parsePoolz
}