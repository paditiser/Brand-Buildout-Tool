// Client ID and API key from the Developer Console
var CLIENT_ID = '953951705449-hdci1bug82psf8vopsuucm3e7iq5m5id.apps.googleusercontent.com';
var API_KEY = 'AIzaSyCheFuLcUJw5XI5CJbd8j3gNQl9bA_Ypr8';

// Array of API discovery doc URLs for APIs used by the quickstart
var DISCOVERY_DOCS = ["https://sheets.googleapis.com/$discovery/rest?version=v4"];

// Authorization scopes required by the API; multiple scopes can be
// included, separated by spaces.
var SCOPES = "https://www.googleapis.com/auth/spreadsheets";

const PRODUCT_KEYWORDS = [
  {
      prefix: "",
      suffix: ""
    },
    {
      prefix: "",
      suffix: " products"
    },
    {
      prefix: "buy ",
      suffix: ""
    },
    {
      prefix: "buy ",
      suffix: " online"
    },
    {
      prefix: "cheap ",
      suffix: ""
    },
    {
      prefix: "",
      suffix: " coupons"
    },
    {
      prefix: "",
      suffix: " discount"
    },
    {
      prefix: "",
      suffix: " online"
    },
    {
      prefix: "",
      suffix: " online store"
    },
    {
      prefix: "",
      suffix: " sale"
    }
  ];

  const SIMPLE_DOMAIN_KEYWORDS = [
  {
    prefix: "www ",
    suffix: " com"
  },
  {
    prefix: "www",
    suffix: "com"
  },
  {
    prefix: "www ",
    suffix: ""
  },
  {
    prefix: "www",
    suffix: ""
  },
  {
    prefix: "",
    suffix: " com"
  },
  {
    prefix: "",
    suffix: "com"
  }
]

const COMPOUND_DOMAIN_KEYWORDS = [
  {
    prefix: "www ",
    suffix: " com"
  },
  {
    prefix: "www ",
    suffix: ""
  },
  {
    prefix: "",
    suffix: " com"
  },
]

const NEGATIVE_KEYWORDS = [
  {
    keyword: "ingredient",
    match_type: "Negative Broad"
  },
  {
    keyword: "ingredients",
    match_type: "Negative Broad"
  },
  {
    keyword: "address",
    match_type: "Negative Broad"
  },
  {
    keyword: "location",
    match_type: "Negative Broad"
  },
  {
    keyword: "locations",
    match_type: "Negative Broad"
  },
  {
    keyword: "logo",
    match_type: "Negative Broad"
  },
  {
    keyword: "side effect",
    match_type: "Negative Phrase"
  },
  {
    keyword: "side effects",
    match_type: "Negative Phrase"
  },
  {
    keyword: "review",
    match_type: "Negative Broad"
  },
  {
    keyword: "reviews",
    match_type: "Negative Broad"
  }
];