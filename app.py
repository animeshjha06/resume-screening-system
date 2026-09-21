# app.py - Backend of the Automated Resume Screening System
# Idea: turn the job description and every resume into numbers (TF-IDF),
# then measure how similar each resume is to the job description (cosine similarity).

import re

import numpy as np
import pandas as pd
from flask import Flask, jsonify, render_template, request
from pypdf import PdfReader
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 50 * 1024 * 1024  # max total upload size = 50 MB


def read_pdf(file):
    """Read a PDF file and return all the text inside it."""
    reader = PdfReader(file)
    text = ""
    for page in reader.pages:
        text += (page.extract_text() or "") + " "
    return text


def clean_text(text):
    """Text preprocessing: lowercase, remove symbols and extra spaces."""
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s]", " ", text)  # keep only letters and numbers
    text = re.sub(r"\s+", " ", text)  # many spaces -> one space
    return text.strip()


@app.route("/")
def home():
    # Show the web page
    return render_template("index.html")


@app.route("/screen", methods=["POST"])
def screen():
    # ---------- Step 1: get the job description (pasted text OR PDF) ----------
    jd_text = request.form.get("jd_text", "").strip()
    jd_file = request.files.get("jd_file")

    if jd_file and jd_file.filename != "":
        if not jd_file.filename.lower().endswith(".pdf"):
            return jsonify(error="The job description file must be a PDF."), 400
        try:
            jd_text = read_pdf(jd_file)
        except Exception:
            return jsonify(error="Could not read the job description PDF."), 400

    if jd_text.strip() == "":
        return jsonify(error="Please add a job description."), 400

    # ---------- Step 2: read all resumes (PDF only) ----------
    names = []  # resume file names
    texts = []  # cleaned resume text
    skipped = []  # files we could not use

    for file in request.files.getlist("resumes"):
        if not file.filename.lower().endswith(".pdf"):
            skipped.append(file.filename + " (not a PDF)")
            continue
        try:
            text = read_pdf(file)
        except Exception:
            text = ""
        if text.strip() == "":
            skipped.append(file.filename + " (no readable text)")
            continue
        names.append(file.filename)
        texts.append(clean_text(text))

    if len(texts) == 0:
        return jsonify(error="No readable resumes found. Please upload text-based PDFs."), 400

    # ---------- Step 3: vectorization (text -> numbers) ----------
    # The job description goes first, so it becomes row 0
    all_texts = [clean_text(jd_text)] + texts
    vectorizer = TfidfVectorizer(stop_words="english")  # stop words = "the", "is", "and"...
    try:
        vectors = vectorizer.fit_transform(all_texts)
    except ValueError:
        return jsonify(error="The job description has no useful words."), 400

    # ---------- Step 4: similarity score of each resume with the job description ----------
    scores = cosine_similarity(vectors[0], vectors[1:])[0]  # values between 0 and 1

    # ---------- Step 5: rank candidates (highest score first) ----------
    table = pd.DataFrame({"name": names, "score": np.round(scores * 100, 1)})
    table = table.sort_values("score", ascending=False)

    return jsonify(results=table.to_dict("records"), skipped=skipped)


@app.errorhandler(413)
def too_large(error):
    # Runs when the uploaded files are bigger than MAX_CONTENT_LENGTH
    return jsonify(error="Files are too large. Keep the total under 50 MB."), 413


if __name__ == "__main__":
    app.run(debug=True)  # local development only; Render uses gunicorn
