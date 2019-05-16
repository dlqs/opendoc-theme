var fs = require('fs')
var pdf = require('html-pdf')
var glob = require('glob')
var path = require('path')
var jsdom = require('jsdom')
var sitePath = __dirname + '/../..'
var html = fs.readFileSync(sitePath + '/export.html', 'utf8');
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
};

console.log('Creating pdf.....')
console.log('base: ', options.base)

// creating export of all html files concatenated together
pdf.create(html, options).toFile('./_site/export.pdf', function (err, res) {
    if (err) return console.log(err)
    console.log('Pdf created at: ', res)
})

// creating exports of individual documents
var printIgnore = ['assets', 'files', 'iframes', 'images']
var docFolders = fs.readdirSync(sitePath).filter(function(filePath) {
    return fs.statSync(path.join(sitePath, filePath)).isDirectory() && 
        !printIgnore.includes(filePath)
})


docFolders.forEach(function(folder) {
    // find all the folders containing html files
    var folderPath = path.join(sitePath, folder)
    var htmlFilePaths = glob.sync(path.join(folderPath, '*.html'))
    if (htmlFilePaths.length === 0) {
        return
    }

    exportHtmlFile = jsdom.JSDOM.fromFile(sitePath + '/../_layouts/docprint.html')
        .then(function(exportDom) {
            var promises = []
            htmlFilePaths.forEach(function(filePath) {
                promises.push(
                    jsdom.JSDOM.fromFile(filePath).then(function(dom) {
                        // Concat all the main-content divs
                        exportDom.window.document.body.appendChild(
                            dom.window.document.getElementById('main-content')
                    )
                }))
            })
            // Wait for all concats to be completed
            Promise.all(promises).then(function() {
                pdf.create(exportDom.serialize(), options).toFile(path.join(folderPath, 'export.pdf'), function (err, res) {
                    if (err) return console.log(err)
                    console.log('Pdf created at: ', res.filename)
                })
            })
        })
})
