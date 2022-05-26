function removeAdTemplates(spreadsheetId, rowData, sheetId) {
  // Remove ad templates

  let removeRequests = [];

  for(let i = 1; i < rowData.length; i++) {
    const row = rowData[i];

    if (row.values && row.values.length > 5 && row.values.length !== 10) {
      removeRequests.push(createDeleteDimensionRequest(sheetId, i - removeRequests.length, 1, "ROWS"));
    } 
  }
  if(removeRequests.length > 0) {
    batchUpdate(spreadsheetId, removeRequests);
  }
}
  
function removeEmptyRows(spreadsheetId, rowData, sheetId) {
  let removeRequests = [];

  for(let i = 1; i < rowData.length; i++) {
    const row = rowData[i];

    if (rowIsEmpty(row)) {
      removeRequests.push(createDeleteDimensionRequest(sheetId, i - removeRequests.length, 1, "ROWS"));
    } 
  }
  if(removeRequests.length > 0) {
    batchUpdate(spreadsheetId, removeRequests);
  }
}

function removeExtraCols(spreadsheetId, rowData, sheetId) {
  let removeRequests = [];

  // deletes extra columns. deletes column 5, 5 times because batchUpdate processes requests in order.
  removeRequests.push(createDeleteDimensionRequest(sheetId, 9, rowData.length, "COLUMNS"));
  removeRequests.push(createDeleteDimensionRequest(sheetId, 8, rowData.length, "COLUMNS"));
  removeRequests.push(createDeleteDimensionRequest(sheetId, 7, rowData.length, "COLUMNS"));
  removeRequests.push(createDeleteDimensionRequest(sheetId, 6, rowData.length, "COLUMNS"));
  removeRequests.push(createDeleteDimensionRequest(sheetId, 5, rowData.length, "COLUMNS"));
  
  if(removeRequests.length > 0) {
    batchUpdate(spreadsheetId, removeRequests);
  }
}

function insertAds(spreadsheetId, sheetId, rowData) {
  /**
   * 
   * adGroupIndex Obj {
   * 
   *  campaign,
   *  adGroup,
   *  A1index,
   * 
   * }
   * 
   */
    let adGroupIndexes = [];
  
    for (let i = 1; i < rowData.length; i++) {
      const row = rowData[i];
                
      //skips empty rows
      if (!rowIsEmpty(row)) {
        const campaign = row.values[0].userEnteredValue.stringValue;
        const adGroup = row.values[1].userEnteredValue.stringValue;
        const index = i;
  
        const adGroupIndex = {campaign, adGroup, index}
        if (!indexIncluded(adGroupIndexes, adGroupIndex)){
          adGroupIndexes.push(adGroupIndex);
        } 
      }
    }
  
    let requests = [];
  
    for (let i = 0; i < adGroupIndexes.length; i++) {         
      const index = adGroupIndexes[i].index;
      requests.push(createInsertDimensionRequest(sheetId, index + i, 1));
      requests.push(createUpdateCellsRequest(sheetId, index + i, ["test", "test2", "test3", "test4", "test5" ] ))
    }
    
    batchUpdate(spreadsheetId, requests);
}

function rowIsEmpty(row) {
  if(Object.keys(row).length === 0) {
    return true;
  }

  for(let i = 1; i < row.values.length; i++) {
    if(row.values[i].hasOwnProperty('userEnteredValue')) {
      return false;
    }
  }

  return true;
}

function getAdCopyRowData(sheet, account, language, type) {
  let adCopyRows = [];
  const rows = sheet.data[0].rowData;

  for(let i = 0; i < rows.length; i++) {
    if(rows[i].values[1].hasOwnProperty('userEnteredValue')) {
      const adAccount = rows[i].values[1].userEnteredValue.stringValue;
      const adLanguage = rows[i].values[2].userEnteredValue.stringValue;
      const adType = rows[i].values[3].userEnteredValue.stringValue;
      if(adAccount === account && adLanguage === language && adType === type)  {
        adCopyRows.push(rows[i])
      }
    } 
  }

  return adCopyRows;
}

function getSheetIndexesFromAccountDataSpreadsheet(spreadsheet) {
  let adCopySheetIndex = -1;
  let URLDataSheetIndex = -1;

  if(spreadsheet.sheets[0].properties.title === "Ad Copy") {
    adCopySheetIndex = 0;
    URLDataSheetIndex = 1;
  } else if(spreadsheet.sheets[1].properties.title === "Ad Copy") {
    adCopySheetIndex = 1;
    URLDataSheetIndex = 0;
  } else {
    location.reload()
    alert("Account Data Spreadsheet may only have two sheets, named Ad Copy and URL Data")
  }

  return [adCopySheetIndex, URLDataSheetIndex];
}

async function processRequest(buildoutSpreadsheet, accountDataSpreadsheet) {
  if(accountDataSpreadsheet.sheets.length > 2) {
    location.reload();
    alert("Account Data Spreadsheet may only have two sheets, named Ad Copy and URL Data")
  }

  const [adCopySheetIndex, URLDataSheetIndex] = getSheetIndexesFromAccountDataSpreadsheet(accountDataSpreadsheet);
  const adCopySheet = accountDataSpreadsheet.sheets[adCopySheetIndex];
  const urlDataSheet = accountDataSpreadsheet.sheets[URLDataSheetIndex];

  const accounts = getAccountsURLDataFromSheet(urlDataSheet);
  let spreadsheets = [];
  console.log(accounts)

  for(let i = 0; i < accounts.length; i++) {
    const accountBuildoutSpreadsheet = await createAccountBuildoutSpreadsheet(buildoutSpreadsheet, adCopySheet, urlDataSheet, accounts[i]);
    spreadsheets.push(accountBuildoutSpreadsheet);
  }
  
  for(let i = 0; i < spreadsheets.length; i++) {
    const newSpreadsheet = await createNewDocument(spreadsheets[i]);

    const url = newSpreadsheet.spreadsheetUrl;
    window.open(url, '_blank');
  }
}

function getAccountsURLDataFromSheet(sheet) {
  let accounts = [];

  //skip header
  for(let i = 1; i < sheet.data[0].rowData.length; i++) {
    const row = sheet.data[0].rowData[i];
    if(rowIsEmpty(row)) continue;
    const accountTitle = row.values[0].userEnteredValue.stringValue;
    const thirdLevelDomain = row.values[3].userEnteredValue.stringValue;

    const accountData = { accountTitle, thirdLevelDomain }
    console.log(accountTitle)
    // sorry
    let included = false;
    for (let i = 0; i < accounts.length; i++) {
      if(accounts[i].accountTitle === accountData.accountTitle){
        included = true;
      }
    }
    if(!included) {
      accounts.push(accountData);
    }
  }

  return accounts;
}

function getAccountCampaignsFromSheet(sheet, account) {
  let campaigns = [];

  //skip header
  for(let i = 1; i < sheet.data[0].rowData.length; i++) {
    const row = sheet.data[0].rowData[i];
    if(rowIsEmpty(row)){
      break;
    }
    const campaign = row.values[3].userEnteredValue.stringValue;
    const rowAccount = row.values[1].userEnteredValue.stringValue;
    if(rowAccount === account.accountTitle && !campaigns.includes(campaign)) {
      campaigns.push(campaign);
    }
  }

  return campaigns;
}

function getAccountLanguagesFromSheet(sheet, account) { 
  let languages = [];

  //skip header
  for(let i = 1; i < sheet.data[0].rowData.length; i++) {
    const row = sheet.data[0].rowData[i];
    if(rowIsEmpty(row)){
      break;
    }
    const language = row.values[2].userEnteredValue.stringValue;
    const rowAccount = row.values[1].userEnteredValue.stringValue;

    if(rowAccount === account.accountTitle && !languages.includes(language)) {
      languages.push(language);
    }
  }

  return languages;
}

function getPostfixFromSheet(sheet, account, language) {
  //skip header
  for(let i = 1; i < sheet.data[0].rowData.length; i++) {
    const row = sheet.data[0].rowData[i];
    if(rowIsEmpty(row)){
      break;
    } 
    const rowLanguage = row.values[1].userEnteredValue.stringValue;
    const rowAccount = row.values[0].userEnteredValue.stringValue;
    const postfix = row.values[2].userEnteredValue.stringValue;

    if(rowAccount === account.accountTitle && rowLanguage === language) {
      return postfix;
    }
  }

  return "ERROR";
}

async function createAccountBuildoutSpreadsheet(buildoutSpreadsheet, adCopySheet, urlDataSheet, account) {
  const rawHeaderRow = ["Campaign", "Ad Group", "Keyword", "Criterion Type", "Final URL", "Labels", "Ad type", "Status", "Description Line 1", "Description Line 2", "Headline 1", "Headline 2", "Headline 3", "Path 1", "Headline 4", "Headline 5", "Description 1", "Description 1 position", "Description 2", "Description 3", "Max CPC", "Flexible Reach"];
  //adds header row 
  let masterSpreadsheet = createSpreadSheet(account.accountTitle + " Buildout", rawHeaderRow);
  const languages = getAccountLanguagesFromSheet(adCopySheet, account);
  const campaigns = getAccountCampaignsFromSheet(adCopySheet, account);
  //for every brand
  for (let i = 0; i < buildoutSpreadsheet.sheets.length; i++) {
    for (let j = 0; j < languages.length; j++) {
      for (let k = 0; k < campaigns.length; k++) {
        const language = languages[j];
        const campaign = campaigns[k]
        //console.log(account.accountTitle, "Brand: " + i , languages[j], campaigns[k])
        const sheet = buildoutSpreadsheet.sheets[i];
        const rawRowData = sheet.data[0].rowData;
        const rowData = rawRowData.slice(1); //removes header from each brand buildout
        
        //create new copy that we can edit
        let keywordRowData = [];
        //Update third level domain and campaign title
        for (let i = 0; i < rowData.length; i++) {
          //Campaign title
          if(isCellEmpty(rowData[i].values[0])) break;
          let newRowData = copyRowData(rowData[i])
          const rawCampaignTitle = newRowData.values[0].userEnteredValue.stringValue;
          
          const accountCampaignTitle = languages.length < 2 ? (rawCampaignTitle + " > " + account.accountTitle + " > " + campaign) : (rawCampaignTitle + " > " + account.accountTitle + " > " + campaign + " (" + language + ")");
          newRowData.values[0].userEnteredValue.stringValue = accountCampaignTitle;
          keywordRowData.push(newRowData);
        }

        for(let i = 0; i < keywordRowData.length; i++) {
          //Final Url
          if (keywordRowData[i].values.length > 4 && keywordRowData[i].values[4].hasOwnProperty('userEnteredValue')) {
            const rawFinalURL = keywordRowData[i].values[4].userEnteredValue.stringValue;
            const accountFinalURL = rawFinalURL.replace("www.", account.thirdLevelDomain + ".");
            keywordRowData[i].values[4].userEnteredValue.stringValue = accountFinalURL;
          }
        }

        //Ad Groups
        const campaignTitle = keywordRowData[0].values[0].userEnteredValue.stringValue;
        const adGroupTitle = keywordRowData[0].values[1].userEnteredValue.stringValue;
        const finalURL = keywordRowData[0].values[4].userEnteredValue.stringValue;

        const adGroupRowData = createAdGroupRowData(campaignTitle, adGroupTitle, "Active", "Active", campaign)
        masterSpreadsheet.sheets[0].data[0].rowData.push(adGroupRowData);

        //Ads
        //TODO
        const adCopyRowData = getAdCopyRowData(adCopySheet, account.accountTitle, language, campaign);
        const brandTitle = adGroupTitle.slice(8);
        const path = createPath(brandTitle);

        for(let i = 0; i < adCopyRowData.length; i++) {
          const adRowValues = [
            campaignTitle, 
            adGroupTitle, 
            "", 
            "", 
            finalURL,
            !isCellEmpty(adCopyRowData[i].values[4]) ? adCopyRowData[i].values[4].userEnteredValue.stringValue : "", // labels
            !isCellEmpty(adCopyRowData[i].values[5]) ? adCopyRowData[i].values[5].userEnteredValue.stringValue : "", // ad type
            !isCellEmpty(adCopyRowData[i].values[6]) ? adCopyRowData[i].values[6].userEnteredValue.stringValue : "", // status
            !isCellEmpty(adCopyRowData[i].values[7]) ? adCopyRowData[i].values[7].userEnteredValue.stringValue : "", // description line 1
            !isCellEmpty(adCopyRowData[i].values[8]) ? adCopyRowData[i].values[8].userEnteredValue.stringValue : "", // description line 2
            !isCellEmpty(adCopyRowData[i].values[9]) ? createHeadline1(brandTitle, adCopyRowData[i].values[9].userEnteredValue.stringValue) : "", // headline 1 TODO
            !isCellEmpty(adCopyRowData[i].values[10]) ? adCopyRowData[i].values[10].userEnteredValue.stringValue : "", // headline 2
            !isCellEmpty(adCopyRowData[i].values[11]) ? adCopyRowData[i].values[11].userEnteredValue.stringValue : "", // headline 3
            path, 
            !isCellEmpty(adCopyRowData[i].values[12]) ? adCopyRowData[i].values[12].userEnteredValue.stringValue : "", // headline 4
            !isCellEmpty(adCopyRowData[i].values[13]) ? adCopyRowData[i].values[13].userEnteredValue.stringValue : "", // headline 5
            !isCellEmpty(adCopyRowData[i].values[14]) ? adCopyRowData[i].values[14].userEnteredValue.stringValue : "", // description 1
            !isCellEmpty(adCopyRowData[i].values[15]) ? adCopyRowData[i].values[15].userEnteredValue.stringValue : "", // description 1 position
            !isCellEmpty(adCopyRowData[i].values[16]) ? adCopyRowData[i].values[16].userEnteredValue.stringValue : "", // description 2
            !isCellEmpty(adCopyRowData[i].values[17]) ? adCopyRowData[i].values[17].userEnteredValue.stringValue : "", // description 3
            "", // max cpc
            "", // flexible reach
          ];
          const adRow = createRowData(adRowValues);
          handleFieldLengthLimits(adRow);
        
          masterSpreadsheet.sheets[0].data[0].rowData.push(adRow);
        }

        //Keywords  
        // add country specific keyword postfix
        for(let i = 0; i < keywordRowData.length; i++) { 
          if (keywordRowData[i].values.length > 4 && keywordRowData[i].values[4].hasOwnProperty('userEnteredValue')) {
            const rawFinalURL = keywordRowData[i].values[4].userEnteredValue.stringValue;
            const postfix = getPostfixFromSheet(urlDataSheet, account, language);
            const accountFinalURL = rawFinalURL + (rawFinalURL.indexOf('?') >= 0 ? "&" + postfix : "?" + postfix);
            keywordRowData[i].values[4].userEnteredValue.stringValue = accountFinalURL;
 
            masterSpreadsheet.sheets[0].data[0].rowData.push(keywordRowData[i]);
          }
        }
      }
    }
  }
  return masterSpreadsheet;
}

function createHeadline1(brandTitle, headline1) {
  const index = headline1.indexOf('Brand');
  const newString = headline1.substr(0, index) + brandTitle + headline1.substr(index + 5);
  console.log(newString)
  return newString;
}

function createPath(brandTitle) {
  let path = "";
  if(brandTitle.indexOf(" ") > -1) {
    // TODOL remove special charachters
    const tokens = brandTitle.split(/(\s+)/);
    
    //ads token with a "-" delimeter
    for (let i = 0; i < tokens.length - 1; i++) {
      if (tokens[i] === " ") continue;
      path += tokens[i] + "-"
    }

    //adds final token without delimiter
    path += tokens[tokens.length - 1];
  } else {
    path = brandTitle;
  }
  if(path.length > 15) {
    console.log("ERROR: PATH OVER 15 CHARACHTERS PLEASE CHECK")
  }

  return path;
}

function isCellEmpty(cell) {
  return !cell.hasOwnProperty('userEnteredValue')
}

/**potentially hazasrdous */
function createAdGroupRowData(campaign, adGroup, campaignStatus, adGroupStatus, campaignType) {
  const flexibleReach = campaignType === "Acquisition" ? "Audience segments;Genders;Ages;Parental status;Household incomes" : "Genders;Ages;Parental status;Household incomes";
  return createRowData([campaign, adGroup, "", "", "" , "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "0.5", flexibleReach])
}

function indexIncluded (indexes, index) {
  for (let i = 0; i < indexes.length; i++) {
    if (indexes[i].campaign === index.campaign && indexes[i].adGroup === index.adGroup) {
      return true;
    }
  }

  return false;
}

function indexToA1(row, col) {
  const rowNum = row + 1;
  const colLetter = toLetters(col + 1) ;

  return colLetter + String(rowNum);
}

function toLetters(num) {
  "use strict";
  var mod = num % 26,
      pow = num / 26 | 0,
      out = mod ? String.fromCharCode(64 + mod) : (--pow, 'Z');
  return pow ? toLetters(pow) + out : out;
}

function getDocumentIdFromUrl (url) {
  const start = url.search("/spreadsheets/d/") + 16;
  const end = start + 44;
  const documentId = url.slice(start, end);

  return documentId;
}

async function getSpreadsheet(url) {
  const spreadsheetId = getDocumentIdFromUrl(url);
  let res = null;

  await gapi.client.sheets.spreadsheets.get({
    spreadsheetId,
    ranges: [],
    includeGridData: true                                
  }).then((response) => {
    res = response.result;
  });

  return res;
}

function createInsertDimensionRequest(sheetId, index, numRows) {
  const request = {
    insertDimension: {
      range: {
        sheetId,
        dimension: "ROWS",
        startIndex: index,
        endIndex: index + numRows
      },
      inheritFromBefore: true
    }
  }

  return request;
}

function createAppendCellsRequest(sheetId, rows) {
  return {
    appendCells: {
      sheetId,
      rows,
      fields:"userEnteredValue/stringValue"
    }
  }
}

function createDeleteDimensionRequest(sheetId, index, numCells, dimension) {
  return {
    deleteDimension: {
      range: {
        sheetId,
        dimension,
        startIndex: index,
        endIndex: index + numCells
      }
    }
  }
}

function createUpdateCellsRequest(sheetId, index, values) {
  const row = createRowData(values);
  return {
    updateCells: {
      rows: [
        row
      ],
      fields: "userEnteredValue/stringValue",
      range: {
        sheetId,
        startColumnIndex: 0,
        endColumnIndex: values.length,
        startRowIndex: index,
        endRowIndex: index + 1
      }
    }
  }
}

/**
 * Batch update wrapper
 */
function batchUpdate(spreadsheetId, requests) {
  gapi.client.sheets.spreadsheets.batchUpdate({
    spreadsheetId                        
  }, {
    requests
  }).then((response) => {
    console.log(response);
  });
}
function copyRowData(row) {
  let values = [];
  for(let i = 0; i < row.values.length; i++) {
    if(row.values[i].hasOwnProperty("userEnteredValue")) {
      values.push(row.values[i].userEnteredValue.stringValue);
    }
  }

  return createRowData(values);
}
//Takes an array of Row Data
function createRowData(values){
  var rowData = {
    values: []
  } 

  for (value in values){
    rowData.values.push({
      userEnteredValue: {
        stringValue: values[value]
      },
      userEnteredFormat: {
        backgroundColor: {
          red: 1,
          green: 1,
          blue: 1
        }
      } 
    })
  }

  return rowData;
}

function handleFieldLengthLimits(rowData) {
  //10 and 13
  const headline1 = rowData.values[10].userEnteredValue.stringValue;
  if(headline1.length > 40) {
    markCellRed(rowData.values[10])
  }

  const path1 = rowData.values[13].userEnteredValue.stringValue;
  if(path1.length > 15) {
    markCellRed(rowData.values[13])
  }
  
}

//objects are passed by reference
function markCellRed(cell) {
  cell.userEnteredFormat.backgroundColor.green = 0;
  cell.userEnteredFormat.backgroundColor.blue = 0;
}

async function createNewDocument(spreadsheet) {
  let res = null;

  await gapi.client.sheets.spreadsheets.create(spreadsheet)
  .then((response => {
    res = response.result
  }));

  return res;
}

function createSpreadSheet(title, headers) {
  var spreadSheet = {
      properties: {
        title
      },
      sheets: [{
        data: [{
          //header row
          rowData: [createRowData(headers)]
        }]
      }]
    }

  return spreadSheet;
}

function createBrandBuildoutTemplateSpreadsheet(campaign, adGroup, baseKeyword, finalUrl){
var spreadSheet = createSpreadSheet(baseKeyword, ["Campaign", "Ad Group", "Keyword", "Match Type", "Final URL"]);

//Product Keywords
for(keyword in PRODUCT_KEYWORDS) {
  var keywordString = PRODUCT_KEYWORDS[keyword].prefix + baseKeyword + PRODUCT_KEYWORDS[keyword].suffix;
  var row = createRowData([campaign, adGroup, keywordString, "Phrase", finalUrl]);
  spreadSheet.sheets[0].data[0].rowData.push(row);
}

//Domain Keywords
//check for simple domain
if (baseKeyword.indexOf(" ") < 0) {
  for(keyword in SIMPLE_DOMAIN_KEYWORDS) {
    var keywordString = SIMPLE_DOMAIN_KEYWORDS[keyword].prefix + baseKeyword + SIMPLE_DOMAIN_KEYWORDS[keyword].suffix;
    var row = createRowData([campaign, adGroup, keywordString, "Phrase", finalUrl]);
    spreadSheet.sheets[0].data[0].rowData.push(row);
  }
} else {
  for(keyword in COMPOUND_DOMAIN_KEYWORDS) {
    var keywordString = COMPOUND_DOMAIN_KEYWORDS[keyword].prefix + baseKeyword + COMPOUND_DOMAIN_KEYWORDS[keyword].suffix;
    var row = createRowData([campaign, adGroup, keywordString, "Phrase", finalUrl]);
    spreadSheet.sheets[0].data[0].rowData.push(row);
  }

  //remove whitespace
  var baseKeywordNoSpace = baseKeyword.replace(/\s+/g, '');

  for(keyword in SIMPLE_DOMAIN_KEYWORDS) {
    var keywordString = SIMPLE_DOMAIN_KEYWORDS[keyword].prefix + baseKeywordNoSpace + SIMPLE_DOMAIN_KEYWORDS[keyword].suffix;
    var row = createRowData([campaign, adGroup, keywordString, "Phrase", finalUrl]);
    spreadSheet.sheets[0].data[0].rowData.push(row);
  }
}

//Empty Brand Keywords
for (var i =0; i < 50; i++) {
  var row = createRowData([campaign, adGroup, baseKeyword, "Phrase", finalUrl]);
  spreadSheet.sheets[0].data[0].rowData.push(row);
}

//Negative Keywords

for (keyword in NEGATIVE_KEYWORDS) {
  var row = createRowData([campaign, adGroup, NEGATIVE_KEYWORDS[keyword].keyword, NEGATIVE_KEYWORDS[keyword].match_type, ""])
  spreadSheet.sheets[0].data[0].rowData.push(row);
}

//Empty Negative Keywords

for (var i =0; i < 5; i++) {
  var row = createRowData([campaign, adGroup, "", "Negative Broad", ""]);
  spreadSheet.sheets[0].data[0].rowData.push(row);
}

return spreadSheet;
}

function consoleLogSpreadSheet(spreadSheet) {
  const rowData = spreadSheet.sheets[0].data[0].rowData;
  for (const rowIndex in rowData) {
    const row = rowData[rowIndex].values;
    var rowText = "";  
    for (cellIndex in row) {
      const cell = row[cellIndex];

      if (!cell.hasOwnProperty('userEnteredValue')) {
        rowText += " ";
      } else {
        rowText += cell.userEnteredValue.stringValue + " ";
      }
    }
    console.log(rowText)
  }
}