import requests
from bs4 import BeautifulSoup
import json
import re

BASE_URL = "https://www.uiu.ac.bd/academics/calendar/"

def extract_semester_info(table):
    """Extract semester information from details/summary context."""
    # The table is inside a <details> tag with a <summary> containing the title
    details_elem = table.find_parent('details')
    if details_elem:
        summary = details_elem.find('summary')
        if summary:
            title = summary.get_text(strip=True)
            return title
    
    # Fallback: look for preceding headings
    prev_elem = table.find_previous(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'summary'])
    search_count = 0
    while prev_elem and search_count < 10:
        text = prev_elem.get_text(strip=True)
        if any(keyword in text for keyword in ['253', '252', '251', 'Undergraduate', 'Graduate', 'Pharmacy', 'Fall', 'Spring', 'Summer']):
            return text
        prev_elem = prev_elem.find_previous(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'summary'])
        search_count += 1
    
    return "Academic Calendar"

def clean_event_text(text):
    """Clean up event text."""
    # Remove excessive whitespace
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

def parse_table_to_events(table):
    """Parse HTML table to list of events."""
    events = []
    rows = table.find_all('tr')
    
    # Don't skip any rows - UIU calendar tables don't have header rows
    for row in rows:
        cols = row.find_all(['td', 'th'])
        if len(cols) >= 3:
            date = cols[0].get_text(strip=True)
            day = cols[1].get_text(strip=True)
            description = cols[2].get_text(strip=True)
            
            # Only add if we have valid date and description
            if date and description and len(description) > 3:
                # Check if date looks like a date (has numbers)
                if re.search(r'\d', date):
                    event = clean_event_text(f"{date} {day} {description}")
                    events.append(event)
    
    return events

def extract_additional_details(table):
    """Extract additional content like notes, payment info, etc. from calender-extra-details div."""
    details = []
    
    # The table is inside a <details> tag, look for calender-extra-details div within the same details parent
    details_elem = table.find_parent('details')
    if details_elem:
        extra_details_div = details_elem.find('div', class_='calender-extra-details')
        if extra_details_div:
            # Extract all paragraphs
            paragraphs = extra_details_div.find_all('p')
            for p in paragraphs:
                text = p.get_text(strip=True)
                if text:
                    # Clean up the text
                    text = clean_event_text(text)
                    details.append(text)
    
    return details

def main():
    print("="*60)
    print("UIU Academic Calendar Scraper (Direct HTML)")
    print("="*60)
    print(f"\nFetching: {BASE_URL}")
    
    response = requests.get(BASE_URL)
    soup = BeautifulSoup(response.text, 'html.parser')
    
    # Find all tables
    tables = soup.find_all('table')
    print(f"Found {len(tables)} calendar tables\n")
    
    calendars = []
    
    for idx, table in enumerate(tables):
        # Extract title/semester info
        title = extract_semester_info(table)
        
        # Parse events
        events = parse_table_to_events(table)
        
        # Extract additional details (notes, payment info, etc.)
        additional_details = extract_additional_details(table)
        
        if events:
            print(f"📅 {title}")
            print(f"   Events: {len(events)}")
            print(f"   Additional notes: {len(additional_details)}")
            print(f"   Sample: {events[0][:80]}...")
            
            calendar_data = {
                'title': title,
                'url': BASE_URL,
                'events': events,
                'source': 'Direct HTML Table'
            }
            
            # Add additional details if any
            if additional_details:
                calendar_data['notes'] = additional_details
            
            calendars.append(calendar_data)
    
    # Also collect PDF links as backup
    print("\n" + "="*60)
    print("PDF Links (for reference)")
    print("="*60)
    
    pdf_links = []
    for link in soup.find_all('a', href=True):
        href = link['href']
        if href.endswith('.pdf') and 'calendar' in href.lower():
            if not href.startswith('http'):
                href = f"https://www.uiu.ac.bd{href}"
            
            link_text = link.get_text(strip=True)
            pdf_links.append({
                'title': link_text or 'Academic Calendar PDF',
                'url': href
            })
            print(f"📄 {link_text}")
            print(f"   {href}")
    
    # Save results
    output = {
        'count': len(calendars),
        'data': calendars,
        'pdf_links': pdf_links,
        'scrape_method': 'Direct HTML Table Extraction',
        'source_url': BASE_URL
    }
    
    with open('web/calendars.json', 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    
    print("\n" + "="*60)
    print("RESULTS")
    print("="*60)
    print(f"✓ Scraped {len(calendars)} calendars from HTML tables")
    print(f"✓ Found {len(pdf_links)} PDF links")
    print(f"✓ Saved to: web/calendars.json")
    
    # Show total events
    total_events = sum(len(cal['events']) for cal in calendars)
    print(f"✓ Total events: {total_events}")

if __name__ == '__main__':
    main()
