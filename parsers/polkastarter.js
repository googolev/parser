const cheerio = require("cheerio");
const puppeteer = require('puppeteer');
const pretty = require("pretty");
const fs = require("fs");
const path = require("path");
const { createPage } = require("../utils/steals")

const URL = 'https://polkastarter.com'

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

const waitTillHTMLRendered = async (page, timeout = 30000) => {
    const checkDurationMsecs = 1000;
    const maxChecks = timeout / checkDurationMsecs;
    let lastHTMLSize = 0;
    let checkCounts = 1;
    let countStableSizeIterations = 0;
    const minStableSizeIterations = 3;
  
    while(checkCounts++ <= maxChecks){
      let html = await page.content();
      let currentHTMLSize = html.length; 
  
      let bodyHTMLSize = await page.evaluate(() => document.body.innerHTML.length);
  
      console.log('last: ', lastHTMLSize, ' <> curr: ', currentHTMLSize, " body html size: ", bodyHTMLSize);
  
      if(lastHTMLSize != 0 && currentHTMLSize == lastHTMLSize) 
        countStableSizeIterations++;
      else 
        countStableSizeIterations = 0; //reset the counter
  
      if(countStableSizeIterations >= minStableSizeIterations) {
        console.log("Page rendered fully..");
        break;
      }
  
      lastHTMLSize = currentHTMLSize;
      await page.waitFor(checkDurationMsecs);
    }  
  };


async function parsePolkastarter() {

    let upcomingIDO = []

    const browser = await puppeteer.launch({
        headless: false,
    });

    let page = await createPage(browser, `${URL}/projects`);

    await page.waitForSelector('.ps--project-card')

    const content = await page.content();
    const $ = cheerio.load(content);

    const projects = [];

    $('.ps--project-card').each(function (i, e) {
        const $card = cheerio.load(e)
        projects.push({
            link: `${URL}${$card('a').attr('href')}`,
            symbol: $card('.ps--project-card__info__project h3').text().replace('$', '')
        })
    })

    console.log(projects)

    for (let i = 0; i < projects.length; i++) {
        try {
            projectDetails = {}
            const project = projects[i]
            console.log(project)
            page.goto(project.link, {
                waitUntil: "networkidle2",
                timeout: 60000
            })

            await page.waitForSelector('#metrics tbody tr')
            let projectContent = await page.content()
            await waitTillHTMLRendered(page)
            await autoScroll(page)
            let [button] = await page.$x(`//button[contains(., 'Token Sale')]`);
            if (button) {
                await button.click();
            }
            await new Promise(resolve => setTimeout(resolve, 5000));
            
                let $projectPage = cheerio.load(projectContent)
            
                projectDetails.data = {}
                projectDetails.name = $projectPage('.ps--project-show__title').text()
                projectDetails.symbol = project.symbol
                projectDetails.url = project.link
                projectDetails.provider = 'POLKASTARTER'
                projectDetails.image = $projectPage('.ps--table__project-img').attr('src')
                console.log(projectDetails)
                $projectPage('#metrics tbody tr').each(function(i, e) {
                    let $row = cheerio.load(e)
                    let key = $row('.text-start').text().toLocaleLowerCase().trim().replace(/\s+/g, "_")
                    let value = $row('.text-end').text()
                    console.log(value)
                    projectDetails.data[key] = value
            })
            
        } catch (e) {
            console.log(e)
        }
        

        upcomingIDO.push(projectDetails)
    }
    fs.writeFileSync(path.resolve('./data/polkastarter.json'), JSON.stringify(upcomingIDO, null, 4));

    browser.close()
}

module.exports = {
    parsePolkastarter
}