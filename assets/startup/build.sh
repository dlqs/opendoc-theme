---
---
#!/bin/bash

echo 'Started script to generate PDFs'
echo 'Installing node dependencies'
npm i glob jsdom js-yaml p-all
if [[ (-z "${PDF_GEN_API_SERVER}") || (-z "${PDF_GEN_API_KEY}") ]]; then
  npm i html-pdf
fi
echo 'End script'
