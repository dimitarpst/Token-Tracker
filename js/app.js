let url_tracker = "https://script.google.com/macros/s/AKfycbw5zf6W7KeeYmYcSzc_s96kg6oJVdmak0tnj_Pr0pbCO6CadaAHEFcUL3ZH9Jm-1ZSy/exec";
$(document).ready(function(){
  // Request notification permission if available
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission().then(function(permission){
      console.log("Notification permission: " + permission);
    });
  }

  // Global chart instances
  window.myChart = null;       // Main chart (tokens or diamonds)
  window.myPieChart = null;    // Pie chart: free vs diamond
  window.myLineChart = null;   // Line chart: moving average
  window.myHistChart = null;   // Histogram
  window.myTierChart = null;   // Bar chart by diamond tier

  // Data and user identity
  let localData = { Mitko: [], Aylin: [] };
  let currentUser = localStorage.getItem("currentUser");
  let currentDiamond = null;
  
  // Radial slider defaults
  let minValue = 3;
  let maxValue = 20;
  let crestValue = minValue;
  
  let statsView = "tokens";

  // Grab radial canvas and prepare drawing context
  const radialCanvas = document.getElementById("radialSlider");
  let ctx = radialCanvas ? radialCanvas.getContext("2d") : null;
  const centerX = radialCanvas ? radialCanvas.width / 2 : 0;
  const centerY = radialCanvas ? radialCanvas.height / 2 : 0;
  const radius = 100;
  const lineWidth = 20;

  // Show welcome screen if no user is selected
  if(!currentUser){
    $("#welcome-screen").removeClass("d-none");
    $("#main-app").addClass("d-none");
  } else {
    initUser(currentUser);
    $("#welcome-screen").addClass("d-none");
    $("#main-app").removeClass("d-none");
  }

  //===================== USER SELECTION =====================
  $(".choose-user").click(function(){
    currentUser = $(this).data("user");
    localStorage.setItem("currentUser", currentUser);
    initUser(currentUser);
    $("#welcome-screen").fadeOut(300, function(){
      $(this).addClass("d-none");
    });
    $("#main-app").removeClass("d-none");
  });

  function initUser(user){
    $("body").removeClass("mitko aylin").addClass(user.toLowerCase());
    let charImg = (user === "Mitko") ? "assets/fredrinn.png" : "assets/lylia.png";
    $("#character-image").attr("src", charImg);
    
    fetchRemoteData(() => {
      updateHistory();
      updateStats();
      updateCompare();
    });
  }
  
  //===================== FETCH REMOTE DATA =====================
  function fetchRemoteData(callback) {
    $("#loader").removeClass("d-none"); 
    $.ajax({
      url: url_tracker,
      method: "GET",
      dataType: "jsonp",  
      jsonpCallback: "callback",
      success: function(data) {
        localData = { Mitko: [], Aylin: [] };
        data.forEach(entry => {
          if (entry.User && localData[entry.User]) {
            const parsed = {
              id: entry.Entry_Id ? Number(String(entry.Entry_Id).trim()) : 0,
              diamond: parseInt(entry.Diamonds) || 0,
              crests: parseInt(entry.Crests) || 0,
              timestamp: Date.parse(entry.Timestamp) || 0,
              user: entry.User
            };
            localData[entry.User].push(parsed);
          }
        });
        $("#loader").addClass("d-none");
        callback();
      },
      error: function(err) {
        console.error("Failed to fetch Google Sheets data", err);
        $("#loader").addClass("d-none"); 
      }
    });
  }
  
  //===================== SIDEBAR / OVERLAY =====================
  $("#open-sidebar").click(function(){
    $("#sidebar").addClass("open");
    $("#overlay").fadeIn(300);
  });
  $("#close-sidebar, #overlay").click(function(e){
    e.stopPropagation();
    $("#sidebar").removeClass("open");
    $("#overlay").fadeOut(300);
  });
  $("#sidebar .nav-link").click(function(e){
    e.preventDefault();
    let tabId = $(this).data("tab");
    $(".tab-content").addClass("d-none");
    $("#tab-" + tabId).removeClass("d-none");
    $("#sidebar").removeClass("open");
    $("#overlay").fadeOut(300);
  });

  //===================== SETTINGS =====================
  $("#change-user").click(function(){
    localStorage.removeItem("currentUser");
    location.reload();
  });
  $("#reset-data").click(function(){
    if(confirm("Are you sure you want to reset all data?")){
      localData = { Mitko: [], Aylin: [] };
      updateHistory();
      updateStats();
      updateCompare();
      alert("Data reset!");
    }
  });

  //===================== STATS TOGGLE =====================
  $("#toggle-tokens").click(function(){
    statsView = "tokens";
    $(this).addClass("active");
    $("#toggle-diamonds").removeClass("active");
    updateStats();
  });
  $("#toggle-diamonds").click(function(){
    statsView = "diamonds";
    $(this).addClass("active");
    $("#toggle-tokens").removeClass("active");
    updateStats();
  });

  //===================== DRAW OPTION (FREE / DIAMOND) =====================
  $(".draw-option").click(function(){
    const diamond = $(this).data("diamond");
    currentDiamond = diamond;
    const label = (diamond === 0) ? "Free Draw" : diamond + " Diamonds";
    $("#selected-draw-label").text(label);

    $("#draw-type-icon").attr("src", diamond === 0 
      ? "assets/mystical_dial.png"
      : "assets/diamond.png"
    );

    $("#extendedMode").prop("checked", false);
    maxValue = 20;
    crestValue = minValue;
    $("#crestValue").text(minValue);

    if(ctx){ drawRing(minValue); }
    // Open the draw modal
    $("#draw-input-screen").removeClass("d-none").css("display", "flex").hide().fadeIn(300);
    $("#swipe-zone").hide();
  });

  //===================== EXTENDED MODE SWITCH =====================
  $("#extendedMode").change(function(){
    maxValue = $(this).is(":checked") ? 300 : 20;
    crestValue = Math.max(minValue, Math.min(crestValue, maxValue));
    $("#crestValue").text(crestValue);
    if(ctx){ drawRing(crestValue); }
  });

  //===================== RADIAL SLIDER =====================
  function drawRing(value){
    if(!ctx) return;
    ctx.clearRect(0, 0, radialCanvas.width, radialCanvas.height);

    // Background ring
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.lineWidth = lineWidth;
    ctx.stroke();

    // Filled arc
    const fraction = (value - minValue) / (maxValue - minValue);
    const angle = fraction * 2 * Math.PI;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, -Math.PI/2, angle - Math.PI/2, false);
    ctx.strokeStyle = "#FFBCD9";
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.stroke();

    // Knob circle
    const endX = centerX + radius * Math.cos(angle - Math.PI/2);
    const endY = centerY + radius * Math.sin(angle - Math.PI/2);
    ctx.beginPath();
    ctx.arc(endX, endY, lineWidth / 1.8, 0, 2 * Math.PI);
    ctx.fillStyle = "#FFC0CB";
    ctx.fill();
  }

  function updateValueFromAngle(angle){
    if(angle < 0) { angle += 2 * Math.PI; }
    const fraction = angle / (2 * Math.PI);
    const raw = minValue + fraction * (maxValue - minValue);
    crestValue = Math.round(raw);
    crestValue = Math.max(minValue, Math.min(crestValue, maxValue));
    $("#crestValue").text(crestValue);
    if(ctx){ drawRing(crestValue); }
  }

  let isDragging = false;
  function pointerDown(e){
    e.preventDefault();
    isDragging = true;
    pointerMove(e);
  }
  function pointerMove(e){
    if(!isDragging) return;
    e.preventDefault();
    let clientX, clientY;
    if(e.touches){
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    const rect = radialCanvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const dx = x - centerX;
    const dy = y - centerY;
    let angle = Math.atan2(dy, dx) + Math.PI/2;
    updateValueFromAngle(angle);
  }
  function pointerUp(e){
    isDragging = false;
  }

  radialCanvas?.addEventListener("mousedown", pointerDown);
  radialCanvas?.addEventListener("mousemove", pointerMove);
  radialCanvas?.addEventListener("mouseup", pointerUp);
  radialCanvas?.addEventListener("mouseleave", pointerUp);
  radialCanvas?.addEventListener("touchstart", pointerDown, { passive: false });
  radialCanvas?.addEventListener("touchmove", pointerMove, { passive: false });
  radialCanvas?.addEventListener("touchend", pointerUp);
  radialCanvas?.addEventListener("touchcancel", pointerUp);

  //===================== SUBMIT / CANCEL DRAW =====================
  $("#submit-draw").click(function(){
    let entry = {
      diamond: currentDiamond,
      crests: crestValue,
      timestamp: Date.now(),
      User: currentUser
    };

    // Immediately close the modal (without fade-out)
    $("#draw-input-screen").hide().addClass("d-none");
    $("#swipe-zone").show();

    // Submit entry to server and then refresh remote data
    submitEntryToSheet(entry, function(){
      // Add a slight delay for processing
      setTimeout(() => {
        fetchRemoteData(() => {
          updateHistory();
          updateStats();
          updateCompare();
        });
      }, 600);
    });

    // Show notification if permitted
    if("Notification" in window && Notification.permission === "granted"){
      new Notification("Draw Recorded", {
        body: "You gained " + crestValue + " tokens!",
        icon: "assets/token.png"
      });
    }
  });
  
  $("#cancel-draw").click(function(){
    $("#draw-input-screen").hide().addClass("d-none");
    $("#swipe-zone").show();
  });

  //===================== SHEETS BACKEND SUBMISSION =====================
  function submitEntryToSheet(entry, callback) {
    $.ajax({
      url: url_tracker,
      method: "POST",
      data: {
        diamond: entry.diamond,
        crests: entry.crests,
        timestamp: entry.timestamp,
        User: entry.User
      },
      success: function(response){
        console.log("Entry submitted to Google Sheets: ", response);
        if(callback) callback();
      },
      error: function(err){
        console.error("Error submitting entry to Google Sheets:", err);
      }
    });
  }

  //===================== UPDATE HISTORY =====================
  function updateHistory(){
    let historyList = $("#history-list");
    historyList.empty();

    localData[currentUser].forEach(function(entry){
      let drawDate = new Date(entry.timestamp).toLocaleDateString();
      let diamondText = (entry.diamond === 0)
        ? `<img src="assets/mystical_dial.png" class="small-icon" alt="Free Draw">`
        : entry.diamond + "<img class='small-icon' src='assets/diamond.png' alt='Diamond'>";
      
      let listItem = `
        <div class="history-card mb-3">
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <div class="history-date">${drawDate}</div>
              <div class="history-details">
                ${diamondText} → ${entry.crests}
                <img src="assets/token.png" class="small-icon" alt="Token">
              </div>
            </div>
            <div>
              <button class="btn btn-sm btn-outline-danger delete-entry" data-id="${entry.id}">
                <i class="fa fa-trash"></i>
              </button>
              <button class="btn btn-sm btn-outline-primary edit-entry ms-2" data-id="${entry.id}">
                <i class="fa fa-edit"></i>
              </button>
            </div>
          </div>
        </div>`;
      historyList.append(listItem);
    });

    // Also update the "Home" tab draw list
    $("#draw-list").empty();
    localData[currentUser].forEach(function(entry){
      let drawDate = new Date(entry.timestamp).toLocaleDateString();
      let diamondText = (entry.diamond === 0)
        ? `<img src="assets/mystical_dial.png" class="small-icon" alt="Free Draw">`
        : entry.diamond + "<img class='small-icon' src='assets/diamond.png' alt='Diamond'>";
      
      let card = `
        <div class="card mb-2">
          <div class="card-body d-flex align-items-center">
            <p class="card-text m-0 me-auto">
              ${drawDate}: ${diamondText} → ${entry.crests}
              <img src="assets/token.png" alt="Token" class="small-icon">
            </p>
            <button class="btn btn-sm btn-outline-danger delete-entry" data-id="${entry.id}">
              <i class="fa fa-trash"></i>
            </button>
            <button class="btn btn-sm btn-outline-primary edit-entry ms-2" data-id="${entry.id}">
              <i class="fa fa-edit"></i>
            </button>
          </div>
        </div>`;
      $("#draw-list").append(card);
    });
  }

  //===================== UPDATE STATS & CHARTS =====================
  function updateStats(){
    let entries = localData[currentUser];
    if(!entries) return;

    updateMainBarChart(entries);
    updatePieChart(entries);
    updateLineChart(entries);
    updateHistogram(entries);
    updateTierChart(entries);
    updateAdvancedMetrics(entries);
  }

  function updateMainBarChart(entries){
    if(window.myChart){ window.myChart.destroy(); }

    if(statsView === "tokens"){
      let totalCrests = entries.reduce((sum, e) => sum + e.crests, 0);
      $("#stats-summary").html(`
        Total Tokens:
        <span id='total-crest'>${totalCrests}</span>
        <img src='assets/token.png' alt='Token' class='small-icon'>
        / 1200
      `);

      let progressPercent = Math.min((totalCrests / 1200) * 100, 100);
      $("#progress-bar").css("width", progressPercent + "%").text(Math.floor(progressPercent) + "%");

      let labels = entries.map((_, i) => "Draw " + (i + 1));
      let dataPoints = entries.map(e => e.crests);

      window.myChart = new Chart(document.getElementById("stats-chart"), {
        type: "bar",
        data: {
          labels: labels,
          datasets: [{
            label: "Crests per Draw",
            data: dataPoints,
            backgroundColor: "#FFD4D4"
          }]
        },
        options: {
          scales: { y: { beginAtZero: true } },
          plugins: { legend: { display: false } }
        }
      });

    } else {
      let totalDiamonds = entries.reduce((sum, e) => sum + (e.diamond > 0 ? e.diamond : 0), 0);
      $("#stats-summary").html(`
        Total Diamonds Spent:
        <span id='total-crest'>${totalDiamonds}</span>
        <img src='assets/diamond.png' alt='Diamond' class='small-icon'>
      `);

      let progressPercent = Math.min((totalDiamonds / 1200) * 100, 100);
      $("#progress-bar").css("width", progressPercent + "%").text(Math.floor(progressPercent) + "%");

      let labels = entries.map((_, i) => "Draw " + (i + 1));
      let dataPoints = entries.map(e => (e.diamond > 0 ? e.diamond : 0));

      window.myChart = new Chart(document.getElementById("stats-chart"), {
        type: "bar",
        data: {
          labels: labels,
          datasets: [{
            label: "Diamonds per Draw",
            data: dataPoints,
            backgroundColor: "#FFDEAD"
          }]
        },
        options: {
          scales: { y: { beginAtZero: true } },
          plugins: { legend: { display: false } }
        }
      });
    }
  }

  function updatePieChart(entries){
    if(window.myPieChart) { window.myPieChart.destroy(); }
    let freeCount = entries.filter(e => e.diamond === 0).length;
    let diamondCount = entries.length - freeCount;

    window.myPieChart = new Chart(document.getElementById("stats-pie"), {
      type: "pie",
      data: {
        labels: ["Free", "Diamond"],
        datasets: [{
          data: [freeCount, diamondCount],
          backgroundColor: ["#FFAEC9", "#F28EFF"]
        }]
      },
      options: {
        plugins: { legend: { display: true } }
      }
    });
  }

  function updateLineChart(entries){
    if(window.myLineChart) { window.myLineChart.destroy(); }
    let sorted = [...entries].sort((a,b) => a.timestamp - b.timestamp);
    const windowSize = 3;
    let tokensArray = sorted.map(e => e.crests);
    let labels = sorted.map((e,i) => "D" + (i+1));
    let maData = [];
    for(let i = 0; i < tokensArray.length; i++){
      let start = Math.max(0, i - windowSize + 1);
      let subset = tokensArray.slice(start, i + 1);
      let avg = subset.reduce((s, val) => s + val, 0) / subset.length;
      maData.push(avg);
    }
    window.myLineChart = new Chart(document.getElementById("stats-line"), {
      type: "line",
      data: {
        labels: labels,
        datasets: [{
          label: "Tokens (Moving Avg)",
          data: maData,
          backgroundColor: "rgba(255, 184, 238, 0.5)",
          borderColor: "#ffaec9",
          borderWidth: 2,
          fill: true,
          tension: 0.2
        }]
      },
      options: {
        scales: { y: { beginAtZero: true } },
        plugins: { legend: { display: true } }
      }
    });
  }

  function updateHistogram(entries){
    if(window.myHistChart) { window.myHistChart.destroy(); }
    let distributionMap = {};
    entries.forEach(e => {
      distributionMap[e.crests] = (distributionMap[e.crests] || 0) + 1;
    });
    let crestValues = Object.keys(distributionMap).map(v => parseInt(v)).sort((a,b)=>a-b);
    let frequencies = crestValues.map(v => distributionMap[v]);
    window.myHistChart = new Chart(document.getElementById("stats-hist"), {
      type: "bar",
      data: {
        labels: crestValues.map(v => String(v)),
        datasets: [{
          label: "Draw count",
          data: frequencies,
          backgroundColor: "#fdc5f5"
        }]
      },
      options: {
        scales: { y: { beginAtZero: true } },
        plugins: { legend: { display: false } }
      }
    });
  }

  function updateTierChart(entries){
    if(window.myTierChart) { window.myTierChart.destroy(); }
    let tiers = [0,25,50,450,500];
    let tierLabels = ["Free(0)","25💎","50💎","450💎","500💎"];
    let avgTokensForTier = [];
    tiers.forEach(t => {
      let subset = entries.filter(e => e.diamond === t);
      if(subset.length === 0){
        avgTokensForTier.push(0);
      } else {
        let sum = subset.reduce((acc,e) => acc + e.crests, 0);
        avgTokensForTier.push( sum / subset.length );
      }
    });
    window.myTierChart = new Chart(document.getElementById("stats-tier"), {
      type: "bar",
      data: {
        labels: tierLabels,
        datasets: [{
          label: "Avg Tokens",
          data: avgTokensForTier,
          backgroundColor: "#fed8de"
        }]
      },
      options: {
        scales: { y: { beginAtZero: true } },
        plugins: { legend: { display: false } }
      }
    });
  }

  function updateAdvancedMetrics(entries){
    let totalDraws = entries.length;
    let totalFree = entries.filter(e => e.diamond === 0).length;
    let totalDiamond = totalDraws - totalFree;
    let totalCrests = entries.reduce((acc,e)=>acc+e.crests,0);
    let tokensPerDraw = totalDraws === 0 ? 0 : totalCrests / totalDraws;
    let best = entries.reduce((b, e) => e.crests > b.crests ? e : b, {crests:-Infinity});
    let bestDraw = (best.crests === -Infinity) ? null : best;
    let luckStatus = "Average";
    if(tokensPerDraw > 9){ luckStatus = "Lucky"; }
    else if(tokensPerDraw < 9){ luckStatus = "Unlucky"; }
    let advHtml = `
      <div class="metric-card">
        <div class="metric-label">
          <span>Total Draws</span>
          <img src="assets/mystical_dial.png" class="metric-icon" alt="Dial" />
        </div>
        <div class="metric-value">${totalDraws}</div>
      </div>
  
      <div class="metric-card">
        <div class="metric-label">
          <span>Free Draws</span>
          <img src="assets/mystical_dial.png" class="metric-icon" alt="Free" />
        </div>
        <div class="metric-value">${totalFree}</div>
        <div class="metric-note">${((totalFree/totalDraws)*100 || 0).toFixed(1)}%</div>
      </div>
  
      <div class="metric-card">
        <div class="metric-label">
          <span>Diamond Draws</span>
          <img src="assets/diamond.png" class="metric-icon" alt="Diamond" />
        </div>
        <div class="metric-value">${totalDiamond}</div>
        <div class="metric-note">${((totalDiamond/totalDraws)*100 || 0).toFixed(1)}%</div>
      </div>
  
      <div class="metric-card">
        <div class="metric-label">
          <span>Tokens/Draw</span>
          <img src="assets/token.png" class="metric-icon" alt="Token" />
        </div>
        <div class="metric-value">${tokensPerDraw.toFixed(2)}</div>
      </div>
    `;
    if(bestDraw){
      advHtml += `
        <div class="metric-card">
          <div class="metric-label">
            <span>Best Draw</span>
            <img src="assets/token.png" class="metric-icon" alt="Token" />
          </div>
          <div class="metric-value">${bestDraw.crests}</div>
          <div class="metric-note">
            ${bestDraw.diamond>0 ? `(${bestDraw.diamond}💎)` : `<img src="assets/mystical_dial.png" class="metric-icon" alt="Free">`}
          </div>
        </div>
      `;
    }
    advHtml += `
      <div class="metric-card">
        <div class="metric-label">
          <span>Luck Score™</span>
          <img src="assets/mystical_dial.png" class="metric-icon" alt="Luck" />
        </div>
        <div class="metric-value">${luckStatus}</div>
        <div class="metric-note">${tokensPerDraw.toFixed(2)} tokens/draw</div>
      </div>
    `;
    $("#advanced-metrics-grid").html(advHtml);
  }

  //===================== COMPARE =====================
  function updateCompare(){
    let compareHTML = `
      <div class="compare-row">
        <div class="compare-column" id="compare-mitko-col">
          <h5 class="text-light mb-3">Mitko</h5>
          <div class="metrics-grid" id="compare-mitko-grid"></div>
        </div>
        <div class="compare-column" id="compare-aylin-col">
          <h5 class="text-light mb-3">Aylin</h5>
          <div class="metrics-grid" id="compare-aylin-grid"></div>
        </div>
      </div>
    `;
    $("#compare-container").html(compareHTML);
  
    let mitkoMetrics = computeMetrics(localData["Mitko"]);
    let mitkoHTML = buildMetricsHTML(mitkoMetrics);
    $("#compare-mitko-grid").html(mitkoHTML);
  
    let aylinMetrics = computeMetrics(localData["Aylin"]);
    let aylinHTML = buildMetricsHTML(aylinMetrics);
    $("#compare-aylin-grid").html(aylinHTML);
  }
  
  function buildMetricsHTML(m){
    let freePercent = m.totalDraws === 0 ? 0 : (m.totalFree / m.totalDraws) * 100;
    let diamondPercent = m.totalDraws === 0 ? 0 : (m.totalDiamond / m.totalDraws) * 100;
    let bestDrawHTML = "";
    if(m.bestDraw){
      bestDrawHTML = `
        <div class="metric-card">
          <div class="metric-label">
            Best Draw <img src="assets/token.png" class="metric-icon" alt="Token" />
          </div>
          <div class="metric-value">${m.bestDraw.crests}</div>
          <div class="metric-note">
            ${m.bestDraw.diamond>0 ? `(${m.bestDraw.diamond}💎)` : `<img src="assets/mystical_dial.png" class="metric-icon" alt="Free">`}
          </div>
        </div>
      `;
    }
    return `
      <div class="metric-card">
        <div class="metric-label">
          Total Draws <img src="assets/mystical_dial.png" class="metric-icon" alt="Dial" />
        </div>
        <div class="metric-value">${m.totalDraws}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">
          Free Draws <img src="assets/mystical_dial.png" class="metric-icon" alt="Free" />
        </div>
        <div class="metric-value">${m.totalFree}</div>
        <div class="metric-note">${freePercent.toFixed(1)}%</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">
          Diamond Draws <img src="assets/diamond.png" class="metric-icon" alt="Diamond" />
        </div>
        <div class="metric-value">${m.totalDiamond}</div>
        <div class="metric-note">${diamondPercent.toFixed(1)}%</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">
          Avg Tokens <img src="assets/token.png" class="metric-icon" alt="Token" />
        </div>
        <div class="metric-value">${m.tokensPerDraw.toFixed(2)}</div>
      </div>
      ${bestDrawHTML}
      <div class="metric-card">
        <div class="metric-label">
          Luck Score™ <img src="assets/mystical_dial.png" class="metric-icon" alt="Luck" />
        </div>
        <div class="metric-value">${m.luckStatus}</div>
        <div class="metric-note">${m.tokensPerDraw.toFixed(2)} tokens/draw</div>
      </div>
    `;
  }
  
  function computeMetrics(entries){
    let totalDraws = entries.length;
    let totalFree = entries.filter(e => e.diamond === 0).length;
    let totalDiamond = totalDraws - totalFree;
    let totalCrests = entries.reduce((acc,e)=>acc+e.crests,0);
    let tokensPerDraw = totalDraws === 0 ? 0 : totalCrests / totalDraws;
    let best = entries.reduce((b, e) => e.crests > b.crests ? e : b, {crests:-Infinity});
    let bestDraw = best.crests === -Infinity ? null : best;
    let luckStatus = "Average";
    if(tokensPerDraw > 9){ luckStatus = "Lucky"; }
    else if(tokensPerDraw < 9){ luckStatus = "Unlucky"; }
    return { totalDraws, totalFree, totalDiamond, totalCrests, bestDraw, tokensPerDraw, luckStatus };
  }
  
  //===================== DELETE ENTRY =====================
  $(document).on("click", ".delete-entry", function() {
    const id = $(this).data("id"); 
    if(!id) {
      console.warn("No ID found on this entry — cannot delete from sheet.");
      return;
    }
    if (confirm("Are you sure you want to delete this entry?")) {
      $.post(url_tracker, { action: "delete", id: id }, function(response) {
        console.log("Delete response:", response);
        fetchRemoteData(() => {
          updateHistory();
          updateStats();
          updateCompare();
        });
      });
    }
  });

  //===================== EDIT ENTRY =====================
  $(document).on("click", ".edit-entry", function() {
    const id = $(this).data("id");
    let entry = localData[currentUser].find(e => String(e.id) === String(id));
    if(!entry) {
      console.warn("Could not find local entry with id:", id);
      return;
    }
    const newDiamond = prompt("Edit Diamonds:", entry.diamond);
    const newCrests = prompt("Edit Crests:", entry.crests);
    if(newDiamond !== null && newCrests !== null){
      $.post(url_tracker, {
        action: "edit",
        id: entry.id,
        diamond: parseInt(newDiamond),
        crests: parseInt(newCrests),
        user: currentUser
      }, function(res){
        console.log("Edited:", res);
        fetchRemoteData(() => {
          updateHistory();
          updateStats();
          updateCompare();
        });
      });
    }
  });

  //===================== SWIPE HANDLING FOR SIDEBAR =====================
  let startX = 0, currentX = 0, threshold = 50;
  $(document).on("touchstart", function(e){
    let touchX = e.originalEvent.touches[0].clientX;
    startX = (touchX <= 30) ? touchX : null;
  });
  $(document).on("touchmove", function(e){
    currentX = e.originalEvent.touches[0].clientX;
  });
  $(document).on("touchend", function(){
    if(!$("#draw-input-screen").hasClass("d-none")){
      startX = null;
      return;
    }
    if(startX !== null){
      let diffX = currentX - startX;
      if(diffX > threshold && !$("#sidebar").hasClass("open")){
        $("#sidebar").addClass("open");
        $("#overlay").fadeIn(300);
      } else if(diffX < -threshold && $("#sidebar").hasClass("open")){
        $("#sidebar").removeClass("open");
        $("#overlay").fadeOut(300);
      }
    }
    startX = null;
  });
});
