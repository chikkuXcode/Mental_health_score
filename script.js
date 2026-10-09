/**
 * MindPulse — Interactive Client Logic & Analytics Engine
 */

const API_URL = "https://mental-health-score-vity.onrender.com/predict";

// DOM Elements
const form = document.getElementById("wellnessForm");
const hourFields = {
  social: form.elements.namedItem("avg_daily_usage_hours"),
  study: form.elements.namedItem("study_hours"),
  exercise: form.elements.namedItem("physical_activity_hours"),
  sleep: form.elements.namedItem("sleep_hours_per_night")
};

const hoursUsedEl = document.getElementById("hoursUsed");
const remainingPillEl = document.getElementById("remainingPill");
const remainingTextEl = document.getElementById("remainingText");
const hoursMessageEl = document.getElementById("hoursMessage");
const hoursBudgetCard = document.getElementById("hoursBudgetCard");

// Segments
const segSocial = document.getElementById("segSocial");
const segStudy = document.getElementById("segStudy");
const segExercise = document.getElementById("segExercise");
const segSleep = document.getElementById("segSleep");

// Labels
const lblSocial = document.getElementById("lblSocial");
const lblStudy = document.getElementById("lblStudy");
const lblExercise = document.getElementById("lblExercise");
const lblSleep = document.getElementById("lblSleep");

// Result Elements
const submitButton = document.getElementById("submitButton");
const resultStatus = document.getElementById("resultStatus");
const resultStatusBadge = document.getElementById("resultStatusBadge");
const scoreValue = document.getElementById("scoreValue");
const scoreCategory = document.getElementById("scoreCategory");
const scoreCategoryPill = document.getElementById("scoreCategoryPill");
const catEmoji = document.getElementById("catEmoji");
const resultText = document.getElementById("resultText");
const gaugeProgress = document.getElementById("gaugeProgress");
const errorBox = document.getElementById("errorBox");
const validationMessage = document.getElementById("validationMessage");
const recList = document.getElementById("recList");

// Metrics breakdown
const mSleepVal = document.getElementById("mSleepVal");
const mRatioVal = document.getElementById("mRatioVal");
const mPhysVal = document.getElementById("mPhysVal");

// Theme Toggle
const themeToggle = document.getElementById("themeToggle");

// SVG Gauge circumference (r=82 -> 2 * PI * 82 ≈ 515.22)
const GAUGE_CIRCUMFERENCE = 515.22;

/* ==========================================================================
   Theme Management
   ========================================================================== */
function initTheme() {
  const savedTheme = localStorage.getItem("mindpulse-theme") || "dark";
  document.documentElement.setAttribute("data-theme", savedTheme);
}

themeToggle.addEventListener("click", () => {
  const currentTheme = document.documentElement.getAttribute("data-theme") || "dark";
  const newTheme = currentTheme === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", newTheme);
  localStorage.setItem("mindpulse-theme", newTheme);
});

initTheme();

/* ==========================================================================
   24-Hour Daily Time Visualizer
   ========================================================================== */
function getHours() {
  return {
    social: Math.max(0, Number(hourFields.social.value) || 0),
    study: Math.max(0, Number(hourFields.study.value) || 0),
    exercise: Math.max(0, Number(hourFields.exercise.value) || 0),
    sleep: Math.max(0, Number(hourFields.sleep.value) || 0)
  };
}

function updateBudgetVisuals() {
  const { social, study, exercise, sleep } = getHours();
  const total = social + study + exercise + sleep;
  const remaining = 24 - total;
  const overLimit = total > 24.01; // small float tolerance

  // Update labels
  lblSocial.textContent = `${social.toFixed(1)}h`;
  lblStudy.textContent = `${study.toFixed(1)}h`;
  lblExercise.textContent = `${exercise.toFixed(1)}h`;
  lblSleep.textContent = `${sleep.toFixed(1)}h`;

  // Update Big Counter
  hoursUsedEl.textContent = total.toFixed(1);

  // Update Segment Widths
  const base = Math.max(total, 24);
  segSocial.style.width = `${(social / base) * 100}%`;
  segStudy.style.width = `${(study / base) * 100}%`;
  segExercise.style.width = `${(exercise / base) * 100}%`;
  segSleep.style.width = `${(sleep / base) * 100}%`;

  // Update pill & alerts
  hoursBudgetCard.classList.toggle("over-limit", overLimit);
  hoursMessageEl.classList.toggle("error", overLimit);

  if (overLimit) {
    const overAmt = (total - 24).toFixed(1);
    remainingTextEl.textContent = `${overAmt} hrs over limit!`;
    hoursMessageEl.textContent = `Total allocation exceeds 24 hours by ${overAmt}h. Please reduce time fields.`;
  } else if (Math.abs(remaining) < 0.05) {
    remainingTextEl.textContent = "100% Allocated";
    hoursMessageEl.textContent = "Your daily 24-hour cycle is completely budgeted.";
  } else {
    remainingTextEl.textContent = `${remaining.toFixed(1)} hrs free time`;
    hoursMessageEl.textContent = `${remaining.toFixed(1)} hours remain for meals, transit, relaxation, and free activities.`;
  }

  // Update real-time metrics breakdown preview
  updateLiveMetrics(social, study, exercise, sleep);

  return !overLimit;
}

function updateLiveMetrics(social, study, exercise, sleep) {
  // Sleep Health
  if (sleep >= 7 && sleep <= 9) {
    mSleepVal.textContent = `${sleep.toFixed(1)} hrs (Optimal)`;
    mSleepVal.style.color = "var(--color-success)";
  } else if (sleep >= 6) {
    mSleepVal.textContent = `${sleep.toFixed(1)} hrs (Moderate)`;
    mSleepVal.style.color = "var(--color-warning)";
  } else {
    mSleepVal.textContent = `${sleep.toFixed(1)} hrs (Sleep Deficit)`;
    mSleepVal.style.color = "var(--color-danger)";
  }

  // Ratio
  if (study > 0) {
    const ratio = (social / study).toFixed(2);
    mRatioVal.textContent = `${ratio} (${ratio < 0.7 ? "Productive" : ratio <= 1.2 ? "Balanced" : "High Screen"})`;
    mRatioVal.style.color = ratio <= 1.0 ? "var(--color-success)" : "var(--color-warning)";
  } else {
    mRatioVal.textContent = `${social.toFixed(1)}h Screen (No Study)`;
    mRatioVal.style.color = "var(--color-warning)";
  }

  // Exercise
  if (exercise >= 1) {
    mPhysVal.textContent = `${exercise.toFixed(1)} hr (Active)`;
    mPhysVal.style.color = "var(--color-success)";
  } else if (exercise > 0) {
    mPhysVal.textContent = `${exercise.toFixed(1)} hr (Light)`;
    mPhysVal.style.color = "var(--color-warning)";
  } else {
    mPhysVal.textContent = "0.0 hr (Sedentary)";
    mPhysVal.style.color = "var(--color-danger)";
  }
}

// Bind inputs
Object.values(hourFields).forEach((input) => {
  input.addEventListener("input", () => {
    updateBudgetVisuals();
    hideValidation();
  });
  input.addEventListener("change", () => {
    let val = Number(input.value);
    if (val < 0) input.value = "0";
    if (val > 24) input.value = "24";
    updateBudgetVisuals();
  });
});

/* ==========================================================================
   Quick Demo Presets
   ========================================================================== */
const PRESETS = {
  balanced: {
    age: 21,
    gender: "Female",
    academic_level: "Undergraduate",
    purpose_of_use: "Education",
    most_used_platform: "Instagram",
    daily_unlocks: 35,
    stress_level: "Low",
    avg_daily_usage_hours: 2,
    study_hours: 6.5,
    physical_activity_hours: 1.5,
    sleep_hours_per_night: 8
  },
  exam: {
    age: 22,
    gender: "Male",
    academic_level: "Graduate",
    purpose_of_use: "Education",
    most_used_platform: "YouTube",
    daily_unlocks: 60,
    stress_level: "High",
    avg_daily_usage_hours: 1.5,
    study_hours: 10,
    physical_activity_hours: 0.5,
    sleep_hours_per_night: 5.5
  },
  scroller: {
    age: 19,
    gender: "Male",
    academic_level: "High School",
    purpose_of_use: "Entertainment",
    most_used_platform: "TikTok",
    daily_unlocks: 110,
    stress_level: "Very High",
    avg_daily_usage_hours: 6.5,
    study_hours: 2,
    physical_activity_hours: 0.25,
    sleep_hours_per_night: 5
  }
};

document.querySelectorAll(".preset-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const key = btn.getAttribute("data-preset");
    const data = PRESETS[key];
    if (!data) return;

    // Fill form
    form.elements.namedItem("age").value = data.age;
    form.elements.namedItem("gender").value = data.gender;
    form.elements.namedItem("academic_level").value = data.academic_level;
    form.elements.namedItem("purpose_of_use").value = data.purpose_of_use;
    form.elements.namedItem("most_used_platform").value = data.most_used_platform;
    form.elements.namedItem("daily_unlocks").value = data.daily_unlocks;

    // Stress radio
    const radio = form.querySelector(`input[name="stress_level"][value="${data.stress_level}"]`);
    if (radio) radio.checked = true;

    // Hours
    hourFields.social.value = data.avg_daily_usage_hours;
    hourFields.study.value = data.study_hours;
    hourFields.exercise.value = data.physical_activity_hours;
    hourFields.sleep.value = data.sleep_hours_per_night;

    updateBudgetVisuals();
    hideValidation();
    clearApiError();

    // Trigger pulse effect on submit button
    submitButton.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
});

/* ==========================================================================
   Validation Helpers
   ========================================================================== */
function showValidation(message) {
  validationMessage.textContent = message;
  validationMessage.hidden = false;
  validationMessage.scrollIntoView({ behavior: "smooth", block: "center" });
}

function hideValidation() {
  validationMessage.textContent = "";
  validationMessage.hidden = true;
}

function showApiError(message) {
  errorBox.textContent = message;
  errorBox.hidden = false;
  resultStatus.textContent = "API CONNECTION FAILED";
  resultStatusBadge.style.color = "#fca5a5";
}

function clearApiError() {
  errorBox.textContent = "";
  errorBox.hidden = true;
  resultStatusBadge.style.color = "";
}

/* ==========================================================================
   AI Score Presentation & Recommendations
   ========================================================================== */
function animateGaugeScore(score) {
  const clampedScore = Math.min(Math.max(score, 0), 10);
  const percentage = clampedScore / 10;
  const offset = GAUGE_CIRCUMFERENCE * (1 - percentage);

  // Set progress bar offset
  gaugeProgress.style.strokeDashoffset = offset;

  // Change gauge color gradient based on score
  if (score >= 7.5) {
    gaugeProgress.style.stroke = "#10b981"; // Emerald
  } else if (score >= 6.2) {
    gaugeProgress.style.stroke = "#6366f1"; // Indigo
  } else if (score >= 5.0) {
    gaugeProgress.style.stroke = "#f59e0b"; // Amber
  } else {
    gaugeProgress.style.stroke = "#ef4444"; // Rose
  }

  // Number counting animation
  let current = 0;
  const step = score / 25;
  const interval = setInterval(() => {
    current += step;
    if (current >= score) {
      current = score;
      clearInterval(interval);
    }
    scoreValue.textContent = current.toFixed(2);
  }, 20);
}

function generateDynamicRecommendations(payload, score) {
  const recs = [];

  if (payload.sleep_hours_per_night === 0) {
    recs.push("Zero sleep duration is biologically unsustainable. Ensure you allocate 7–8 hours of restorative sleep daily.");
  } else if (payload.sleep_hours_per_night < 7) {
    recs.push("Increase sleep to at least 7.5 hours per night to significantly boost cognitive restoration and mood resilience.");
  }

  if (payload.avg_daily_usage_hours === 0 && payload.daily_unlocks === 0) {
    recs.push("You are completely disconnected from digital devices. While this prevents digital fatigue, ensure you stay connected with essential academic notifications.");
  } else if (payload.avg_daily_usage_hours > 3.5) {
    recs.push(`Your screen time (${payload.avg_daily_usage_hours}h) is above recommended student thresholds. Try setting a 45-minute daily limit on ${payload.most_used_platform}.`);
  }

  if (payload.study_hours === 0) {
    recs.push("0 study hours allocated. Dedicating regular focused sessions will improve academic confidence and reduce last-minute stress.");
  }

  if (payload.physical_activity_hours === 0) {
    recs.push("Sedentary routine detected (0h physical activity). Aim for at least 30–45 minutes of daily movement or light exercise.");
  } else if (payload.physical_activity_hours < 0.75) {
    recs.push("Incorporate at least 30 minutes of aerobic exercise or brisk walking to counteract sedentary study sessions.");
  }

  if (payload.daily_unlocks > 60) {
    recs.push(`You unlock your phone ${payload.daily_unlocks} times daily. Consider disabling non-essential lock-screen notifications to prevent focus disruption.`);
  }

  if (payload.stress_level === "High" || payload.stress_level === "Very High") {
    recs.push("Practice 5-minute deep breathing or mindfulness breaks between intensive study blocks to down-regulate cortisol levels.");
  }

  // If already stellar
  if (recs.length === 0) {
    recs.push("Great work! Your daily balance between study, rest, and physical exercise is exceptionally healthy.");
    recs.push("Continue maintaining consistent sleep schedules and mindful digital engagement.");
  }

  // Render
  recList.innerHTML = recs.map((r) => `<li>${r}</li>`).join("");
}

function updateCategoryDetails(score) {
  if (score >= 7.5) {
    catEmoji.textContent = "🌟";
    scoreCategory.textContent = "Optimal Equilibrium";
    scoreCategoryPill.style.borderColor = "rgba(16, 185, 129, 0.4)";
    scoreCategoryPill.style.background = "rgba(16, 185, 129, 0.15)";
    resultText.textContent = "Your digital habits, academic commitments, and restorative sleep form a high-vitality lifestyle balance.";
  } else if (score >= 6.2) {
    catEmoji.textContent = "🌿";
    scoreCategory.textContent = "Healthy Lifestyle";
    scoreCategoryPill.style.borderColor = "rgba(99, 102, 241, 0.4)";
    scoreCategoryPill.style.background = "rgba(99, 102, 241, 0.15)";
    resultText.textContent = "You have a solid wellness foundation. Small optimizations in screen moderation will further enhance energy levels.";
  } else if (score >= 5.0) {
    catEmoji.textContent = "⚖️";
    scoreCategory.textContent = "Moderate Strain";
    scoreCategoryPill.style.borderColor = "rgba(245, 158, 11, 0.4)";
    scoreCategoryPill.style.background = "rgba(245, 158, 11, 0.15)";
    resultText.textContent = "Noticeable strain detected. Screen usage or stress demands may be encroaching on recuperation time.";
  } else {
    catEmoji.textContent = "⚠️";
    scoreCategory.textContent = "High Digital Fatigue";
    scoreCategoryPill.style.borderColor = "rgba(239, 68, 68, 0.4)";
    scoreCategoryPill.style.background = "rgba(239, 68, 68, 0.15)";
    resultText.textContent = "High risk of burnout and cognitive fatigue. Prioritize sleep restoration and scheduled digital detox periods.";
  }
}

/* ==========================================================================
   Form Submission & API Pipeline
   ========================================================================== */
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearApiError();
  hideValidation();

  if (!form.reportValidity()) return;

  if (!updateBudgetVisuals()) {
    showValidation("The allocated hours exceed 24 hours. Please adjust the values before running prediction.");
    return;
  }

  const formData = new FormData(form);
  let rawDailyUnlocks = Number(formData.get("daily_unlocks"));
  let rawUsageHours = Number(formData.get("avg_daily_usage_hours"));
  let rawStudyHours = Number(formData.get("study_hours"));
  let rawPhysicalHours = Number(formData.get("physical_activity_hours"));
  let rawSleepHours = Number(formData.get("sleep_hours_per_night"));
  let rawAge = Number(formData.get("age"));

  // Intelligent edge-case handling for 0 & extreme cases
  // If someone has screen time > 0 but unlocks = 0, logically to use the phone for X hours requires at least minimal unlocks/sessions.
  if (rawUsageHours > 0 && rawDailyUnlocks === 0) {
    showValidation("Notice: You specified " + rawUsageHours + "h daily screen usage but 0 phone unlocks. Please enter realistic daily phone unlocks (minimum 1 if screen is used).");
    return;
  }

  // If sleep is 0
  if (rawSleepHours === 0) {
    showValidation("Sleep duration cannot be 0.0 hrs. Rest is essential for biological functioning. Please input your actual sleep hours.");
    return;
  }

  // If study, usage, exercise, and sleep are all 0
  if (rawUsageHours === 0 && rawStudyHours === 0 && rawPhysicalHours === 0 && rawSleepHours === 0) {
    showValidation("All 24-hour activities cannot be 0. Please specify your daily hours breakdown.");
    return;
  }

  const payload = {
    age: rawAge,
    gender: formData.get("gender"),
    academic_level: formData.get("academic_level"),
    most_used_platform: formData.get("most_used_platform"),
    purpose_of_use: formData.get("purpose_of_use"),
    avg_daily_usage_hours: rawUsageHours,
    daily_unlocks: rawDailyUnlocks,
    study_hours: rawStudyHours,
    physical_activity_hours: rawPhysicalHours,
    sleep_hours_per_night: rawSleepHours,
    stress_level: formData.get("stress_level")
  };

  // UI Processing State
  submitButton.disabled = true;
  submitButton.querySelector(".btn-text").textContent = "Analyzing Patterns…";
  resultStatus.textContent = "RUNNING INFERENCE";
  resultText.textContent = "Passing feature vector to trained Random Forest / GBDT pipeline…";

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const responseData = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = responseData.detail;
      const message = Array.isArray(detail)
        ? detail.map((i) => i.msg).join("; ")
        : (typeof detail === "string" ? detail : `Request failed (${response.status}).`);
      throw new Error(message);
    }

    const score = Number(responseData.predicted_mental_health_score ?? responseData.prediction);
    if (!Number.isFinite(score)) {
      throw new Error("Invalid prediction payload received from FastAPI model.");
    }

    // Success update
    resultStatus.textContent = "ANALYSIS COMPLETE";
    resultStatusBadge.style.color = "";
    animateGaugeScore(score);
    updateCategoryDetails(score);
    generateDynamicRecommendations(payload, score);

  } catch (error) {
    console.error("FastAPI error:", error);

    // Reset gauge and score display on failure
    gaugeProgress.style.strokeDashoffset = GAUGE_CIRCUMFERENCE;
    gaugeProgress.style.stroke = "rgba(255, 255, 255, 0.1)";
    scoreValue.textContent = "—";
    
    // Update status to Failed
    resultStatus.textContent = "CONNECTION FAILED";
    resultStatusBadge.style.color = "#fca5a5";
    
    catEmoji.textContent = "⚠️";
    scoreCategory.textContent = "Prediction Unavailable";
    scoreCategoryPill.style.borderColor = "rgba(239, 68, 68, 0.4)";
    scoreCategoryPill.style.background = "rgba(239, 68, 68, 0.15)";
    resultText.textContent = "Could not retrieve prediction from the machine learning model.";

    // Troubleshooting advice
    recList.innerHTML = `
    <li>Check that your deployed FastAPI backend is running.</li>
    <li>Verify the backend URL:
        <a href="https://mental-health-score-vity.onrender.com/"
          target="_blank" rel="noopener noreferrer">
          Open API
        </a>
    </li>
    <li>Make sure CORS is configured to allow your deployed frontend.</li>
    <li>Check your Render logs if the API or model fails to load.</li>`;

    if (error.message.includes("Failed to fetch")) {
      showApiError(
        "Could not connect to the backend. Check the deployed API URL, backend status, and CORS settings."
      );
    } else {
      showApiError(`Model API Error: ${error.message}`);
    }
  } finally {
    submitButton.disabled = false;
    submitButton.querySelector(".btn-text").textContent = "Generate AI Wellness Score";
  }
});

// Periodic check for backend health to update topbar pill
async function checkBackendHealth() {
  const pill = document.getElementById("apiStatusPill");
  const dot = pill.querySelector(".status-pulse-dot");
  const text = pill.querySelector(".status-text");
  
  try {
    const res = await fetch("https://mental-health-score-vity.onrender.com/", { method: "GET" });
    if (res.ok) {
      dot.style.backgroundColor = "var(--color-success)";
      dot.style.boxShadow = "0 0 10px var(--color-success)";
      text.textContent = "FastAPI Online";
    } else {
      throw new Error();
    }
  } catch (e) {
    dot.style.backgroundColor = "var(--color-danger)";
    dot.style.boxShadow = "0 0 10px var(--color-danger)";
    text.textContent = "FastAPI Offline";
  }
}

checkBackendHealth();
setInterval(checkBackendHealth, 10000);

// Initial Budget Calculation
updateBudgetVisuals();