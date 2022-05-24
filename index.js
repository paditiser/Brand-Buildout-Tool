/** 
 * Initialize Buttons 
 * */
const authorizeButton = document.getElementById('authorize_button');
const signoutButton = document.getElementById('signout_button');
const createBrandBuildoutTemplateButton = document.getElementById('create_brand_buildout_template_button');
const createAccountBuildoutButton = document.getElementById('create_account_buildout_button');

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
    createAccountBuildoutButton.onclick = handleCreateAccountBuildoutClick;
    
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

/**
 * 
 * Create Account buildouts on Click 
 */
async function handleCreateAccountBuildoutClick(e) {
  const formData = readAccountBuildoutData();
  
  if(formData.accountDataSpreadsheetURL === "" || formData.brandBuildoutSpreadsheetURL === ""){
    location.reload()
    alert("Please submit both a URL for the master brand buildout spreadsheet and the account data spreadsheet")
  }
  
  const brandBuildoutSpreadsheet = await getSpreadsheet(formData.brandBuildoutSpreadsheetURL)
  console.log("first", brandBuildoutSpreadsheet)
  const accountDataSpreadsheet = await getSpreadsheet(formData.accountDataSpreadsheetURL)
  
  processRequest(brandBuildoutSpreadsheet, accountDataSpreadsheet);
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