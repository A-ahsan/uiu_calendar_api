import requests
from bs4 import BeautifulSoup
import io
import re
from PyPDF2 import PdfReader
import json
from spellchecker import SpellChecker
import os

BASE_URL = "https://www.uiu.ac.bd/academics/calendar/"

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

    # Final pass: small cosmetic fixes
    final = []
    for line in joined:
        # remove duplicated spaces
        line = re.sub(r"\s+", " ", line).strip()
        # fix common OCR mistakes like 'Dec 0 8' already handled by digit merge above
        # remove trailing commas or stray leading punctuation
        line = line.strip(' ,;:\t')
        # ensure proper spacing after commas
        line = re.sub(r",\s*", ", ", line)
    # normalize hyphen spacing when hyphen connects word parts (Make -up -> Make-up)
        line = re.sub(r"(?<=\w)\s*-\s*(?=\w)", "-", line)

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
            reader = PdfReader(pdf_file)

            text = ""
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
