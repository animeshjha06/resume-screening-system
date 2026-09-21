// script.js - makes the page interactive and talks to the Flask backend

// ---------- Get the page elements we need ----------
const form = document.getElementById("screen-form");
const tabs = document.querySelectorAll(".tab");
const jdText = document.getElementById("jd-text");
const jdPdfBox = document.getElementById("jd-pdf-box");
const jdFile = document.getElementById("jd-file");
const jdFileName = document.getElementById("jd-file-name");
const dropzone = document.getElementById("dropzone");
const resumeInput = document.getElementById("resume-input");
const fileList = document.getElementById("file-list");
const message = document.getElementById("message");
const submitBtn = document.getElementById("submit-btn");
const resetBtn = document.getElementById("reset-btn");
const emptyText = document.getElementById("empty-text");
const loading = document.getElementById("loading");
const summary = document.getElementById("summary");
const results = document.getElementById("results");
const skipped = document.getElementById("skipped");

// ---------- Variables that remember the user's choices ----------
let jdMode = "text"; // "text" or "pdf"
let resumes = []; // list of resume files selected by the user

// ---------- Job description tabs ----------
tabs.forEach(function (tab) {
  tab.addEventListener("click", function () {
    jdMode = tab.dataset.mode;

    // highlight the clicked tab
    tabs.forEach(function (t) {
      t.classList.toggle("active", t === tab);
    });

    // show the textarea OR the PDF picker
    jdText.classList.toggle("hidden", jdMode !== "text");
    jdPdfBox.classList.toggle("hidden", jdMode !== "pdf");
  });
});

jdFile.addEventListener("change", function () {
  jdFileName.textContent = jdFile.files.length > 0 ? jdFile.files[0].name : "Choose a job description PDF";
});

// ---------- Resume selection (click or drag and drop) ----------
resumeInput.addEventListener("change", function () {
  addResumes(resumeInput.files);
  resumeInput.value = ""; // so the same file can be picked again later
});

dropzone.addEventListener("dragover", function (event) {
  event.preventDefault(); // needed to allow dropping
  dropzone.classList.add("dragging");
});

dropzone.addEventListener("dragleave", function () {
  dropzone.classList.remove("dragging");
});

dropzone.addEventListener("drop", function (event) {
  event.preventDefault();
  dropzone.classList.remove("dragging");
  addResumes(event.dataTransfer.files);
});

function addResumes(files) {
  for (const file of files) {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      showError(file.name + " is not a PDF, so it was ignored.");
      continue;
    }
    // avoid adding the same file twice
    const alreadyAdded = resumes.some(function (r) {
      return r.name === file.name && r.size === file.size;
    });
    if (!alreadyAdded) {
      resumes.push(file);
    }
  }
  showFileList();
}

function showFileList() {
  fileList.innerHTML = "";
  resumes.forEach(function (file, index) {
    const item = document.createElement("li");

    const name = document.createElement("span");
    name.className = "file-name";
    name.textContent = file.name;

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "remove-btn";
    removeBtn.textContent = "×";
    removeBtn.setAttribute("aria-label", "Remove " + file.name);
    removeBtn.addEventListener("click", function () {
      resumes.splice(index, 1); // remove this file from the list
      showFileList();
    });

    item.append(name, removeBtn);
    fileList.appendChild(item);
  });
}

// ---------- Messages ----------
function showError(text) {
  message.textContent = text;
  message.classList.remove("hidden");
}

function hideError() {
  message.classList.add("hidden");
}

// ---------- Submit: send everything to the backend ----------
form.addEventListener("submit", async function (event) {
  event.preventDefault(); // stop the page from reloading
  hideError();

  // Collect the data to send
  const formData = new FormData();

  if (jdMode === "text") {
    if (jdText.value.trim() === "") {
      showError("Please paste a job description.");
      return;
    }
    formData.append("jd_text", jdText.value.trim());
  } else {
    if (jdFile.files.length === 0) {
      showError("Please choose a job description PDF.");
      return;
    }
    formData.append("jd_file", jdFile.files[0]);
  }

  if (resumes.length === 0) {
    showError("Please add at least one resume.");
    return;
  }
  resumes.forEach(function (file) {
    formData.append("resumes", file);
  });

  // Show the loading spinner
  submitBtn.disabled = true;
  emptyText.classList.add("hidden");
  summary.classList.add("hidden");
  skipped.classList.add("hidden");
  results.innerHTML = "";
  loading.classList.remove("hidden");

  try {
    const response = await fetch("/screen", { method: "POST", body: formData });
    const data = await response.json();

    if (!response.ok) {
      showError(data.error);
      emptyText.classList.remove("hidden");
    } else {
      showResults(data);
    }
  } catch (error) {
    showError("Could not reach the server. Please try again.");
    emptyText.classList.remove("hidden");
  }

  loading.classList.add("hidden");
  submitBtn.disabled = false;
});

// ---------- Show the ranked list ----------
function getLabel(score) {
  if (score >= 40) return { text: "Strong match", css: "strong" };
  if (score >= 20) return { text: "Fair match", css: "fair" };
  return { text: "Low match", css: "low" };
}

function showResults(data) {
  summary.textContent = data.results.length + " resume(s) ranked. Best match: " + data.results[0].name;
  summary.classList.remove("hidden");

  data.results.forEach(function (item, index) {
    const label = getLabel(item.score);
    const card = document.createElement("div");
    card.className = index === 0 ? "result top" : "result";
    card.innerHTML =
      '<div class="rank">' + (index + 1) + "</div>" +
      '<div><div class="name-row"><span class="name"></span>' +
      '<span class="chip ' + label.css + '">' + label.text + "</span></div>" +
      '<div class="bar"><div class="fill"></div></div></div>' +
      '<div class="score">' + item.score + "%</div>";

    // textContent is safer than innerHTML for file names
    card.querySelector(".name").textContent = item.name;
    results.appendChild(card);

    // grow the bar after a short delay so the animation plays
    setTimeout(function () {
      card.querySelector(".fill").style.width = item.score + "%";
    }, 50);
  });

  // files that could not be read
  if (data.skipped.length > 0) {
    skipped.textContent = "Skipped: " + data.skipped.join(", ");
    skipped.classList.remove("hidden");
  }
}

// ---------- Start over ----------
resetBtn.addEventListener("click", function () {
  form.reset();
  jdFileName.textContent = "Choose a job description PDF";
  resumes = [];
  showFileList();
  hideError();
  results.innerHTML = "";
  summary.classList.add("hidden");
  skipped.classList.add("hidden");
  emptyText.classList.remove("hidden");
});
