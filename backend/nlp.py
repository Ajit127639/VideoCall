import re
from collections import Counter

def clean_text(text):
    text = text.lower()
    text = re.sub(r"[^a-zA-Z0-9\s]", "", text)
    return text

def summarize_text(text):
    sentences = text.split(".")
    return ".".join(sentences[:2]).strip()

def extract_keywords(text, limit=8):
    text = clean_text(text)
    words = text.split()
    freq = Counter(words)
    return [w for w, _ in freq.most_common(limit) if len(w) > 4]
