/** 
 * Initialize Buttons 
 * */
const authorizeButton = document.getElementById('authorize_button');
const signoutButton = document.getElementById('signout_button');
const createBrandBuildoutTemplateButton = document.getElementById('create_brand_buildout_template_button');
const accountBuildoutButton = document.getElementById('create_account_buildout_button');
const spreadsheetStyleSwitch = document.getElementById('spreadsheet-style-switch');

let BUTTON_STATE = "GET_MANAGER_DATA";
updateButtonState(BUTTON_STATE);

let ACCOUNTS = [];

function readTextFile(file)
{
    var rawFile = new XMLHttpRequest();
    rawFile.open("GET", file, false);
    rawFile.onreadystatechange = function ()
    {
        if(rawFile.readyState === 4)
        {
            if(rawFile.status === 200 || rawFile.status == 0)
            {
                var allText = rawFile.responseText;
            }
        }
    }
    rawFile.send(null);
    return rawFile.responseText;
}
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
    createBrandBuildoutTemplateButton.onclick = handleCreateBrandTemplateBuildoutClick;
    accountBuildoutButton.onclick = handleAccountBuildoutClick;
    spreadsheetStyleSwitch.onclick = handleSpreadsheetStyleClick;

    // Initiate patch notes
    const patchNotes = readTextFile("patchnotes.txt")
    document.getElementById('patch_notes').innerText=patchNotes;    
    
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
 * Switch between Account and Manager style spreadsheet
 * @param {*} event 
 */
// Account (true) / Manager (false)
function handleSpreadsheetStyleClick(event) {
  const selection = spreadsheetStyleSwitch.checked;
  if(!selection) {
    document.getElementById("accounts_form").innerHTML = "";
    BUTTON_STATE = "GET_MANAGER_DATA";
    updateButtonState(BUTTON_STATE);
  } else {
    document.getElementById("accounts_form").innerHTML = "";
    BUTTON_STATE = "GET_DATA";
    updateButtonState(BUTTON_STATE);
  }
}

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
function handleCreateBrandTemplateBuildoutClick(e) {
  const formData = readBrandBuildoutTemplateData();

  const spreadsheet = createBrandBuildoutTemplateSpreadsheet(formData.campaign, formData.adGroup, formData.baseKeyword, formData.finalUrl);

  //create spreadsheet
  const url = createNewDocument(spreadsheet);
  window.open(url, '_blank');
}

function updateButtonState(state) {
  let button_html = ""
  document.getElementById("buildout_button").innerHTML = button_html;

  switch(state) {
    case "GET_MANAGER_DATA":
      button_html = `Get Manager Data`
      break;
    case "GET_DATA":
      button_html = `Get Account Data`
      break;
    case "SELECT_DATA":
      button_html = `Please Select At Least One Account`
      break;
    case "CREATE":
      button_html = `Create`
      break;
    default:
      button_html = `
      <span class="spinner-grow spinner-grow-sm" id="create_account_buildout_loader"></span>
          Working...
      `
  }

  document.getElementById("buildout_button").innerHTML = button_html;
}

function readManagerSelectData() {
  const managerSelect = document.getElementById("manager-select");
  const manager = managerSelect.options[managerSelect.selectedIndex].value;
  return manager;
}

function getAccountsFromManagerSheet(sheet) {
  let accounts = [];

  //skip header
  for(let i = 1; i < sheet.data[0].rowData.length; i++) {
    const row = sheet.data[0].rowData[i];
    if(rowIsEmpty(row)) continue;
    const accountTitle = row.values[1].userEnteredValue.stringValue;

    console.log(accountTitle)
    // sorry
    if(!accounts.includes(accountTitle)) {
      accounts.push(accountTitle);
    }
  }

  return accounts;
}

/**
 * 
 * Create Account buildouts on Click 
 */
async function handleAccountBuildoutClick(e) {
  switch(BUTTON_STATE) {
    case "GET_MANAGER_DATA":
      updateButtonState("")

      const managerFormData = readAccountBuildoutData();
      const managerDataSpreadsheet = await getSpreadsheet(managerFormData.accountDataSpreadsheetURL)
      const managers = managerDataSpreadsheet.sheets;
      
      let managerHtml = `<select class="form-select" id="manager-select">`;
      for (let i = 0; i < managers.length; i++) {
        const title = managers[i].properties.title;
        console.log(title)
        if(title !== "URL Data") {
          const template = `<option value="${title}">${title}</option>`;
          managerHtml += template;
        }
      }
      managerHtml += `</select>`;
      document.getElementById("accounts_form").innerHTML = managerHtml;
      BUTTON_STATE = "GET_DATA";
      updateButtonState(BUTTON_STATE)

      break;
    case "GET_DATA":
      updateButtonState("");
      const spreadsheetStyle = spreadsheetStyleSwitch.checked;
      const formData = readAccountBuildoutData();
      const accountDataSpreadsheet = await getSpreadsheet(formData.accountDataSpreadsheetURL)
      
      if(spreadsheetStyle) {
        const [adCopySheetIndex, URLDataSheetIndex] = getSheetIndexesFromAccountDataSpreadsheet(accountDataSpreadsheet);
        const urlDataSheet = accountDataSpreadsheet.sheets[URLDataSheetIndex];
        ACCOUNTS = getAccountsURLDataFromSheet(urlDataSheet);
      } else {
        let managerSheet;
        const manager = readManagerSelectData();
        for(let i = 0; i < accountDataSpreadsheet.sheets.length; i++) {
          console.log("here")
          if(accountDataSpreadsheet.sheets[i].properties.title === manager) {
            managerSheet = accountDataSpreadsheet.sheets[i];
            break;
          }
        }
        ACCOUNTS = getAccountsFromManagerSheet(managerSheet)
      }
      
      const accounts = ACCOUNTS;
      console.log(accounts);

      let html = "";
      for (let i = 0; i < accounts.length; i++) {
        const account = accounts[i].accountTitle || accounts[i];
        const id = account + "-checkbox";
        const template = `
        <div class="input-group mb-1">
          <div class="input-group-text">
            <input id=${id} class="form-check-input mt-0" type="checkbox" value="" aria-label="Checkbox for following text input">
          </div>
          <span class="input-group-text">${account}</span>
        </div>`;
        html += template
      }
      document.getElementById("accounts_form").innerHTML = html;
      BUTTON_STATE = "CREATE";
      updateButtonState(BUTTON_STATE)
      break;
    
    case "CREATE":
      updateButtonState("")
      console.log("create state");
      const selectedAccounts = readAccountCheckBoxData(ACCOUNTS);
      
      if(selectedAccounts.length === 0) {
        alert("Please select at least one account.")
        updateButtonState(BUTTON_STATE);
        break;
      }
      
      const formDataCreate = readAccountBuildoutData();
      const brandBuildoutSpreadsheet = await getSpreadsheet(formDataCreate.brandBuildoutSpreadsheetURL)
      const accountDataSpreadsheetCreate = await getSpreadsheet(formDataCreate.accountDataSpreadsheetURL)
      
      await processRequest(brandBuildoutSpreadsheet, accountDataSpreadsheetCreate, selectedAccounts);

      BUTTON_STATE = "GET_DATA";
      updateButtonState(BUTTON_STATE);
      document.getElementById("accounts_form").innerHTML = "";
      ACCOUNTS = [];
    break;

    default:
      console.log("")
  }

  

  /*const formData = readAccountBuildoutData();
  
  if(formData.accountDataSpreadsheetURL === "" || formData.brandBuildoutSpreadsheetURL === ""){
    location.reload()
    alert("Please submit both a URL for the master brand buildout spreadsheet and the account data spreadsheet")
  }
  
  const brandBuildoutSpreadsheet = await getSpreadsheet(formData.brandBuildoutSpreadsheetURL)
  console.log("first", brandBuildoutSpreadsheet)
  const accountDataSpreadsheet = await getSpreadsheet(formData.accountDataSpreadsheetURL)
  
  await processRequest(brandBuildoutSpreadsheet, accountDataSpreadsheet);*/
}

function readAccountCheckBoxData() {
  let accounts = [];

  for(let i = 0; i < ACCOUNTS.length; i++) {
    const title = ACCOUNTS[i].accountTitle || ACCOUNTS[i]
    const boxdiv = document.getElementById(title+"-checkbox");
    const checked = boxdiv.checked;

    if(checked) {
      accounts.push(ACCOUNTS[i]);
    }
  }

  return accounts;
}

function readBrandBuildoutTemplateData() {
  let formData = {};

  formData.campaign = document.getElementById("campaign_name").value;
  formData.adGroup = document.getElementById("ad_group_name").value;
  formData.baseKeyword = document.getElementById("base_keyword_name").value;
  formData.finalUrl = document.getElementById("final_url_name").value;

  return formData;
}

function readAccountBuildoutData() {
  let formData = {};

  formData.brandBuildoutSpreadsheetURL = document.getElementById("master_brand_buildout_spreadsheet").value;
  formData.accountDataSpreadsheetURL = document.getElementById("account_data_spreadsheet").value;
  
  return formData;
}