const cheerio = require("cheerio");
const puppeteer = require('puppeteer');
const fs = require("fs");
const path = require("path");

const URL = 'https://redkite.polkafoundry.com/#'

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

async function parseRedkite() {

    let upcomingIDO = []

    const browser = await puppeteer.launch({
        headless: false,
    });

    const page = await browser.newPage();

    await page.goto(`${URL}/dashboard`, {waitUntil: 'load', timeout: 0});

    await page.waitForSelector('h3 ~ .pools')

    const content = await page.content();
    const $ = cheerio.load(content);

    const projects = [];

    

    const $poolsContainer = cheerio.load($('h3 ~ .pools')[0])

    $poolsContainer('a').each(function (i, e) {
        const $card = cheerio.load(e)
        projects.push({
            link: $(e).attr('href').replace('#', ''),
            symbol: $card('.card-content__title p').attr('title').split('IDO')[1].replace('(', '').replace(')', '').trim(),
            name: $card('.card-content__title p').attr('title').split('IDO')[0].trim()
        })
    })

    for (let i = 0; i < projects.length; i++) {
        projectDetails = {}
        const project = projects[i]
        await page.goto(`${URL}${project.link}`)
        await page.waitForSelector('.dashboard section ul li span')
        // await waitTillHTMLRendered(page);
        await autoScroll(page);
        let projectContent = await page.content()
        let $projectPage = cheerio.load(projectContent)
        
        projectDetails.data = {}
        projectDetails.name = project.name
        projectDetails.symbol = project.symbol
        projectDetails.url = `${URL}${project.link}`
        projectDetails.provider = 'REDKITE'
        projectDetails.image = $projectPage('.dashboard img').attr('src')

        const $filtered = cheerio.load($projectPage('section ul').splice($projectPage('section ul').length - 2, $projectPage('section ul').length - 1))
        $filtered('li').each(function(i, e) {
            let $row = cheerio.load(e)
            let key = $row('span').first().text().trim().toLocaleLowerCase().replace(/\s+/g, "_")
            let value = $row('span').text().replace($row('span').first().text(), '').trim()
            projectDetails.data[key] = value
        })

        upcomingIDO.push(projectDetails)
    }
    fs.writeFileSync(path.resolve('./data/redkite.json'), JSON.stringify(upcomingIDO, null, 4));

    browser.close()
}

module.exports = {
    parseRedkite
}