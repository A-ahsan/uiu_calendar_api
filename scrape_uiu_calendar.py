import requests
from bs4 import BeautifulSoup
import json
import fitz

BASE_URL = "https://www.uiu.ac.bd/academics/calendar/"

def get_title_from_url(url, link_text):
    """Generate proper title from URL and link text."""
    url_lower = url.lower()
    
    # Extract components
    semester = ''
    if '253' in url:
        semester = '253'
    elif '252' in url:
        semester = '252'
    elif '251' in url:
        semester = '251'
    
    program = ''
    if 'undergraduate' in url_lower:
        program = 'Undergraduate Programs'
    elif 'graduate' in url_lower:
        program = 'Graduate Programs'
    elif 'pharmacy' in url_lower:
        program = 'Bachelor of Pharmacy'
    
    term = ''
    if 'fall' in url_lower:
        term = '(Fall 2025)'
    elif 'spring' in url_lower:
        term = '(Spring 2025)' if '2025' in url else '(Spring 2026)'
    elif 'summer' in url_lower:
        term = '(Summer 2025)'
    
    # Build title
    parts = [f"Academic Calendar {semester}" if semester else "Academic Calendar"]
    if program:
        parts.append(program)
    if term:
        parts.append(term)
    
    return ' - '.join(parts)

def extract_table_from_pdf(pdf_url):
    """Extract events from PDF - robust parsing for messy PDFs."""
    import re
    
    response = requests.get(pdf_url)
    doc = fitz.open(stream=response.content, filetype="pdf")
    page = doc[0]
    
    events = []
    seen = set()
    
    # Try 1: Table extraction
    tables = page.find_tables()
    if tables:
        for table in tables:
            rows = table.extract()
            for row in rows:
                if row and len(row) >= 3:
                    date = str(row[0] or '').strip()
                    day = str(row[1] or '').strip()
                    desc = str(row[2] or '').strip()
                    
                    if date and len(date) > 3 and re.match(r'^[A-Z][a-z]{2}', date):
                        event = f"{date} {day} {desc}".strip()
                        event_key = event.lower()
                        if event_key not in seen:
                            seen.add(event_key)
                            events.append(event)
    
    # Try 2: Parse all text - get EVERYTHING with a date
    text = page.get_text()
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    
    # Skip header/footer
    start_idx = 0
    for i, line in enumerate(lines):
        if re.search(r'(Jul|Aug|Sep|Oct|Nov|Dec|Jan|Feb|Mar|Apr|May|Jun)\s+\d', line, re.I):
            start_idx = i
            break
    
    i = start_idx
    while i < len(lines):
        line = lines[i]
        
        # Pattern 1: Date Day Description (all on one line)
        match1 = re.match(r'([A-Z][a-z]{2}\s+\d{1,2}(?:\s*-\s*\d{1,2})?,?\s*\d{4})\s+([A-Z][a-z]{2}(?:\s*-\s*[A-Z][a-z]{2})?)\s+(.+)', line)
        if match1:
            event = f"{match1.group(1)} {match1.group(2)} {match1.group(3)}".strip()
            event_key = event.lower()
            if event_key not in seen and len(match1.group(3)) > 5:
                seen.add(event_key)
                events.append(event)
            i += 1
            continue
        
        # Pattern 2: Date on its own line
        date_match = re.match(r'^([A-Z][a-z]{2}\s+\d{1,2}(?:\s*-\s*\d{1,2})?,?\s*\d{4})$', line)
        if date_match and i + 1 < len(lines):
            date_part = date_match.group(1)
            next_line = lines[i + 1]
            
            # Check if next line is a day
            day_match = re.match(r'^([A-Z][a-z]{2}(?:\s*-\s*[A-Z][a-z]{2})?)$', next_line)
            if day_match and i + 2 < len(lines):
                day_part = day_match.group(1)
                desc_part = lines[i + 2]
                
                # Collect multi-line descriptions
                desc_lines = [desc_part]
                j = i + 3
                while j < len(lines) and j < i + 5:  # Look ahead up to 2 more lines
                    next = lines[j]
                    # Stop if we hit another date
                    if re.match(r'^[A-Z][a-z]{2}\s+\d', next):
                        break
                    # Stop if too short or looks like day of week alone
                    if len(next) < 5 or re.match(r'^[A-Z][a-z]{2}$', next):
                        break
                    desc_lines.append(next)
                    j += 1
                
                full_desc = ' '.join(desc_lines).strip()
                if len(full_desc) > 5:
                    event = f"{date_part} {day_part} {full_desc}".strip()
                    event_key = event.lower()
                    if event_key not in seen:
                        seen.add(event_key)
                        events.append(event)
                i = j
                continue
        
        i += 1
    
    doc.close()
    return events

def main():
    print("Fetching calendars...")
    response = requests.get(BASE_URL)
    soup = BeautifulSoup(response.text, 'html.parser')
    
    calendars = []
    seen = set()
    
    for link in soup.find_all('a', href=True):
        href = link['href']
        if href.endswith('.pdf') and 'calendar' in href.lower():
            if not href.startswith('http'):
                href = f"https://www.uiu.ac.bd{href}"
            
            if href in seen:
                continue
            seen.add(href)
            
            link_text = link.get_text(strip=True)
            title = get_title_from_url(href, link_text)
            print(f"Processing: {title}")
            
            try:
                events = extract_table_from_pdf(href)
                calendars.append({'title': title, 'url': href, 'events': events})
                print(f"  Found {len(events)} events")
            except Exception as e:
                print(f"  Error: {e}")
                calendars.append({'title': title, 'url': href, 'events': []})
    
    output = {'count': len(calendars), 'data': calendars}
    
    with open('web/calendars.json', 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    
    print(f"\nSaved {len(calendars)} calendars")

if __name__ == '__main__':
    main()
