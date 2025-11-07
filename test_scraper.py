"""
Test script to validate the scraped calendar data
"""
import json

def test_calendar_data():
    print("=" * 60)
    print("Testing Scraped Calendar Data")
    print("=" * 60)
    
    # Load the JSON file
    with open('web/calendars.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Test 1: Check structure
    print("\n✅ TEST 1: JSON Structure")
    assert 'count' in data, "Missing 'count' field"
    assert 'data' in data, "Missing 'data' field"
    assert 'pdf_links' in data, "Missing 'pdf_links' field"
    assert 'scrape_method' in data, "Missing 'scrape_method' field"
    assert 'source_url' in data, "Missing 'source_url' field"
    print(f"   ✓ All required fields present")
    
    # Test 2: Count matches
    print("\n✅ TEST 2: Count Validation")
    actual_count = len(data['data'])
    assert data['count'] == actual_count, f"Count mismatch: {data['count']} vs {actual_count}"
    print(f"   ✓ Count matches: {data['count']} calendars")
    
    # Test 3: Calendar structure
    print("\n✅ TEST 3: Calendar Data Structure")
    for i, calendar in enumerate(data['data'], 1):
        assert 'title' in calendar, f"Calendar {i} missing 'title'"
        assert 'url' in calendar, f"Calendar {i} missing 'url'"
        assert 'events' in calendar, f"Calendar {i} missing 'events'"
        assert 'source' in calendar, f"Calendar {i} missing 'source'"
        assert isinstance(calendar['events'], list), f"Calendar {i} events not a list"
        assert len(calendar['events']) > 0, f"Calendar {i} has no events"
        print(f"   ✓ Calendar {i}: '{calendar['title']}' - {len(calendar['events'])} events")
    
    # Test 4: Event format validation
    print("\n✅ TEST 4: Event Format Validation")
    sample_events = []
    for calendar in data['data']:
        if calendar['events']:
            sample_events.append({
                'calendar': calendar['title'],
                'event': calendar['events'][0]
            })
    
    for sample in sample_events[:3]:
        event = sample['event']
        # Check if event has date, day, and description
        parts = event.split(' ', 3)
        assert len(parts) >= 3, f"Event format issue: {event}"
        print(f"   ✓ '{sample['calendar'][:40]}...' - Valid format")
    
    # Test 5: PDF Links
    print("\n✅ TEST 5: PDF Links")
    pdf_count = len(data['pdf_links'])
    assert pdf_count > 0, "No PDF links found"
    for i, pdf in enumerate(data['pdf_links'], 1):
        assert 'title' in pdf, f"PDF {i} missing 'title'"
        assert 'url' in pdf, f"PDF {i} missing 'url'"
        assert pdf['url'].endswith('.pdf'), f"PDF {i} URL doesn't end with .pdf"
    print(f"   ✓ Found {pdf_count} PDF links")
    
    # Test 6: Total events
    print("\n✅ TEST 6: Total Events Count")
    total_events = sum(len(cal['events']) for cal in data['data'])
    print(f"   ✓ Total events across all calendars: {total_events}")
    assert total_events > 100, f"Too few events: {total_events}"
    
    # Summary
    print("\n" + "=" * 60)
    print("✅ ALL TESTS PASSED!")
    print("=" * 60)
    print(f"\n📊 Summary:")
    print(f"   • Calendars: {data['count']}")
    print(f"   • Total Events: {total_events}")
    print(f"   • PDF Links: {pdf_count}")
    print(f"   • Scrape Method: {data['scrape_method']}")
    print(f"   • Source: {data['source_url']}")
    print("\n✅ Data is ready for the frontend!")
    
    return True

if __name__ == '__main__':
    try:
        test_calendar_data()
    except AssertionError as e:
        print(f"\n❌ TEST FAILED: {e}")
        exit(1)
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        exit(1)


def test_normalize_text_examples():
    """Simple unit tests for normalization logic used by the scrapers.

    This mirrors the normalization implemented in the scrapers and ensures
    common malformed tokens are corrected.
    """
    import re

    def normalize_text(s: str) -> str:
        if not isinstance(s, str):
            return s
        s = re.sub(r"(\*+)\s*(\d)(st|nd|rd|th)\s*installment", r"\1 \2\3 installment", s, flags=re.IGNORECASE)
        s = re.sub(r"(\d)(st|nd|rd|th)\s*installment", r"\1\2 installment", s, flags=re.IGNORECASE)
        s = re.sub(r"(\d)(st|nd|rd|th)(Installment)", r"\1\2 installment", s, flags=re.IGNORECASE)
        s = re.sub(r"([a-z0-9])\.([A-Z])", r"\1. \2", s)
        s = re.sub(r"\s+", " ", s).strip()
        return s

    cases = [
        ("1stinstallment", "1st installment"),
        ("2ndInstallment", "2nd installment"),
        ("***3rdinstallment: A fine", "*** 3rd installment: A fine"),
        ("date.Transportation fee", "date. Transportation fee"),
        ("  multiple   spaces\nnew", "multiple spaces new"),
    ]

    for inp, expected in cases:
        out = normalize_text(inp)
        assert out == expected, f"normalize_text('{inp}') -> '{out}' (expected '{expected}')"


if __name__ == '__main__':
    # Run both tests when invoked directly
    try:
        test_calendar_data()
        test_normalize_text_examples()
        print('\n✅ Normalization tests passed')
    except AssertionError as e:
        print(f"\n❌ TEST FAILED: {e}")
        exit(1)
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        exit(1)
