export const NETWORK_RULES = [
  // 1. Block common known tracker patterns
  {
    "id": 1,
    "priority": 1,
    "action": { "type": "block" },
    "condition": {
      "urlFilter": "tracker",
      "resourceTypes": ["script", "image", "xmlhttprequest"]
    }
  },
  // 2. Block DoubleClick (Advertising)
  {
    "id": 2,
    "priority": 1,
    "action": { "type": "block" },
    "condition": {
      "urlFilter": "doubleclick.net",
      "resourceTypes": ["script", "image", "xmlhttprequest"]
    }
  },
  // 3. Block Google Analytics
  {
    "id": 3,
    "priority": 1,
    "action": { "type": "block" },
    "condition": {
      "urlFilter": "google-analytics.com",
      "resourceTypes": ["script", "xmlhttprequest"]
    }
  },
  // 4. Upgrade HTTP to HTTPS (Privacy & Security)
  {
    "id": 4,
    "priority": 1,
    "action": {
      "type": "redirect",
      "redirect": { "transform": { "scheme": "https" } }
    },
    "condition": {
      "urlFilter": "http://*",
      "resourceTypes": ["main_frame"]
    }
  },
  // 5. Header Spoofing (Prevent detection of anti-fingerprinting)
  {
    "id": 5,
    "priority": 1,
    "action": {
      "type": "modifyHeaders",
      "requestHeaders": [
        { "header": "user-agent", "operation": "set", "value": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36" },
        { "header": "sec-ch-ua", "operation": "set", "value": "\" Not;A Brand\";v=\"99\", \"Google Chrome\";v=\"91\", \"Chromium\";v=\"91\"" },
        { "header": "sec-ch-ua-mobile", "operation": "set", "value": "?0" },
        { "header": "sec-ch-ua-platform", "operation": "set", "value": "\"Windows\"" }
      ]
    },
    "condition": {
      "urlFilter": "*",
      "resourceTypes": ["main_frame", "sub_frame", "script", "xmlhttprequest", "websocket"]
    }
  }
];
