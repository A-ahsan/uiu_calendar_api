import requests
from bs4 import BeautifulSoup

BASE_URL = "https://www.uiu.ac.bd/academics/calendar/"

def inspect_page():
    """Inspect the UIU calendar page to see what content is available."""
    print("Fetching webpage...")
    response = requests.get(BASE_URL)
    soup = BeautifulSoup(response.text, 'html.parser')
    
    # Save full HTML for inspection
    with open('page_source.html', 'w', encoding='utf-8') as f:
        f.write(soup.prettify())
    print("✓ Full HTML saved to page_source.html")
    
    # Check for tables
    tables = soup.find_all('table')
    print(f"\n📊 Found {len(tables)} tables on the page")
    for i, table in enumerate(tables):
        rows = table.find_all('tr')
        print(f"   Table {i+1}: {len(rows)} rows")
        if rows:
            # Show first row as sample
            first_row = rows[0].get_text(strip=True)
            print(f"      First row: {first_row[:100]}")
    
    # Check for accordion/collapsible sections
    accordions = soup.find_all(class_=lambda x: x and 'accordion' in x.lower())
    print(f"\n📁 Found {len(accordions)} accordion sections")
    
    # Check for divs with calendar-related classes
    calendar_divs = soup.find_all(['div', 'section'], class_=lambda x: x and 'calendar' in str(x).lower())
    print(f"\n📅 Found {len(calendar_divs)} calendar-related divs/sections")
    for i, div in enumerate(calendar_divs[:3]):  # Show first 3
        text = div.get_text(strip=True)[:200]
        print(f"   Div {i+1}: {text}")
    
    # Check all links
    links = soup.find_all('a', href=True)
    pdf_links = [link for link in links if link['href'].endswith('.pdf')]
    print(f"\n🔗 Found {len(links)} total links")
    print(f"   {len(pdf_links)} PDF links")
    
    # Show PDF links
    print("\n📄 PDF Links found:")
    for link in pdf_links[:10]:  # Show first 10
        href = link['href']
        text = link.get_text(strip=True)
        if not href.startswith('http'):
            href = f"https://www.uiu.ac.bd{href}"
        print(f"   - {text or '(no text)'}")
        print(f"     {href}")
    
    # Check for embedded calendar data (JSON, etc.)
    scripts = soup.find_all('script')
    print(f"\n💾 Found {len(scripts)} script tags")
    for script in scripts:
        if script.string and ('calendar' in script.string.lower() or 'events' in script.string.lower()):
            print(f"   Found potential calendar data in script: {script.string[:200]}")
    
    # Check for iframes (embedded content)
    iframes = soup.find_all('iframe')
    print(f"\n🖼️  Found {len(iframes)} iframes")
    for iframe in iframes:
        src = iframe.get('src', '')
        print(f"   - {src}")
    
    print("\n" + "="*60)
    print("SUMMARY:")
    print("="*60)
    
    if tables and len(tables) > 0:
        print("✓ Page has HTML tables - calendar content may be directly available!")
    elif pdf_links:
        print("✗ No HTML tables found")
        print(f"✓ Found {len(pdf_links)} PDF links - content is in PDFs")
    else:
        print("✗ No obvious calendar content found")
    
    print("\nCheck 'page_source.html' for the full page structure.")

if __name__ == '__main__':
    inspect_page()
