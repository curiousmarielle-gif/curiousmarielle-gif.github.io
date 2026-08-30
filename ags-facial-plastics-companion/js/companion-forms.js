/* Live attendee feedback + prevalidation questionnaire for the static GitHub companion. */
(function () {
  function shuffle(items) {
    const a = items.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function scores(name, n, labels) {
    const opts = labels || Array.from({ length: n }, (_, i) => String(i + 1));
    return `<div class="score-row" role="radiogroup" data-name="${name}">${opts
      .map((lab, i) => {
        const v = labels ? lab.value || lab : i + 1;
        const t = labels ? lab.label || lab : String(i + 1);
        return `<button type="button" class="score" data-value="${v}">${t}</button>`;
      })
      .join("")}</div>`;
  }
  function bindScores(root) {
    root.querySelectorAll(".score-row").forEach((row) => {
      row.addEventListener("click", (e) => {
        const btn = e.target.closest(".score");
        if (!btn || !row.contains(btn)) return;
        row.querySelectorAll(".score").forEach((b) => b.classList.remove("on"));
        btn.classList.add("on");
        row.dataset.value = btn.getAttribute("data-value") || "";
      });
    });
  }
  function val(root, name) {
    const row = root.querySelector(`.score-row[data-name="${name}"]`);
    return row ? row.dataset.value || "" : "";
  }

  function renderReviews(slot) {
    if (slot.querySelector("form")) return;
    slot.innerHTML = `
      <div class="review-panel">
        <p>Anonymous ratings of clinical utility and time-value. One response per browser. No names or patient information.</p>
        <div class="review-stats" id="review-stats"><article><strong id="review-n">—</strong><span>responses</span></article></div>
        <form class="review-form" id="review-form">
          <fieldset><legend>Utility for clinical decisions</legend>
            ${scores("utility", 5)}
            <p class="small">1 = not useful · 5 = immediately useful</p>
          </fieldset>
          <fieldset><legend>Value of time spent</legend>
            ${scores("value", 5)}
            <p class="small">1 = not worth it · 5 = high value</p>
          </fieldset>
          <label>Role
            <select name="role">
              <option value="clinician">Clinician</option>
              <option value="trainee">Trainee</option>
              <option value="researcher">Researcher</option>
              <option value="industry">Industry</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label>Setting
            <select name="setting">
              <option value="conference">Conference</option>
              <option value="clinical">Clinical use</option>
              <option value="teaching">Teaching</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label>Optional comment (not about patients)
            <textarea name="comment" maxlength="240" rows="3" placeholder="What would make this more useful in practice?"></textarea>
          </label>
          <label class="hp" aria-hidden="true">Website <input type="text" name="website" tabindex="-1" autocomplete="off"></label>
          <button type="submit" class="button primary">Send feedback</button>
          <p class="small" id="review-status" role="status"></p>
        </form>
      </div>`;
    bindScores(slot);
    const KEY = "ags-companion-reviewed";
    const STORE = "ags-companion-reviews-v1";
    const form = slot.querySelector("#review-form");
    const status = slot.querySelector("#review-status");
    const nEl = slot.querySelector("#review-n");
    function loadStore() {
      try {
        return JSON.parse(localStorage.getItem(STORE) || "[]");
      } catch {
        return [];
      }
    }
    function paint() {
      nEl.textContent = String(loadStore().length);
    }
    paint();
    if (localStorage.getItem(KEY) === "1") {
      form.hidden = true;
      status.textContent = "You have already sent feedback on this device.";
    }
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const utility = Number(val(slot, "utility"));
      const value = Number(val(slot, "value"));
      if (!(utility >= 1 && value >= 1)) {
        status.textContent = "Choose a utility score and a value score.";
        return;
      }
      if (form.website && form.website.value) return;
      const rows = loadStore();
      rows.push({
        t: new Date().toISOString(),
        utility,
        value,
        role: form.role.value,
        setting: form.setting.value,
        comment: (form.comment.value || "").trim(),
      });
      localStorage.setItem(STORE, JSON.stringify(rows));
      localStorage.setItem(KEY, "1");
      form.hidden = true;
      paint();
      status.textContent = "Thank you. Feedback recorded.";
    });
  }

  const B = [
    ["B1", "Flags gelatin-based hemostatic agents/sponges"],
    ["B2", "Flags bovine/porcine collagen fillers and implants"],
    ["B3", "Flags acellular dermal/tissue matrices of mammalian origin"],
    ["B4", "Flags mammalian-derived sutures (e.g., surgical gut)"],
    ["B5", "Flags gelatin-containing injectables/adjuncts, capsules, and animal-derived hyaluronidase"],
    ["B6", "Prompts screening for prior tick bite / red-meat reaction / AGS history"],
    ["B7", "Prompts documentation of prior reaction to mammalian-derived products"],
    ["B8", "Provides alternative non-mammalian material suggestions (including recombinant hyaluronidase when relevant)"],
    ["B9", "Provides perioperative reaction-management guidance"],
    ["B10", "Timing/placement of the alert within the procedural workflow"],
  ];
  const C = [
    ["C1", "Material-origin flag (mammalian vs. non-mammalian)"],
    ["C2", "Patient AGS risk-history prompt"],
    ["C3", "Alternative-material recommendation"],
    ["C4", "Reaction-management/escalation guidance"],
    ["C5", "Cross-reactivity note (e.g., cetuximab, mammalian byproducts)"],
  ];
  const E = [
    ["E1", "The tool's purpose is immediately clear"],
    ["E2", "Alerts are worded unambiguously"],
    ["E3", "Terminology matches how my specialty describes these materials"],
    ["E4", "Output distinguishes actionable alerts from informational notes"],
  ];
  const F = [
    ["F1", "The tool fits my procedural/office workflow"],
    ["F2", "The alert appears at the right point (material selection/consent/pre-op)"],
    ["F3", "Alert volume/frequency would not cause fatigue"],
    ["F4", "I could act on the tool's output without additional lookup"],
    ["F5", "I would adopt this tool in my practice"],
  ];

  function renderRater(slot) {
    if (slot.querySelector("form")) return;
    const b = shuffle(B);
    const c = shuffle(C);
    const d = shuffle(["D1", "D2", "D3"]);
    const e = shuffle(E);
    const f = shuffle(F);
    const g = shuffle(["G1", "G2"]);
    const row4 = (id) => scores(id, 4);
    const row5 = (id) => scores(id, 5);
    const chips = (id, opts) =>
      `<div class="score-row" role="radiogroup" data-name="${id}">${opts
        .map(([v, t]) => `<button type="button" class="score" data-value="${v}">${t}</button>`)
        .join("")}</div>`;

    const dBlock = (id, i) => {
      if (id === "D1")
        return `<label>${i + 1}. Alpha-gal–containing materials in aesthetic/cosmetic practice that the tool omits?
          ${chips("d1", [["no", "No"], ["yes", "Yes"]])}</label>
          <label>If yes, list omitted materials <textarea name="d1list"></textarea></label>`;
      if (id === "D2")
        return `<label>${i + 1}. Does the tool flag anything that is not a genuine alpha-gal source?
          ${chips("d2", [["no", "No"], ["yes", "Yes"]])}</label>
          <label>If yes, specify <textarea name="d2spec"></textarea></label>`;
      return `<label>${i + 1}. Is the risk-stratification logic clinically appropriate?
          ${chips("d3", [["yes", "Yes"], ["partly", "Partly"], ["no", "No"]])}</label>
          <label>Comment if not fully yes <textarea name="d3comment"></textarea></label>`;
    };
    const gBlock = (id, i) => {
      if (id === "G1")
        return `<label>${i + 1}. Could following the tool’s guidance introduce any patient-safety risk?
          ${chips("g1", [["no", "No"], ["yes", "Yes"]])}</label>
          <label>If yes, describe <textarea name="g1desc"></textarea></label>`;
      return `<label>${i + 1}. Are the alternative-material suggestions safe and appropriate for aesthetic use?
          ${chips("g2", [["yes", "Yes"], ["uncertain", "Uncertain"], ["no", "No"]])}</label>
          <label>Comment if not yes <textarea name="g2comment"></textarea></label>`;
    };

    slot.innerHTML = `
      <form class="review-form rater-form" id="rater-form">
        <p class="small">Items within each section are shown in a random order for this session. Access phrase: the short URL on the poster (AGS-FPRS).</p>
        <fieldset>
          <legend>A · Who you are</legend>
          <label class="check-line"><input type="checkbox" name="goodFaith"> <span>I am a real person completing this in good faith.</span></label>
          <label>Access phrase <input name="accessPhrase" autocomplete="off"></label>
          <label class="hp" aria-hidden="true">Website <input name="website" tabindex="-1" autocomplete="off"></label>
          <label class="check-line"><input type="checkbox" name="manuscriptConsent"> <span>I agree that my anonymized ratings may be used for internal feasibility of this companion. Optional.</span></label>
          <label>Self-rated expertise: alpha-gal in cosmetic/aesthetic practice
            ${chips("expertiseAgs", [["none","None"],["limited","Limited"],["moderate","Moderate"],["expert","Expert"],["teacher","I teach/publish this"]])}</label>
          <label>Primary role
            ${chips("specialty", [["facial-plastics","Facial plastics"],["plastic-reconstructive","Plastic & reconstructive"],["cosmetic-surgery","Cosmetic surgery"],["aesthetic-nonsurgical","Aesthetic (nonsurgical)"],["dermatology","Dermatology"],["oculoplastics","Oculoplastics"],["allergy","Allergy/immunology"],["anesthesia","Anesthesia"],["trainee","Trainee"],["industry","Industry"],["other","Other"]])}</label>
          <label>Career stage
            ${chips("careerStage", [["trainee","Trainee"],["lt5","<5 y"],["5-10","5–10 y"],["11-20","11–20 y"],["gt20",">20 y"],["not-clinical","Not clinical"]])}</label>
          <label>Practice setting
            ${chips("practiceSetting", [["private","Private aesthetic"],["academic","Academic"],["hospital","Hospital"],["medspa","Medspa"],["mixed","Mixed"],["not-clinical","Not clinical"]])}</label>
          <label>Region
            ${chips("region", [["us-ne","US Northeast"],["us-se","US Southeast"],["us-mw","US Midwest"],["us-sw","US Southwest"],["us-w","US West"],["canada","Canada"],["europe","Europe"],["other","Other"]])}</label>
          <label>Approximate aesthetic procedures per month <input name="proceduresPerMonth" inputmode="numeric"></label>
          <label>Experience managing or recognizing AGS
            ${chips("agsExperience", [["none","None"],["some","Some"],["extensive","Extensive"]])}</label>
          <label>Familiarity with alpha-gal content of materials
            ${chips("materialFamiliarity", [["low","Low"],["moderate","Moderate"],["high","High"]])}</label>
          <label>Do you currently select, inject, or implant mammalian-derived aesthetic products?
            ${chips("usesMammalianProducts", [["yes","Yes"],["no","No"],["unsure","Unsure"]])}</label>
          <label>Use of clinical decision-support tools
            ${chips("cdsUse", [["never","Never"],["sometimes","Sometimes"],["routinely","Routinely"]])}</label>
          <label>Relevant industry relationship
            ${chips("coi", [["none","None"],["relevant","Yes — describe"]])}</label>
          <label>If relevant, describe <textarea name="coiDetail"></textarea></label>
          <label>How you are completing this
            ${chips("accessContext", [["conference","At the conference"],["later","After the meeting"],["clinical","In clinic/OR"],["other","Other"]])}</label>
          <label>Willing to be contacted for a later anonymized consensus round?
            ${chips("delphiOptIn", [["yes","Yes"],["no","No"]])}</label>
          <label>Contact email only if yes <input type="email" name="contactEmail" autocomplete="email"></label>
        </fieldset>
        <fieldset><legend>B · Content validity (I-CVI)</legend>
          <p class="small">1 = not relevant · 4 = highly relevant</p>
          ${b.map((item, i) => `<label>${i + 1}. ${item[1]}${row4(item[0])}</label>`).join("")}
          <label>If any item is rated 1 or 2, state the needed revision <textarea name="bRevision"></textarea></label>
        </fieldset>
        <fieldset><legend>C · Content validity (Lawshe CVR)</legend>
          ${c.map((item, i) => `<label>${i + 1}. ${item[1]}${chips(item[0], [["essential","Essential"],["useful","Useful, not essential"],["not","Not necessary"]])}</label>`).join("")}
        </fieldset>
        <fieldset><legend>D · Comprehensiveness</legend>${d.map(dBlock).join("")}</fieldset>
        <fieldset><legend>E · Face validity and clarity</legend>
          <p class="small">1 = strongly disagree · 5 = strongly agree</p>
          ${e.map((item, i) => `<label>${i + 1}. ${item[1]}${row5(item[0])}</label>`).join("")}
        </fieldset>
        <fieldset><legend>F · Usability and workflow fit</legend>
          <p class="small">1 = strongly disagree · 5 = strongly agree</p>
          ${f.map((item, i) => `<label>${i + 1}. ${item[1]}${row5(item[0])}</label>`).join("")}
        </fieldset>
        <fieldset><legend>G · Safety and risk</legend>${g.map(gBlock).join("")}</fieldset>
        <fieldset><legend>H · Overall assessment</legend>
          <label>H1. Ready to advance to prospective validation?
            ${chips("h1", [["yes","Yes"],["minor","Minor revision"],["major","Major revision"],["no","No"]])}</label>
          <label>H2. Single most important improvement needed <textarea name="h2" required></textarea></label>
          <label>H3. Additional comments <textarea name="h3"></textarea></label>
        </fieldset>
        <button class="button primary" type="submit">Submit questionnaire</button>
        <p class="small" id="rater-status" role="status"></p>
      </form>`;
    bindScores(slot);
    const form = slot.querySelector("#rater-form");
    const status = slot.querySelector("#rater-status");
    const STORE = "ags-companion-rater-submissions-v1";
    const DONE = "ags-companion-rater-v2";
    if (localStorage.getItem(DONE) === "1") {
      form.hidden = true;
      status.textContent = "This device has already submitted a questionnaire.";
      return;
    }
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (form.website && form.website.value) return;
      if (!form.goodFaith.checked) {
        status.textContent = "Confirm that you are completing this as a genuine review.";
        return;
      }
      const phrase = (form.accessPhrase.value || "").replace(/\s+/g, "").toUpperCase();
      if (phrase !== "AGS-FPRS") {
        status.textContent = "Enter the access phrase from the poster (AGS-FPRS).";
        return;
      }
      if (!form.manuscriptConsent.checked) {
        status.textContent = "Consent to anonymized internal use is required to submit.";
        return;
      }
      const need = [
        "expertiseAgs","specialty","careerStage","practiceSetting","region","agsExperience",
        "materialFamiliarity","usesMammalianProducts","cdsUse","coi","accessContext","delphiOptIn",
        "d1","d2","d3","g1","g2","h1",
      ];
      B.forEach(([id]) => need.push(id));
      C.forEach(([id]) => need.push(id));
      E.forEach(([id]) => need.push(id));
      F.forEach(([id]) => need.push(id));
      for (const name of need) {
        if (!val(slot, name)) {
          status.textContent = "Complete every rating before submitting.";
          return;
        }
      }
      if (!(form.proceduresPerMonth.value || "").trim()) {
        status.textContent = "Enter procedures per month (0 if none).";
        return;
      }
      if (!(form.h2.value || "").trim()) {
        status.textContent = "H2 is required.";
        return;
      }
      const payload = { t: new Date().toISOString() };
      slot.querySelectorAll(".score-row[data-name]").forEach((row) => {
        payload[row.dataset.name] = row.dataset.value;
      });
      ["accessPhrase","proceduresPerMonth","coiDetail","contactEmail","bRevision","d1list","d2spec","d3comment","g1desc","g2comment","h2","h3"].forEach((k) => {
        payload[k] = (form[k] && form[k].value) || "";
      });
      const rows = (() => {
        try {
          return JSON.parse(localStorage.getItem(STORE) || "[]");
        } catch {
          return [];
        }
      })();
      rows.push(payload);
      localStorage.setItem(STORE, JSON.stringify(rows));
      localStorage.setItem(DONE, "1");
      form.hidden = true;
      status.textContent = "Thank you. Questionnaire recorded.";
    });
  }

  function boot() {
    const reviews = document.getElementById("reviews-root");
    const rater = document.getElementById("rater-root");
    if (reviews) renderReviews(reviews);
    if (rater) renderRater(rater);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
