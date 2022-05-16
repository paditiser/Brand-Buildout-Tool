var authorizeButton = document.getElementById('authorize_button');
var signoutButton = document.getElementById('signout_button');
var createBrandBuildoutButton = document.getElementById('create_brand_buildout_button');
var createBrandsOfTheWeekBuildoutButton = document.getElementById('create_brands_of_the_week_buildout_button');
var createBrandCountryBuildoutButton = document.getElementById('create_brand_country_buildout_button');
/**
 *  On load, called to load the auth2 library and API client library.
 */
function handleClientLoad() {
  gapi.load('client:auth2', initClient);
}

/**
 *  Initializes the API client library and sets up sign-in state
 *  listeners.
 */
function initClient() {
  gapi.client.init({
    apiKey: API_KEY,
    clientId: CLIENT_ID,
    discoveryDocs: DISCOVERY_DOCS,
    scope: SCOPES
  }).then(function () {
    // Listen for sign-in state changes.
    gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);

    // Handle the initial sign-in state.
    updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());

    // Initiate Buttons
    authorizeButton.onclick = handleAuthClick;
    signoutButton.onclick = handleSignoutClick;
    createBrandBuildoutButton.onclick = handleCreateBrandClick;
    createBrandCountryBuildoutButton.onclick = handleCreateCountryBuildoutsClick;
    
  }, function(error) {
    appendPre(JSON.stringify(error, null, 2));
  });
}

/**
 *  Called when the signed in status changes, to update the UI
 *  appropriately. After a sign-in, the API is called.
 */
function updateSigninStatus(isSignedIn) {
  if (isSignedIn) {
    authorizeButton.style.display = 'none';
    signoutButton.style.display = 'block';

  } else {
    authorizeButton.style.display = 'block';
    signoutButton.style.display = 'none';
  }
}

// =======================
// Button Handling
// =======================

/**
 *  Sign in the user upon button click.
 */
function handleAuthClick(event) {
  gapi.auth2.getAuthInstance().signIn();
}

/**
 *  Sign out the user upon button click.
 */
function handleSignoutClick(event) {
  gapi.auth2.getAuthInstance().signOut();
}

/**
 * 
 * Create Brand Template on Click 
 */
function handleCreateBrandClick(e) {
  var formData = readFormData();

  var spreadSheet = createBrandBuildoutSpreadSheet(formData.campaign, formData.adGroup, formData.baseKeyword, formData.finalUrl);

  consoleLogSpreadSheet(spreadSheet);
  //create spreadsheet
  gapi.client.sheets.spreadsheets.create(spreadSheet)
  .then((response => {
    window.open(response.result.spreadsheetUrl, '_blank');
  }));
}

/**
 * 
 * Create Country buildouts on Click 
 */
async function handleCreateCountryBuildoutsClick(e) {
  const formData = readAccountAutogeneratorData();
  const documentId = getDocumentIdFromUrl(formData.masterBrandBuildoutSpreadsheet);
  const account = formData.countries[0];
  
  const spreadsheet = await getSpreadsheet(documentId)
  const newSpreadsheet = processSpreadSheet(spreadsheet, account)
}

// TEMPORARY ONLY
function removeAdTemplates(spreadsheetId, rowData, sheetId) {
  // Remove ad templates

  let removeRequests = [];

  for(let i = 1; i < rowData.length; i++) {
    const row = rowData[i];
    console.log(row)
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
    console.log(row)
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
       console.log(row)
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

async function getAccountAdCopySheet(account) {
  const accountCopySheetURL = "https://docs.google.com/spreadsheets/d/1dCx3OIkVv6Mdt9xEuOnJwr26UHy9lFqzZgkgq4PA3mM/edit#gid=0";
  const documentId = getDocumentIdFromUrl(accountCopySheetURL);
  const spreadsheet = await getSpreadsheet(documentId);
  console.log(spreadsheet)

  return spreadsheet.sheets[0];
}

function getAdCopyRowDataByType(sheet, type) {
  console.log(sheet);
  let adCopyRows = [];
  const rows = sheet.data[0].rowData;
  for(let i = 0; i < rows.length; i++) {
    if(rows[i].values[1].hasOwnProperty('userEnteredValue')) {
      const adType = rows[i].values[1].userEnteredValue.stringValue;
      if(adType === type)  {
        adCopyRows.push(rows[i])
      }
    }
  }

  return adCopyRows;
}

/**
 * ACQUISITION ONLY FOR NOW
 * @param {*} spreadSheet 
 * @returns 
 */
async function processSpreadSheet(spreadsheet, account) {
  const masterSpreadsheetId = spreadsheet.spreadsheetId;
  const masterSheetId = spreadsheet.sheets[0].properties.sheetId;
  const rawHeaderRow = ["Campaign", "Ad Group", "Keyword", "Criterion Type", "Final URL", "Labels", "Ad type", "Campaign Status", "Ad Group Status", "Status", "Description Line 1", "Description Line 2", "Headline 1", "Headline 2", "Headline 3", "Path 1", "Headline 4", "Headline 5", "Description 1", "Description 1 position", "Description 2", "Description 3", "Max CPC", "Flexible Reach"];
  let requests = [];
  
  //adds header row
  const headerRow = createRowData(rawHeaderRow);
  requests.push(createAppendCellsRequest(masterSheetId, headerRow))

  //starts at one to skip master sheet
  for (let i = 1; i < spreadsheet.sheets.length; i++) {
    const sheet = spreadsheet.sheets[i];
    const sheetId = sheet.properties.sheetId;
    const rawRowData = sheet.data[0].rowData;
    const rowData = rawRowData.slice(1); //removes header from each brand buildout

    let keywordRowData = rowData;
    
    //Update Final Url and Campaign Title for Acquisition
    for (let i = 0; i < rowData.length; i++) {
      //Campaign title
      const rawCampaignTitle = rowData[i].values[0].userEnteredValue.stringValue;
      const accountCampaignTitle = rawCampaignTitle + " > " + account + " > Acquisition";
      keywordRowData[i].values[0].userEnteredValue.stringValue = accountCampaignTitle;

      //Final Url
      if (rowData[i].values[4].hasOwnProperty('userEnteredValue')) {
        const rawFinalURL = rowData[i].values[4].userEnteredValue.stringValue;
        const accountFinalURL = rawFinalURL.replace("www.", "ca.");
        keywordRowData[i].values[4].userEnteredValue.stringValue = accountFinalURL;
      }
    }
    
    //Ad Groups
    const campaignTitle = keywordRowData[0].values[0].userEnteredValue.stringValue;
    const adGroupTitle = keywordRowData[0].values[1].userEnteredValue.stringValue;
    const finalURL = keywordRowData[0].values[4].userEnteredValue.stringValue;

    const adGroupRowData = createAdGroupRowData(campaignTitle, adGroupTitle, "Active", "Active", "Acquisition")
    requests.push(createAppendCellsRequest(masterSheetId, adGroupRowData));
    
    //Ads
    //TODO
    const adCopySheet = await getAccountAdCopySheet(account);
    const acquisitionAdCopyRowData = getAdCopyRowDataByType(adCopySheet, "Acquisition");
    const adCopyRowData = acquisitionAdCopyRowData; // to0 lazy to rename
    const brandTitle = adGroupTitle.slice(8);
    
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
      path = "";
    }

    for(let i = 0; i < adCopyRowData.length; i++) {
      const adRowValues = [
        campaignTitle, 
        adGroupTitle, 
        "", 
        "", 
        finalURL,
        !isCellEmpty(adCopyRowData[i].values[2]) ? adCopyRowData[i].values[2].userEnteredValue.stringValue : "", // labels
        !isCellEmpty(adCopyRowData[i].values[3]) ? adCopyRowData[i].values[3].userEnteredValue.stringValue : "", // ad type
        !isCellEmpty(adCopyRowData[i].values[4]) ? adCopyRowData[i].values[4].userEnteredValue.stringValue : "", // campaign status
        !isCellEmpty(adCopyRowData[i].values[5]) ? adCopyRowData[i].values[5].userEnteredValue.stringValue : "", // ad group status
        !isCellEmpty(adCopyRowData[i].values[6]) ? adCopyRowData[i].values[6].userEnteredValue.stringValue : "", // status
        !isCellEmpty(adCopyRowData[i].values[7]) ? adCopyRowData[i].values[7].userEnteredValue.stringValue : "", // description line 1
        !isCellEmpty(adCopyRowData[i].values[8]) ? adCopyRowData[i].values[8].userEnteredValue.stringValue : "", // description line 2
        "{KeyWord:" + brandTitle + " at iHerb}", // headline 1 TODO
        !isCellEmpty(adCopyRowData[i].values[10]) ? adCopyRowData[i].values[10].userEnteredValue.stringValue : "", // headline 2
        !isCellEmpty(adCopyRowData[i].values[11]) ? adCopyRowData[i].values[11].userEnteredValue.stringValue : "", // headline 3
        path, // path 1 TODO
        !isCellEmpty(adCopyRowData[i].values[13]) ? adCopyRowData[i].values[13].userEnteredValue.stringValue : "", // headline 4
        !isCellEmpty(adCopyRowData[i].values[14]) ? adCopyRowData[i].values[14].userEnteredValue.stringValue : "", // headline 5
        !isCellEmpty(adCopyRowData[i].values[15]) ? adCopyRowData[i].values[15].userEnteredValue.stringValue : "", // description 1
        !isCellEmpty(adCopyRowData[i].values[16]) ? adCopyRowData[i].values[16].userEnteredValue.stringValue : "", // description 1 position
        !isCellEmpty(adCopyRowData[i].values[17]) ? adCopyRowData[i].values[17].userEnteredValue.stringValue : "", // description 2
        !isCellEmpty(adCopyRowData[i].values[18]) ? adCopyRowData[i].values[18].userEnteredValue.stringValue : "", // description 3
        "", // max cpc
        "", // flexible reach
      ];
      
      const adRow = createRowData(adRowValues);
      requests.push(createAppendCellsRequest(masterSheetId, adRow))
    }



    //Keywords
    // add country specific keyword postfix
    // rcode=mkt1013
    for(let i = 0; i < keywordRowData.length; i++) { 
      console.log(keywordRowData[i].values[2].userEnteredValue.stringValue);
      if (keywordRowData[i].values[4].hasOwnProperty('userEnteredValue')) {
        const rawFinalURL = keywordRowData[i].values[4].userEnteredValue.stringValue;
        const postFix = rawFinalURL.indexOf('?') >= 0 ? "&rcode=mkt1013" : "?rcode=mkt1013";
        const accountFinalURL = rawFinalURL + postFix;
        keywordRowData[i].values[4].userEnteredValue.stringValue = accountFinalURL;
      }
    }
    requests.push(createAppendCellsRequest(masterSheetId, keywordRowData));
  }

  batchUpdate(masterSpreadsheetId, requests);


  //TEMPORARY ONLY //fix this inconsiostency
  //removeAdTemplates(spreadsheetId, rowData, sheetId);
  //removeEmptyRows(spreadsheetId, rowData, sheetId);
  //removeExtraCols(spreadsheetId, rowData, sheetId);
  
  //insertAds(spreadsheetId,  sheetId, rowData);
  
  return null;
}

function isCellEmpty(cell) {
  return !cell.hasOwnProperty('userEnteredValue')
}

function createAdGroupRowData(campaign, adGroup, campaignStatus, adGroupStatus, campaignType) {
  const flexibleReach = campaignType === "Acquisition" ? "Audience segments;Genders;Ages;Parental status;Household incomes" : "Genders;Ages;Parental status;Household incomes";
  return createRowData([campaign, adGroup, "", "", "" , "", "", campaignStatus, adGroupStatus, "", "", "", "", "", "", "", "", "", "", "", "", "", "0.5", flexibleReach])
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

async function getSpreadsheet(spreadsheetId) {
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

  console.log(request.insertDimension.range.startIndex + "-" + request.insertDimension.range.endIndex)

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

/**
 * Append a pre element to the body containing the given message
 * as its text node. Used to display the results of the API call.
 *
 * @param {string} message Text to be placed in pre element.
 */
function appendPre(message) {
  var pre = document.getElementById('content');
  var textContent = document.createTextNode(message + '\n');
  pre.appendChild(textContent);
}

function readFormData() {
  var formData = {};

  formData.campaign = document.getElementById("campaign_name").value;
  formData.adGroup = document.getElementById("ad_group_name").value;
  formData.baseKeyword = document.getElementById("base_keyword_name").value;
  formData.finalUrl = document.getElementById("final_url_name").value;

  return formData;
}

function readAccountAutogeneratorData() {
  var formData = {};
  var countriesSelect = document.querySelectorAll('#countries option:checked');
  var countries = Array.from(countriesSelect).map(el => el.value);
  formData.countries = countries;
  formData.masterBrandBuildoutSpreadsheet = document.getElementById("master_brand_buildout_spreadsheet").value;
  
  return formData;
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
      } 
    })
  }

  return rowData;
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

function createBrandBuildoutSpreadSheet(campaign, adGroup, baseKeyword, finalUrl){
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






