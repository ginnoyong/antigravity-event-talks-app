import re
import urllib.request
import xml.etree.ElementTree as ET
from flask import Flask, jsonify, render_template

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def clean_html_to_text(html_content):
    """
    Simplistic HTML to plain text conversion for tweet drafts.
    Removes HTML tags and cleans up whitespace.
    """
    # Remove HTML comments
    text = re.sub(r'<!--.*?-->', '', html_content, flags=re.DOTALL)
    # Replace common block elements with spaces or newlines
    text = re.sub(r'</?(p|div|h1|h2|h3|h4|h5|h6|li|br)[^>]*>', ' ', text)
    # Remove all remaining HTML tags
    text = re.sub(r'<[^>]+>', '', text)
    # Decode basic HTML entities
    text = html_content_decode(text)
    # Replace multiple spaces with a single space
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def html_content_decode(text):
    """Simple replacement of common HTML entities."""
    replacements = {
        "&nbsp;": " ",
        "&amp;": "&",
        "&lt;": "<",
        "&gt;": ">",
        "&quot;": '"',
        "&apos;": "'",
        "&#39;": "'",
        "&ndash;": "–",
        "&mdash;": "—"
    }
    for entity, char in replacements.items():
        text = text.replace(entity, char)
    return text

def parse_release_notes(xml_content):
    """
    Parses the Atom XML feed and extracts release note entries,
    splitting them by their internal <h3> headers into individual updates.
    """
    # Parse XML
    try:
        root = ET.fromstring(xml_content)
    except Exception as e:
        print(f"Error parsing XML: {e}")
        return []

    # Namespace handling
    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    
    updates = []
    update_id_counter = 0

    # Atom feed entries
    for entry in root.findall('atom:entry', ns):
        title = entry.find('atom:title', ns)
        date_str = title.text.strip() if title is not None else "Unknown Date"
        
        updated_elem = entry.find('atom:updated', ns)
        updated_time = updated_elem.text.strip() if updated_elem is not None else ""
        
        link_elem = entry.find("atom:link[@rel='alternate']", ns)
        entry_link = link_elem.attrib.get('href', '') if link_elem is not None else FEED_URL
        
        content_elem = entry.find('atom:content', ns)
        if content_elem is None or content_elem.text is None:
            continue
            
        html_content = content_elem.text.strip()
        
        # Split HTML content by <h3> headers
        # We find all matches of <h3>...</h3> and split content accordingly
        # The structure is typically: <h3>Type</h3> <p>Details...</p>
        parts = re.split(r'<h3>(.*?)</h3>', html_content)
        
        # If no <h3> was found or the split didn't result in pairs, treat the whole thing as one update
        if len(parts) < 3:
            update_id_counter += 1
            body_text = clean_html_to_text(html_content)
            updates.append({
                "id": f"up_{update_id_counter}",
                "date": date_str,
                "updated_time": updated_time,
                "link": entry_link,
                "category": "Announcement",
                "body_html": html_content,
                "body_text": body_text,
                "raw_html": html_content
            })
            continue

        # parts[0] is the content before the first <h3> (usually empty or whitespace)
        # Subsequent elements are: parts[1]=Category, parts[2]=HTML Body, parts[3]=Category, parts[4]=HTML Body, etc.
        for i in range(1, len(parts), 2):
            category = parts[i].strip()
            body_html = parts[i+1].strip() if i+1 < len(parts) else ""
            
            # Reconstruct the HTML chunk for rendering (wrapping in a div/p if necessary)
            wrapped_html = f"<div class='update-content'>{body_html}</div>"
            body_text = clean_html_to_text(body_html)
            
            update_id_counter += 1
            updates.append({
                "id": f"up_{update_id_counter}",
                "date": date_str,
                "updated_time": updated_time,
                "link": f"{entry_link}#{category}_{update_id_counter}", # Add a tag-like hash anchor
                "category": category,
                "body_html": wrapped_html,
                "body_text": body_text,
                "raw_html": f"<h3>{category}</h3>{body_html}"
            })
            
    return updates

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/feed')
def get_feed():
    try:
        # Fetch the RSS feed
        req = urllib.request.Request(
            FEED_URL, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            xml_data = response.read()
            
        updates = parse_release_notes(xml_data)
        
        return jsonify({
            "status": "success",
            "count": len(updates),
            "updates": updates
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
