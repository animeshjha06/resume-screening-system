# Automated Resume Screening System

A small web app that ranks resumes against a job description using **NLP and Machine Learning**.

- Upload many resumes (PDF only)
- Add the job description as pasted text or a PDF
- Get a ranked list with a match score for every resume

**Tech:** Python, Flask, Scikit-learn, Pandas, NumPy, HTML, CSS, JavaScript

---

## How it works

1. **Read** the text from every PDF (`pypdf`).
2. **Preprocess** the text: lowercase, remove symbols and extra spaces.
3. **Vectorize** the job description and resumes with **TF-IDF** (words become numbers, common words like "the" are removed).
4. **Compare** each resume with the job description using **cosine similarity** (0% = nothing in common, 100% = identical).
5. **Rank** the resumes from the highest score to the lowest (`pandas`).

> Scores are relative. A score of 40%+ is already a strong match, because resumes and job descriptions never share every word.

---

## Project structure

```
resume-screening-system/
├── app.py               # Flask backend + ML logic
├── templates/
│   └── index.html       # Web page
├── static/
│   ├── style.css        # Styling
│   └── script.js        # Page interactions
├── pyproject.toml       # Dependencies (used by uv)
├── uv.lock              # Exact versions (created by uv)
└── requirements.txt     # Dependencies for Render only
```

---

## Run locally with uv

**1. Install uv** (one time)

```bash
# macOS / Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# Windows (PowerShell)
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
```

**2. Install the project dependencies**

```bash
uv sync
```

**3. Start the app**

```bash
uv run app.py
```

**4. Open** http://127.0.0.1:5000 in your browser.

To stop the app, press `Ctrl + C`.

---

## Notes

- Only **text-based PDFs** work. Scanned PDFs (photos of paper) have no text to read, so they are skipped and listed under the results.
- Files are read in memory and never saved on the server.
- Total upload limit is 50 MB per request.
