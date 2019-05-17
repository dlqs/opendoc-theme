var fs = require('fs')
var pdf = require('html-pdf')
var glob = require('glob')
var path = require('path')
var jsdom = require('jsdom')
var sitePath = __dirname + '/../..'
//var html = fs.readFileSync(sitePath + '/export.html', 'utf8')
var options = {
    height: '594mm',        // allowed units: mm, cm, in, px
    width: '420mm',
    base: 'file://' + sitePath + '/',
    border: {
        right: '60px', // default is 0, units: mm, cm, in, px
       left: '60px',
    },
    header: {
        height: '80px',
    },
    footer: {
        height: '80px',
    },
}

console.log('base: ', options.base)
console.log('Creating pdf.....')

// creating exports of individual documents
var printIgnore = ['assets', 'files', 'iframes', 'images']
var docFolders = fs.readdirSync(sitePath).filter(function(filePath) {
    return fs.statSync(path.join(sitePath, filePath)).isDirectory() && 
        !printIgnore.includes(filePath)
})

// so that .html files on the top level will be concatenated as well
docFolders.push('') 

docFolders.forEach(function(folder) {
    // find all the folders containing html files
    var folderPath = path.join(sitePath, folder)

    var htmlFilePaths = glob.sync(path.join(folderPath, '*.html'))

    // Remove folders without HTML files (don't want empty pdfs)
    if (htmlFilePaths.length === 0) {
        return
    }

    // If index.html exists, bring it to the front
    for (let i=0; i<htmlFilePaths.length; i++) {
        const filePath = htmlFilePaths[i]
        if (filePath.endsWith('index.html')) {
            htmlFilePaths.unshift(htmlFilePaths.splice(i, 1)[0])
        }
    }

    const exportHtmlFile = fs.readFileSync(sitePath + '/../_layouts/docprint.html')
    const exportDom = new jsdom.JSDOM(exportHtmlFile)
    const exportDomMain = exportDom.window.document.getElementById('main-content')
    
    htmlFilePaths.forEach(function(filePath) {
        const file = fs.readFileSync(filePath)
        const dom = new jsdom.JSDOM(file)

        // Remove iframes because html-pdf will not work with them
        const iframes = dom.window.document.querySelectorAll('iframe')
        for (let i=0; i<iframes.length; i++) {
            iframes[i].parentNode.removeChild(iframes[i])
        }
    
        // Concat all the main-content divs
        try {
            const oldNode = dom.window.document.getElementById('main-content')
            const newNode = dom.window.document.importNode(oldNode, true)
            exportDomMain.appendChild(newNode)
        } catch (error) {
            console.log('Failed to append Node, skipping: ' + error)
        }
    })

    pdf.create(exportDom.serialize(), options).toFile(path.join(folderPath, 'export.pdf'), function (err, res) {
        if (err) return console.log(err)
        console.log('Pdf created at: ', res.filename)
    })
})
