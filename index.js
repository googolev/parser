const { parseDaomaker } = require('./parsers/daomaker')
const { parsePoolz } = require('./parsers/poolz')
const { parsePolkastarter } = require('./parsers/polkastarter')
const { parseRedkite } = require('./parsers/redkite')
const { parseSeedify } = require('./parsers/seedify')
const { parseTrustpad } = require('./parsers/trustpad')
const { loadToFirebase } = require('./utils/loadToFirebase')

async function main() {
    // await parseTrustpad()
    // await parseRedkite()
    // await parsePoolz()
    // await parseDaomaker()
    // await parsePolkastarter()
    // await parseSeedify()
    loadToFirebase()
}

main()