from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
import json
import time

BASE_URL = "https://www.uiu.ac.bd/academics/calendar/"

def setup_driver():
    """Setup Chrome driver with headless option."""
    chrome_options = Options()
    chrome_options.add_argument("--headless")  # Run in background
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--disable-gpu")
    
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=chrome_options)
    return driver

def get_title_from_link(link_element):
    """Extract title from link element."""
    try:
        # Try to get text from the link or nearby elements
        text = link_element.text.strip()
        if text:
            return text
        
        # Try parent element
        parent = link_element.find_element(By.XPATH, '..')
        text = parent.text.strip()
        if text:
            return text
        
        # Fallback to href
        href = link_element.get_attribute('href')
        return href.split('/')[-1].replace('.pdf', '').replace('-', ' ').title()
    except:
        return "Academic Calendar"

def extract_calendar_data(driver):
    """Extract all calendar information from the page."""
    calendars = []
    seen_urls = set()
    
    try:
        # Wait for page to load
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.TAG_NAME, "body"))
        )
        time.sleep(2)  # Give extra time for dynamic content
        
        # First, let's see if there are tables directly on the page
        tables = driver.find_elements(By.TAG_NAME, "table")
        print(f"Found {len(tables)} tables on page")
        
        # Look for calendar content in various formats
        # 1. Check for accordion/expandable sections
        accordions = driver.find_elements(By.CLASS_NAME, "accordion")
        print(f"Found {len(accordions)} accordion sections")
        
        # 2. Check for calendar-specific containers
        calendar_containers = driver.find_elements(By.CSS_SELECTOR, "[class*='calendar'], [id*='calendar']")
        print(f"Found {len(calendar_containers)} calendar containers")
        
        # 3. Get all PDF links as fallback
        pdf_links = driver.find_elements(By.CSS_SELECTOR, "a[href$='.pdf']")
        print(f"Found {len(pdf_links)} PDF links")
        
        # Try to extract content from tables if they exist
        for idx, table in enumerate(tables):
            try:
                rows = table.find_elements(By.TAG_NAME, "tr")
                if len(rows) > 2:  # Has actual data
                    events = []
                    for row in rows[1:]:  # Skip header
                        cols = row.find_elements(By.TAG_NAME, "td")
                        if len(cols) >= 2:
                            date = cols[0].text.strip()
                            event = cols[1].text.strip() if len(cols) > 1 else ""
                            day = cols[2].text.strip() if len(cols) > 2 else ""
                            
                            if date and event:
                                event_text = f"{date} {day} {event}".strip()
                                events.append(event_text)
                    
                    if events:
                        calendars.append({
                            'title': f'Academic Calendar (Table {idx + 1})',
                            'url': driver.current_url,
                            'events': events
                        })
            except Exception as e:
                print(f"Error parsing table {idx}: {e}")
        
        # Check accordion sections for embedded content
        for accordion in accordions:
            try:
                # Try to expand it
                header = accordion.find_element(By.CLASS_NAME, "accordion-header")
                driver.execute_script("arguments[0].click();", header)
                time.sleep(1)
                
                # Look for content
                content = accordion.find_element(By.CLASS_NAME, "accordion-content")
                text = content.text.strip()
                if text:
                    print(f"Accordion content preview: {text[:200]}")
            except:
                pass
        
        # If no direct content found, collect PDF links
        if not calendars:
            for link in pdf_links:
                try:
                    href = link.get_attribute('href')
                    if 'calendar' in href.lower() and href not in seen_urls:
                        seen_urls.add(href)
                        title = get_title_from_link(link)
                        calendars.append({
                            'title': title,
                            'url': href,
                            'events': [],
                            'note': 'PDF link - content needs to be extracted from PDF'
                        })
                except Exception as e:
                    print(f"Error processing link: {e}")
        
    except Exception as e:
        print(f"Error extracting calendar data: {e}")
    
    return calendars

def main():
    print("Starting Selenium scraper...")
    print(f"Target URL: {BASE_URL}")
    
    driver = None
    try:
        driver = setup_driver()
        print("Chrome driver setup complete")
        
        # Load the page
        print("Loading page...")
        driver.get(BASE_URL)
        
        # Save page source for inspection
        with open('page_source.html', 'w', encoding='utf-8') as f:
            f.write(driver.page_source)
        print("Page source saved to page_source.html")
        
        # Extract calendar data
        calendars = extract_calendar_data(driver)
        
        # Save results
        output = {
            'count': len(calendars),
            'data': calendars,
            'scraped_at': time.strftime('%Y-%m-%d %H:%M:%S')
        }
        
        with open('selenium_output.json', 'w', encoding='utf-8') as f:
            json.dump(output, f, indent=2, ensure_ascii=False)
        
        print(f"\nResults:")
        print(f"- Found {len(calendars)} calendars")
        print(f"- Output saved to selenium_output.json")
        
        # Print summary
        for cal in calendars:
            print(f"\n{cal['title']}:")
            print(f"  URL: {cal['url']}")
            print(f"  Events: {len(cal.get('events', []))}")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        if driver:
            driver.quit()
            print("\nBrowser closed")

if __name__ == '__main__':
    main()
