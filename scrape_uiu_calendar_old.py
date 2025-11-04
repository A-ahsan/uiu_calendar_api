import requests
from bs4 import BeautifulSoup
import io
import re
from PyPDF2 import PdfReader
import pdfplumber
import json
from spellchecker import SpellChecker
import os
from difflib import get_close_matches

BASE_URL = "https://www.uiu.ac.bd/academics/calendar/"

# Common words/names that appear in academic calendars (for spell checking)
CALENDAR_VOCABULARY = {
    'uiu', 'academic', 'calendar', 'advising', 'registration', 'trimester', 'semester',
    'undergraduate', 'graduate', 'pharmacy', 'installment', 'tuition', 'refund',
    'withdrawal', 'orientation', 'exam', 'midterm', 'final', 'classes', 'holiday',
    'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august',
    'september', 'october', 'november', 'december', 'jan', 'feb', 'mar', 'apr',
    'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec', 'monday', 'tuesday',
    'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'mon', 'tue', 'wed',
    'thu', 'fri', 'sat', 'sun', 'bangladesh', 'bangla', 'victory', 'independence',
    'shaheed', 'diwas', 'janmashtami', 'durga', 'puja', 'eid', 'fitr', 'adha',
    'miladunnabi', 'ashura', 'shab', 'barat', 'qadr', 'buddha', 'purnima',
    'saraswati', 'christmas', 'jumatul', 'widaa', 'department', 'program', 'office',
    'project', 'thesis', 'internship', 'courses', 'grade', 'submission', 'fine',
    'applicable', 'transport', 'suspended', 'preparation', 'admission', 'test'
}

def extract_events(text):
    """
    Return a polished list of non-empty lines extracted from the PDF text.

    - Splits text into lines
    - Strips leading/trailing whitespace and bullets/dashes
    - Collapses multiple internal whitespace to single spaces
    - Filters out empty lines
    Returns a list of strings (one per cleaned line).
    """
    if not text:
        return []

    # basic normalize: unify spaces and replace common bullets
    text = text.replace('\u2022', '-')  # bullet
    text = text.replace('\u2023', '-')
    text = text.replace('\u00B7', '-')
    text = text.replace('', '-')
    text = text.replace('\u2013', '-')
    text = text.replace('\u2014', '-')

    raw_lines = [ln.rstrip() for ln in text.splitlines()]

    # First pass: clean each line
    cleaned = []
    for raw in raw_lines:
        line = raw.strip()
        if not line:
            continue
        # collapse multiple whitespace into single space
        line = re.sub(r"\s+", " ", line)
        # remove stray leading/trailing bullets/dashes or punctuation
        line = line.strip(" \t\u2022-–—•.\u00B7")
        if line:
            cleaned.append(line)

    # Second pass: join hyphenated line breaks and obvious continuations
    joined = []
    i = 0
    continuation_starters = {"and","or","for","to","by","the","a","an","concerned","of","with","fees","fee","students","last","lastday","last day"}
    while i < len(cleaned):
        cur = cleaned[i]
        # fix digit splits like '1 6' -> '16' and '2 026' -> '2026'
        cur = re.sub(r"(?<=\d)\s+(?=\d)", "", cur)

        # if line ends with a hyphen, merge with next line (remove hyphen)
        if cur.endswith('-') and i + 1 < len(cleaned):
            nxt = cleaned[i+1]
            merged = cur[:-1].rstrip() + nxt.lstrip()
            cleaned[i+1] = merged
            # don't push cur yet; skip to next which has been merged
            i += 1
            continue

        # if current line looks like it should continue with the next
        if i + 1 < len(cleaned):
            nxt = cleaned[i+1]
            nxt_first = nxt.split()[0].lower() if nxt.split() else ''
            # merge when current line doesn't end with strong punctuation and next starts with a small/continuation word
            if not re.search(r"[\.\?!:]$", cur) and (nxt_first in continuation_starters or cur.split()[-1].lower() in continuation_starters or len(nxt.split())<4):
                merged = cur + ' ' + nxt
                cleaned[i+1] = merged
                i += 1
                continue

        joined.append(cur)
        i += 1

    # Final pass: small cosmetic fixes and duplicate removal
    final = []
    seen = set()  # track unique lines to avoid duplicates
    
    # Filter patterns to skip (headers, footers, page numbers, logos)
    skip_patterns = [
        r'^(rev|page|logo)\s*\d*$',  # Rev 03, Page 1, logo
        r'^download\s*pdf$',
        r'^\d+\s+(undergraduate|graduate|pharmacy)',  # 252 Graduate Programs
        r'^united.{0,30}university',  # headers (with typos)
        r'^revised\s+academic\s+calendar',
        r'academic\s+calendar\s+for\s+(undergraduate|graduate|bachelor)',  # calendar headers
        r'^(spring|summer|fall)\s+\d{4}\s+(semester|trimester)',  # isolated semester headers
        r'^bachelor\s+of\s+pharmacy',
        r'^for\s+(undergraduate|graduate)',  # "For Undergraduate Programs"
        r'^(bba|mba|bs|ms|mph|pharm)',  # isolated program codes
        r'^\s*$',  # empty lines
        r'^classes\s+of\s+(spring|summer|fall)\s+\d{4}',  # "Classes of Fall 2025"
        r'^admission\s+test',  # "Admission Test for..."
        r'^n\(.*?e:.*schedule',  # NOTE: lines at bottom
        r'department.*program.*office.*rev',  # footer lines
        r'^semester\s+begin:',  # "Semester Begin:"
        r'last\s+date\s+of\s+admission:'  # admission dates at bottom
    ]
    
    for line in joined:
        # remove duplicated spaces
        line = re.sub(r"\s+", " ", line).strip()
        
        # Fix common OCR errors
        # Year corrections
        line = line.replace('2O25', '2025').replace('2O26', '2026')
        line = line.replace('2o25', '2025').replace('2o26', '2026')
        line = line.replace('2A25', '2025').replace('2S2, 5', '2025').replace('?O25', '2025')
        
        # Month corrections
        line = line.replace('Jul2l', 'Jul 21').replace('Ju, l', 'Jul ').replace('Ju[', 'Jul ')
        line = line.replace('ttug', 'Aug').replace('Atg', 'Aug').replace('Au;g', 'Aug')
        line = line.replace('Arug', 'Aug').replace('Au9', 'Aug').replace('{ug', 'Aug')
        line = line.replace('$ep', 'Sep').replace('3eO=6', 'Sep 6')
        line = line.replace('{}ct', 'Oct').replace('0ct', 'Oct').replace('Oi ', 'Oct ')
        line = line.replace('Oct-2', 'Oct 2').replace('Oct-.', 'Oct ')
        line = line.replace('31-=NoY', '31-Nov').replace('8J025', '8, 2025')
        
        # Day of week corrections
        line = line.replace('trIed', 'Wed').replace('Tore', 'Tue').replace('$at', 'Sat')
        line = line.replace('|xu', 'Thu').replace('(Say', '(Sat)')
        
        # Holiday corrections
        line = line.replace('flolidai', 'Holiday').replace('IXoliday', 'Holiday')
        line = line.replace('.Ilolidfl', 'Holiday').replace('Itroliday', 'Holiday')
        
        # Festival name corrections
        line = line.replace('Duran', 'Durga').replace('Dulia Fuji', 'Durga Puja')
        line = line.replace('Fuma', 'Puja').replace('Dibash', 'Diwas')
        line = line.replace('Jump\'atul-Widaa', 'Jumatul-Widaa')
        line = line.replace('Did-e-', 'Eid-e-').replace('Did-ul-', 'Eid-ul-')
        line = line.replace('Fit\'r', 'Fitr').replace('Had\'r', 'Hadr')
        line = line.replace('Bangle', 'Bangla')
        
        # Academic term corrections
        line = line.replace('M*ke-up', 'Make-up').replace('claS5l', 'class')
        line = line.replace('8*gulag', 'Regular').replace('$attrday', 'Saturday')
        line = line.replace('T\\ration', 'Tuition').replace('Regishation', 'Registration')
        line = line.replace('offspring', 'of Spring').replace('oftanyl', 'of any')
        line = line.replace('(tfanyl', '(if any)')
        line = line.replace('E:ram', 'Exam').replace('Old-Term', 'Mid-Term')
        
        # Ordinal number corrections
        line = line.replace('l"t', '1st').replace('l$', '1st')
        line = line.replace('3.d', '3rd')
        line = line.replace('4u,', '4th')
        line = line.replace('J installment', '3rd installment')
        
        # Percentage and currency corrections
        line = line.replace('1007o', '100%').replace('507o', '50%').replace('70o/o', '70%')
        line = line.replace('25o/o', '25%').replace('5Oo/o', '50%').replace('l0oo/o', '100%')
        line = line.replace('75%tuition', '75% Tuition').replace('5OO/', '500/')
        line = line.replace('Tic ', 'Tk. ').replace('Tic.', 'Tk.')
        
        # Date range corrections
        line = line.replace('..Mon \"', 'Mon-').replace('Mo-n-Fri', 'Mon-Fri')
        
        # Misc OCR noise
        line = line.replace('drill', 'will').replace('rn if', '').replace('ellis', 'this')
        line = line.replace('ofthe', 'of the').replace('Govemment', 'Government')
        line = line.replace('Got.', 'Govt.').replace('Bangladeshrfr', 'Bangladesh')
        line = line.replace('Girl-e-', 'Eid-e-').replace('Did:e-', 'Eid-e-')
        line = line.replace('M-ileaii', 'Miladunnabi').replace('ashram i', 'Janmashtami')
        line = line.replace('Changeofa', 'Change of a').replace('Pharmf F\'all', 'Pharm Fall')
        line = line.replace('lf applicable', 'if applicable').replace('LL,', '11,')
        line = line.replace('ls Admission', '1st Admission').replace('l\" Admission', '1st Admission')
        line = line.replace('Oct31-Nov', 'Oct 31-Nov').replace(':I\'ri-', 'Fri-')
        line = line.replace('floliday:', 'Holiday:').replace('durga Puma', 'Durga Puja')
        line = line.replace('r, \'', '').replace(', only}', ' only)')
        line = line.replace('Oct\'3', 'Oct 3').replace(' \' ', ' ')
        line = line.replace('Aug I3', 'Aug 13').replace('T-13', '7-13')
        line = line.replace('Aug2,', 'Aug 2,').replace('Aug27,', 'Aug 27,')
        line = line.replace('Aug6,', 'Aug 6,').replace('Aug13,', 'Aug 13,')
        line = line.replace('Aug21,', 'Aug 21,').replace('Sep22,', 'Sep 22,')
        line = line.replace('Sep5-', 'Sep 5-').replace('Sep29 ', 'Sep 29-')
        line = line.replace('Oct22-21', 'Oct 22-31').replace('Dec2l,', 'Dec 21,')
        line = line.replace('Oct12,', 'Oct 12,').replace('Oct3,', 'Oct 3,')
        line = line.replace('Sep18.', 'Sep 18,').replace('Aug 512025', 'Aug 5, 2025')
        line = line.replace('Sep6, 2S2, 5', 'Sep 6, 2025').replace('Oct. -*,', 'Oct 2-3,')
        line = line.replace('Oct-2,', 'Oct 2,').replace('Puma', 'Puja')
        line = line.replace('\'Sep', 'Sep').replace('(Say', '(Sat)')
        line = line.replace('Stab-e-', 'Shab-e-')
        line = line.replace('Jump\'atul', 'Jumatul').replace('ΓÇÖ', '\'')
        
        # Skip if matches any filter pattern
        if any(re.match(pat, line, re.I) for pat in skip_patterns):
            continue
        
        # Skip very short lines (likely fragments)
        if len(line) < 10:
            continue
        
        # remove trailing commas or stray leading punctuation
        line = line.strip(' ,;:\t')
        # ensure proper spacing after commas
        line = re.sub(r",\s*", ", ", line)
        # normalize hyphen spacing when hyphen connects word parts (Make -up -> Make-up)
        line = re.sub(r"(?<=\w)\s*-\s*(?=\w)", "-", line)
        
        # Skip duplicate lines (case-insensitive comparison)
        line_lower = line.lower()
        if line_lower in seen:
            continue
        seen.add(line_lower)

        # attempt to repair common mid-word splits produced by PDFs/OCR
        # Heuristic: if a space separates a long fragment and a short lowercase fragment
        # (e.g. 'Banglade sh' or 'Prog ram'), join them, but avoid joining common
        # valid short words like 'last day'. We use a small blacklist to reduce false joins.
        blacklist = {
            # common short words that must not be joined
            'last', 'day', 'make', 'final', 'course', 'admission', 'first', 'second', 'third',
            'classes', 'class', 'exam', 'holiday', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun',
            'for', 'and', 'the', 'to', 'of', 'in', 'on', 'by', 'with',
            # additional small words that frequently appear and should remain separate
            'be', 'is', 'are', 'was', 'were', 'as', 'at', 'up', 'no', 'not', 'or',
            'if', 'fee', 'due', 'per', 'but', 'too', 'all', 'any'
        }

        def _fix_mid_word_splits(s):
            # replace occurrences of "<frag1> <frag2>" where frag1 is >=3 letters and frag2 is 1-3 lowercase letters
            # and frag1.lower() not in blacklist
            def _join(m):
                a = m.group(1)
                b = m.group(2)
                if a.lower() in blacklist or b.lower() in blacklist:
                    return a + ' ' + b
                return a + b

            return re.sub(r"([A-Za-z]{3,})\s+([a-z]{1,3})(?=\b)", _join, s)

        line = _fix_mid_word_splits(line)

        # Optional spellchecking pass to fix broken tokens (e.g. 'Banglade sh' -> 'Bangladesh')
        # Use a lightweight spellchecker and a conservative whitelist/blacklist to avoid changing
        # dates, abbreviations, program codes, or currency tokens.
        try:
            spell = SpellChecker(distance=1)

            # whitelist of tokens we must not change (lowercase)
            months = {m.lower() for m in (
                ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'])}
            keep = set([
                'uiu', 'rev', 'tk', 'bba', 'bs', 'bsc', 'bse', 'bsds', 'bsce', 'bsse', 'msc', 'mph',
                'mpharm', 'pharm', 'office', 'department', 'program'
            ]) | months

            def _spell_fix(s):
                # split keeping punctuation so we can process word tokens only
                parts = re.split(r'(\W+)', s)
                out_parts = []
                for p in parts:
                    if not p:
                        continue
                    # if token is purely alphabetic and reasonably long, consider correcting
                    if p.isalpha() and len(p) >= 3:
                        low = p.lower()
                        # don't touch tokens that look like abbreviations (all upper) or in keep list
                        if p.isupper() and len(p) <= 5:
                            out_parts.append(p)
                            continue
                        if low in keep:
                            out_parts.append(p)
                            continue
                        # don't touch tokens that are likely program codes or proper nouns if they contain mixed case
                        # ask spellchecker for a correction
                        cand = spell.correction(low)
                        if cand and cand != low:
                            # preserve capitalization
                            if p[0].isupper():
                                cand = cand.capitalize()
                            out_parts.append(cand)
                            continue
                    out_parts.append(p)
                return ''.join(out_parts)

            line = _spell_fix(line)
        except Exception:
            # keep original line if spellchecker fails for any reason
            pass

        final.append(line)

    return final


def scrape_uiu_calendars():
    response = requests.get(BASE_URL)
    response.raise_for_status()
    soup = BeautifulSoup(response.text, "html.parser")

    pdf_links = soup.find_all("a", href=lambda x: x and x.endswith(".pdf"))
    data = []

    for link in pdf_links:
        raw_title = link.text.strip() or "Download PDF"
        url = link["href"]
        if not url.startswith("http"):
            url = "https://www.uiu.ac.bd" + url

        print(f"📄 Extracting: {raw_title} -> {url}")

        try:
            pdf_resp = requests.get(url)
            pdf_resp.raise_for_status()
            pdf_file = io.BytesIO(pdf_resp.content)
            
            # Try pdfplumber first for better table extraction
            text = ""
            try:
                with pdfplumber.open(pdf_file) as pdf:
                    for page in pdf.pages:
                        # Extract tables first - join cells properly
                        tables = page.extract_tables()
                        if tables:
                            for table in tables:
                                for row in table:
                                    if row and len(row) >= 2:
                                        # Clean and join cells (typically: date | day | event)
                                        cells = []
                                        for cell in row:
                                            if cell:
                                                # Clean cell text
                                                cell_text = str(cell).strip()
                                                # Remove line breaks within cell
                                                cell_text = cell_text.replace('\n', ' ')
                                                if cell_text:
                                                    cells.append(cell_text)
                                        
                                        if cells:
                                            # Join with space to create one line per row
                                            row_text = " ".join(cells)
                                            text += row_text + "\n"
                        
                        # Also extract non-table text (headers, notes at bottom)
                        # But filter out text that's already in tables to avoid duplication
                        page_text = page.extract_text()
                        if page_text and not tables:
                            # Only use full page text if no tables were found
                            text += page_text + "\n"
            except Exception as e:
                print(f"  ⚠️ pdfplumber failed, falling back to PyPDF2: {e}")
                # Fallback to PyPDF2
                pdf_file.seek(0)
                reader = PdfReader(pdf_file)
                for page in reader.pages:
                    text += page.extract_text() or ""

            events = extract_events(text)
            # Use the PDF filename (decoded, without extension) as the calendar title
            def title_from_url(url_str: str):
                try:
                    import urllib.parse
                    path = urllib.parse.urlparse(url_str).path
                    name = os.path.basename(path)
                    name = urllib.parse.unquote(name)
                    # remove .pdf and common prefixes/suffixes
                    name = re.sub(r"\.pdf$", "", name, flags=re.I)
                    # replace underscores/dashes with spaces
                    name = re.sub(r"[_\-]+", " ", name)
                    return name.strip()
                except Exception:
                    return raw_title

            title = title_from_url(url)

            data.append({
                "title": title,
                "url": url,
                "events": events
            })

        except Exception as e:
            print(f"⚠️ Error reading PDF {url}: {e}")
            # still attempt to create a friendly title even if PDF failed to parse
            try:
                # compute a fallback title from raw_title and URL
                def make_friendly_title_on_error(raw_title: str, url_str: str):
                    import re, urllib.parse
                    if raw_title and not re.search(r"download\s*pdf", raw_title, re.I):
                        return raw_title
                    if url_str:
                        try:
                            path = urllib.parse.urlparse(url_str).path
                            name = os.path.basename(path)
                            name = urllib.parse.unquote(name).replace('_', ' ').replace('-', ' ').replace('.pdf', '')
                            if name:
                                return name[:100]
                        except Exception:
                            pass
                    return raw_title or 'Academic Calendar'

                fallback_title = make_friendly_title_on_error(raw_title, url)
            except Exception:
                fallback_title = raw_title

            data.append({
                "title": fallback_title,
                "url": url,
                "events": []
            })

    return {
        "count": len(data),
        "data": data
    }


if __name__ == "__main__":
    result = scrape_uiu_calendars()
    # Print summary to stdout
    print(json.dumps(result, indent=2, ensure_ascii=False))

    # Also write a simplified JSON file for the web UI (array of calendars)
    out_dir = os.path.join(os.path.dirname(__file__), 'web')
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, 'calendars.json')
    try:
        with open(out_path, 'w', encoding='utf-8') as f:
            json.dump(result.get('data', []), f, ensure_ascii=False, indent=2)
        print(f"Wrote {out_path}")
    except Exception as e:
        print(f"Failed to write web JSON: {e}")
