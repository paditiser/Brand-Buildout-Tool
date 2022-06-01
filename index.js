/** 
 * Initialize Buttons 
 * */
const authorizeButton = document.getElementById('authorize_button');
const signoutButton = document.getElementById('signout_button');
const createBrandBuildoutTemplateButton = document.getElementById('create_brand_buildout_template_button');
const accountBuildoutButton = document.getElementById('create_account_buildout_button');

let BUTTON_STATE = "GET_DATA";
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

/**
 * 
 * Create Account buildouts on Click 
 */
async function handleAccountBuildoutClick(e) {
  switch(BUTTON_STATE) {
    case "GET_DATA":
      updateButtonState("");

      const formData = readAccountBuildoutData();
      console.log(formData)
      const accountDataSpreadsheet = await getSpreadsheet(formData.accountDataSpreadsheetURL)
      
      const [adCopySheetIndex, URLDataSheetIndex] = getSheetIndexesFromAccountDataSpreadsheet(accountDataSpreadsheet);
      const adCopySheet = accountDataSpreadsheet.sheets[adCopySheetIndex];
      const urlDataSheet = accountDataSpreadsheet.sheets[URLDataSheetIndex];
      
      ACCOUNTS = getAccountsURLDataFromSheet(urlDataSheet);
      const accounts = ACCOUNTS;
      console.log(accounts);

      let html = "";
      for (let i = 0; i < accounts.length; i++) {
        const account = accounts[i].accountTitle;
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
    const boxdiv = document.getElementById(ACCOUNTS[i].accountTitle +"-checkbox");
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