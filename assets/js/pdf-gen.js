const fs = require('fs')
const pdf = require('html-pdf')
const glob = require('glob')
const path = require('path')
const jsdom = require('jsdom')
const MT = require('mark-twain')
const jsyaml = require('js-yaml')
const sitePath = __dirname + '/../..'
const options = {
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
// List of top-level folder names which are not documents
const printIgnore = ['assets', 'files', 'iframes', 'images']

const main = () => {
    console.log('Base options: ', options.base)
    // creating exports of individual documents
    const docFolders = getDocumentFolders(sitePath, printIgnore)
    exportPdfDocFolders(sitePath, docFolders)
    exportPdfTopLevelDocs(sitePath)
}

const exportPdfTopLevelDocs = (sitePath) => {
    let htmlFilePaths = glob.sync(path.join(sitePath, '*.html'))
    // Remove folders without HTML files (don't want empty pdfs)
    if (htmlFilePaths.length === 0) return
    const configFilepath = path.join(sitePath, '..', '_config.yml')
    if (configFileHasValidOrdering(configFilepath)) {
        const configYml = yamlToJs(configFilepath)
        const order = mapSectionNameToHtmlFilename(configYml, sitePath)
        htmlFilePaths = reorderHtmlFilePaths(htmlFilePaths, order)
    }
    createPdf(htmlFilePaths, sitePath)
}

const exportPdfDocFolders = (sitePath, docFolders) => {
    docFolders.forEach(function (folder) {
        // find all the folders containing html files
        const folderPath = path.join(sitePath, folder)
        let htmlFilePaths = glob.sync(path.join(folderPath, '*.html'))

        // Remove folders without HTML files (don't want empty pdfs)
        if (htmlFilePaths.length === 0) return

        const indexFilepath = path.join(sitePath, '..', folder, 'index.md')
        if (indexFileHasValidOrdering(indexFilepath)) {
            const configMd = markdownToJs(indexFilepath)
            const order = configMd.meta.order // names of html files without the .html
            htmlFilePaths = reorderHtmlFilePaths(htmlFilePaths, order)
        }
        createPdf(htmlFilePaths, folderPath)
    })
}

// Concatenates the contents in .html files, and outputs export.pdf in the specified output folder
const createPdf = (htmlFilePaths, outputFolderPath) => {
    // docprint.html is our template to build pdf up from.
    const exportHtmlFile = fs.readFileSync(sitePath + '/../_layouts/docprint.html')
    const exportDom = new jsdom.JSDOM(exportHtmlFile)
    const exportDomMain = exportDom.window.document.getElementById('main-content')

    htmlFilePaths.forEach(function (filePath) {
        const file = fs.readFileSync(filePath)
        const dom = new jsdom.JSDOM(file)

        // Remove iframes because html-pdf will not work with them
        const iframes = dom.window.document.querySelectorAll('iframe')
        for (let i = 0; i < iframes.length; i++) {
            iframes[i].parentNode.removeChild(iframes[i])
        }

        // Concat all the id:main-content divs
        try {
            const oldNode = dom.window.document.getElementById('main-content')
            const newNode = dom.window.document.importNode(oldNode, true)
            exportDomMain.appendChild(newNode)
        } catch (error) {
            console.log('Failed to append Node, skipping: ' + error)
        }
    })

    pdf.create(exportDom.serialize(), options).toFile(path.join(outputFolderPath, 'export.pdf'), (err, res) => {
        if (err) return console.log(err)
        console.log('Pdf created at: ', res.filename)
    })
}

// Returns a list of the valid document (i.e. folder) paths
const getDocumentFolders = (sitePath, printIgnore) => {
    return fs.readdirSync(sitePath).filter(function (filePath) {
        return fs.statSync(path.join(sitePath, filePath)).isDirectory() &&
            !printIgnore.includes(filePath)
    })
}

const configFileHasValidOrdering = (configFilepath) => {
    try {
        const configYml = yamlToJs(configFilepath)
        return 'section_order' in configYml
    } catch (error) {
        return false
    }
}

// Returns true if index.md exists and contains order field
const indexFileHasValidOrdering = (indexFilepath) => {
    try {
        const configMd = markdownToJs(indexFilepath)
        return 'order' in configMd['meta']
    } catch (error) {
        return false
    }
}

// Mutates the htmlFilepath array to match order provided in order
const reorderHtmlFilePaths = (htmlFilePaths, order) => {
    for (let i=0; i<order.length; i++) {
        const name = path.basename(order[i], '.md')
        for (let j=0; j<htmlFilePaths.length; j++) {
            if (path.basename(htmlFilePaths[j], '.html') === name) {
                swap(htmlFilePaths, i, j)
            }
        }
    }
    return htmlFilePaths
}

// Section names correspond to titles at the top of .md files in source folder
const mapSectionNameToHtmlFilename = (configYml, sitePath) => {
    const section_order = configYml.section_order
    const mdFiles = glob.sync(path.join(sitePath, '..', '*.md'))
    const newSectionorder = []
    section_order.forEach((title) => {
        for (let i=0; i<mdFiles.length; i++) {
            try {
                const mdTitle = markdownToJs(mdFiles[i]).meta.title
                if (title === mdTitle) {
                    newSectionorder.push(mdFiles[i])
                }
            } catch (error) {
                continue // did not contain field
            }
        }
    })
    return newSectionorder
}

// Mutates array by swapping items at index i and j
const swap = (arr, i, j) => {
    const temp = arr[i]
    arr[i] = arr[j]
    arr[j] = temp
}

// converts .md to JS Object
const markdownToJs = (filepath) => {
    const configFile = fs.readFileSync(filepath)
    return MT(configFile.toString())
}

const yamlToJs = (filepath) => {
    return jsyaml.safeLoad(fs.readFileSync(filepath))
}

main()
