# BigQuery Release Notes Tracker

A sleek, premium, and fully responsive web application built using **Python Flask** and **Vanilla HTML, JavaScript, and CSS** to track, search, filter, and tweet Google Cloud BigQuery release notes.

---

## 🚀 Key Features

* **Dynamic Ingestion & Slicing**: Fetches Google's live XML Atom feed and dynamically splits entries by their category headers (`Feature`, `Issue`, `Change`, `Announcement`, `Breaking`) to present them as separate, interactable updates.
* **Modern UI Dashboard**: Features a space-themed dark mode design with calendar timeline groups, interactive metrics counters, loading skeleton templates, and micro-animations.
* **Search & Filter**: Real-time keyword search across date, tags, and content, combined with category filters.
* **Tweet Composer Side Drawer**: A sliding editor panel (bottom-sheet drawer on mobile) to draft, review, and customize tweets for specific updates.
* **Precise Twitter Length Calculation**: Automatically accounts for Twitter's 23-character URL limitation on links to dynamically manage character countdowns and prevent over-length submissions.
* **OAuth-free Web Intent Sharing**: Opens secure Twitter/X sharing intents in a separate window to publish updates without managing database credentials or user authorization flows.

---

## 📂 Project Structure

```
bq-releases-notes/
├── templates/
│   └── index.html      # Main dashboard HTML layout & Tweet drawer
├── static/
│   ├── css/
│   │   └── styles.css  # Space-theme CSS, skeletons, and responsiveness rules
│   └── js/
│       └── main.js     # State management, feed API fetching, and sharing logic
├── app.py              # Flask backend, XML parser, and routing logic
├── .gitignore          # Rules to exclude dependency/environment folders
└── README.md           # Getting started instructions
```

---

## 🛠️ Getting Started

### Prerequisites
Make sure you have Python 3 installed.

### Installation
1. Clone the repository (or copy the files to your workspace).
2. Install dependencies:
   ```bash
   pip install flask
   ```

### Running the App
1. Start the Flask development server:
   ```bash
   python app.py
   ```
2. Open your browser and navigate to:
   [http://127.0.0.1:5000](http://127.0.0.1:5000)

---

## ⚙️ Data Flow & Architecture

1. **Inbound HTTP GET**: The browser requests `/api/feed`.
2. **XML Fetch & Parse**: The Python backend requests `docs.cloud.google.com/feeds/bigquery-release-notes.xml`, parses the XML via standard `ElementTree`, and splits HTML sections into clean objects using Regex.
3. **JSON Delivery**: The backend returns sanitized lists of objects to the browser.
4. **UI Render**: `main.js` receives the data, calculates stats, and constructs the timeline dynamically.
5. **Tweet Intent**: Selecting an update formats a tweet template and invokes a secure web intent opening:
   `https://twitter.com/intent/tweet?text=<payload>`
