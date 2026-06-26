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
  }
];
