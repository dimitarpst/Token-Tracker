$(document).ready(function() {

  let url_tracker = "https://script.google.com/macros/s/AKfycbw5zf6W7KeeYmYcSzc_s96kg6oJVdmak0tnj_Pr0pbCO6CadaAHEFcUL3ZH9Jm-1ZSy/exec";

  if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().then(function(permission) {
          console.log("Notification permission: " + permission);
      });
  }

  window.myChart = null;
  window.myPieChart = null;
  window.myLineChart = null;
  window.myHistChart = null;
  window.myTierChart = null;

  let localData = {
      Mitko: [],
      Aylin: []
  };
  let currentUser = localStorage.getItem("currentUser");
  let currentDiamond = null;
  let statsView = "tokens";

  let minValue = 0;
  let maxValue = 20;
  let crestValue = minValue;
  const radialCanvas = document.getElementById("radialSlider");
  let ctx = radialCanvas ? radialCanvas.getContext("2d") : null;
  const centerX = radialCanvas ? radialCanvas.width / 2 : 0;
  const centerY = radialCanvas ? radialCanvas.height / 2 : 0;
  const radius = 100;
  const lineWidth = 20;

  if (!currentUser) {
      $("#welcome-screen").removeClass("d-none");
      $("#main-app").addClass("d-none");
  } else {
      initUser(currentUser);
      $("#welcome-screen").addClass("d-none");
      $("#main-app").removeClass("d-none");
  }

  //===================== USER SELECTION =====================

  $(".choose-user").click(function() {
      currentUser = $(this).data("user");
      localStorage.setItem("currentUser", currentUser);
      initUser(currentUser);
      $("#welcome-screen").fadeOut(300, function() {
          $(this).addClass("d-none");
      });
      $("#main-app").removeClass("d-none");
  });

  //===================== INIT USER =====================

  function initUser(user) {
      $("body")
          .removeClass("mitko aylin")
          .addClass(user.toLowerCase());

      let charImg = (user === "Mitko") ? "assets/fredrinn.png" : "assets/lylia.png";

      $("#settings-current-user-img").attr("src", charImg);
      $("#navbar-current-user-img").attr("src", charImg); 

      if ($("#character-image").length) {
          $("#character-image").attr("src", charImg);
      }

      if (ctx) {
          drawRing(minValue);
      }

      fetchRemoteData(() => {
          updateHistory();
          updateStats();
          updateCompare();
          updateHomeDrawList();

          if ($(".tab-content:not(.d-none)").length === 0) {
              $("#tab-home").removeClass("d-none");
              $("#sidebar .nav-link").removeClass('active');
              $("#sidebar .nav-link[data-tab='home']").addClass('active');
          } else {
              let visibleTabId = $(".tab-content:not(.d-none)")
                  .first()
                  .attr('id')
                  ?.replace('tab-', '');

              if (visibleTabId) {
                  $("#sidebar .nav-link").removeClass('active');
                  $(`#sidebar .nav-link[data-tab='${visibleTabId}']`).addClass('active');
              } else {
                  $("#tab-home").removeClass("d-none");
                  $("#sidebar .nav-link").removeClass('active');
                  $("#sidebar .nav-link[data-tab='home']").addClass('active');
              }
          }
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
          timeout: 15000,
          success: function(data) {
              localData = {
                  Mitko: [],
                  Aylin: []
              };
              let parseErrors = 0;

              (data || []).forEach(entry => {
                  if (entry &&
                      entry.User &&
                      localData[entry.User] !== undefined &&
                      entry.Timestamp) {

                      const parsed = {
                          id: entry.Entry_Id ? Number(String(entry.Entry_Id).trim()) : null,
                          diamond: parseInt(entry.Diamonds),
                          crests: parseInt(entry.Crests),
                          date: entry.Date,
                          timestamp: Date.parse(entry.Timestamp),
                          user: entry.User
                      };

                      parsed.diamond = isNaN(parsed.diamond) ? 0 : parsed.diamond;
                      parsed.crests = isNaN(parsed.crests) ? 0 : parsed.crests;

                      if (isNaN(parsed.timestamp)) {
                          parseErrors++;
                          return;
                      }
                      localData[entry.User].push(parsed);
                  } else {
                      parseErrors++;
                  }
              });

              localData.Mitko.sort((a, b) => b.timestamp - a.timestamp);
              localData.Aylin.sort((a, b) => b.timestamp - a.timestamp);

              if (parseErrors > 0) {
                  console.warn(`Data parsing errors: ${parseErrors}`);
              }

              $("#loader").addClass("d-none");

              if (callback) {
                  callback();
              }
          },
          error: function(jqXHR, textStatus, errorThrown) {
              console.error("Fetch Error:", textStatus, errorThrown);
              let errorMsg = "Error fetching data.";
              if (textStatus === 'timeout') {
                  errorMsg = "Error: Request timed out.";
              } else if (textStatus === 'parsererror') {
                  errorMsg = "Error: Failed to parse response.";
              }
              alert(errorMsg);
              $("#loader").addClass("d-none");
          }
      });
  }

  //===================== SIDEBAR / OVERLAY =====================

  $("#open-sidebar").click(function() {
      $("#sidebar").addClass("open");
      $("#overlay").stop().fadeIn(300);
  });

  $("#close-sidebar, #overlay").click(function(e) {
      e.stopPropagation();
      $("#sidebar").removeClass("open");
      $("#overlay").stop().fadeOut(300);
  });

  $("#sidebar .nav-link").click(function(e) {
      e.preventDefault();
      let tabId = $(this).data("tab");

      $("#sidebar .nav-link").removeClass('active');
      $(this).addClass('active');

      $(".tab-content").addClass("d-none");
      $("#tab-" + tabId)
          .removeClass("d-none")
          .hide()
          .fadeIn(150);

      $("#sidebar").removeClass("open");
      $("#overlay").stop().fadeOut(300);

      switch (tabId) {
          case 'stats':
              updateStats();
              break;
          case 'compare':
              updateCompare();
              break;
          case 'history':
              updateHistory();
              break;
          case 'home':
              updateHomeDrawList();
              break;
      }
  });

  //===================== SETTINGS =====================

  $("#change-user").click(function() {
      localStorage.removeItem("currentUser");
      location.reload();
  });

  $("#reset-data").click(function() {
      if (confirm(`Reset local data for ${currentUser}? (Google Sheet unaffected)`)) {
          if (currentUser && localData[currentUser]) {
              localData[currentUser] = [];
              updateHistory();
              updateStats();
              updateCompare();
              updateHomeDrawList();
              alert(`Local data for ${currentUser} reset!`);
          } else {
              alert("No user selected or data empty.");
          }
      }
  });

  //===================== STATS TOGGLE =====================

  function attachStatsToggleListeners() {
      $("#toggle-tokens").off('click').on('click', function() {
          if (statsView !== 'tokens') {
              statsView = "tokens";
              $(this).addClass("active");
              $("#toggle-diamonds").removeClass("active");
              updateStats();
          }
      });
      $("#toggle-diamonds").off('click').on('click', function() {
          if (statsView !== 'diamonds') {
              statsView = "diamonds";
              $(this).addClass("active");
              $("#toggle-tokens").removeClass("active");
              updateStats();
          }
      });
  }

  //===================== DRAW OPTION =====================

  $(".draw-option").click(function() {
      const diamond = parseInt($(this).data("diamond"));
      currentDiamond = diamond;

      const label = (diamond === 0) ? "Free Draw" : diamond + " Diamonds";
      $("#selected-draw-label").text(label);
      $("#draw-type-icon").attr("src", diamond === 0 ? "assets/mystical_dial.png" : "assets/diamond.png");

      $("#extendedMode").prop("checked", false);
      maxValue = 20;
      crestValue = minValue;
      $("#crestValue").text(minValue);

      if (ctx) {
          drawRing(minValue);
      }
  });

  //===================== EXTENDED MODE =====================

  $("#extendedMode").change(function() {
      maxValue = $(this).is(":checked") ? 300 : 20;
      crestValue = Math.max(minValue, Math.min(crestValue, maxValue));
      $("#crestValue").text(crestValue);
      if (ctx) {
          drawRing(crestValue);
      }
  });

  //===================== RADIAL SLIDER =====================

  function drawRing(value) {
      if (!ctx) return;

      ctx.clearRect(0, 0, radialCanvas.width, radialCanvas.height);

      // Draw background ring
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.strokeStyle = "rgba(255,255,255,0.2)";
      ctx.lineWidth = lineWidth;
      ctx.stroke();

      // Draw progress arc
      const clampedValue = Math.max(minValue, Math.min(value, maxValue));
      const fraction = (maxValue === minValue) ? 0 : (clampedValue - minValue) / (maxValue - minValue);
      const angle = fraction * 2 * Math.PI;

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, -Math.PI / 2, angle - Math.PI / 2, false);
      ctx.strokeStyle = "#FFBCD9";
      ctx.lineWidth = lineWidth;
      ctx.lineCap = "round";
      ctx.stroke();

      // Draw handle
      const endX = centerX + radius * Math.cos(angle - Math.PI / 2);
      const endY = centerY + radius * Math.sin(angle - Math.PI / 2);

      ctx.beginPath();
      ctx.arc(endX, endY, lineWidth / 1.8, 0, 2 * Math.PI);
      ctx.fillStyle = "#FFC0CB";
      ctx.fill();
  }

  function updateValueFromAngle(angle) {
      if (angle < 0) {
          angle += 2 * Math.PI;
      }
      const fraction = angle / (2 * Math.PI);
      const raw = minValue + fraction * (maxValue - minValue);

      crestValue = Math.round(raw);
      crestValue = Math.max(minValue, Math.min(crestValue, maxValue));

      $("#crestValue").text(crestValue);
      if (ctx) {
          drawRing(crestValue);
      }
  }

  let isDragging = false;

  function isTouchEvent(e) {
      return e.type.startsWith('touch');
  }

  function getClientCoords(e) {
      return isTouchEvent(e) ? (e.originalEvent || e).touches[0] : e;
  }

  function pointerDown(e) {
      const coords = getClientCoords(e);
      if (!coords) return;

      const rect = radialCanvas.getBoundingClientRect();
      const x = coords.clientX - rect.left;
      const y = coords.clientY - rect.top;

      const dx = x - centerX;
      const dy = y - centerY;
      const distSq = dx * dx + dy * dy;
      const tolerance = 10;
      const outerRadiusSq = (radius + lineWidth / 2 + tolerance) ** 2;
      const innerRadiusSq = (radius - lineWidth / 2 - tolerance) ** 2;

      if (distSq >= innerRadiusSq && distSq <= outerRadiusSq) {
          if (!isTouchEvent(e)) {
              if (e.button === 0) { // Only prevent default for left click
                  e.preventDefault();
              }
          } else {
              e.preventDefault();
          }
          isDragging = true;
          pointerMove(e); // Update immediately on press
      } else {
          isDragging = false;
      }
  }

  function pointerMove(e) {
      if (!isDragging) return;

      const coords = getClientCoords(e);
      if (!coords) return;

      if (!isTouchEvent(e)) {
           e.preventDefault();
      } else {
           e.preventDefault();
      }

      const rect = radialCanvas.getBoundingClientRect();
      const x = coords.clientX - rect.left;
      const y = coords.clientY - rect.top;

      const dx = x - centerX;
      const dy = y - centerY;
      let angle = Math.atan2(dy, dx) + Math.PI / 2; // Adjust for top start
      updateValueFromAngle(angle);
  }

  function pointerUp(e) {
      isDragging = false;
  }

  $(radialCanvas)
      .on("mousedown", pointerDown)
      .on("mousemove", pointerMove);
  $(window)
      .on("mouseup", pointerUp);

  $(radialCanvas)
      .on("touchstart", pointerDown)
      .on("touchmove", pointerMove);
  $(window)
      .on("touchend", pointerUp)
      .on("touchcancel", pointerUp);

  //===================== SUBMIT / CANCEL DRAW =====================

  function submitEntryToSheet(entry) {
      $("#loader").removeClass("d-none");

      $.ajax({
          url: url_tracker,
          method: "POST",
          data: {
              action: "add",
              diamond: entry.diamond,
              crests: entry.crests,
              timestamp: entry.timestamp,
              User: entry.User
          },
          timeout: 20000,
          success: function(response) {
              console.log("Entry submitted: ", response);
              fetchRemoteData(() => {
                  updateHistory();
                  updateStats();
                  updateCompare();
                  updateHomeDrawList();
                  $("#loader").addClass("d-none");
              });
          },
          error: function(jqXHR, textStatus, errorThrown) {
              console.error("Submit Error:", textStatus, errorThrown);
              alert("Error submitting draw.");
              $("#loader").addClass("d-none");
          }
      });
  }

  $("#submit-draw").click(function() {
      if (currentDiamond === null) {
          alert("Select draw type.");
          return;
      }

      if (confirm(`Record: ${currentDiamond === 0 ? 'Free' : currentDiamond + '💎'} -> ${crestValue} Tokens?`)) {
          let entry = {
              id: 'local-' + Date.now(),
              diamond: currentDiamond,
              crests: crestValue,
              timestamp: Date.now(),
              User: currentUser
          };

          // Optimistically update UI
          localData[currentUser].unshift({ ...entry });
          updateHistory();
          updateStats();
          updateCompare();
          updateHomeDrawList();

          // Submit to Google Sheet
          submitEntryToSheet({
              diamond: entry.diamond,
              crests: entry.crests,
              timestamp: entry.timestamp,
              User: entry.User
          });

          // Show notification if permission granted
          if ("Notification" in window && Notification.permission === "granted") {
              new Notification("Draw Recorded", {
                  body: `Gained ${crestValue} tokens!`,
                  icon: "assets/token.png"
              });
          }

          // Reset form
          currentDiamond = null;
          $("#selected-draw-label").text("");
          $("#extendedMode").prop("checked", false);
          maxValue = 20;
          crestValue = minValue;
          $("#crestValue").text(minValue);
          if (ctx) {
              drawRing(minValue);
          }
      }
  });

  $("#cancel-draw").click(function() {
      if (confirm("Cancel draw input?")) {
          currentDiamond = null;
          $("#selected-draw-label").text("");
          $("#extendedMode").prop("checked", false);
          maxValue = 20;
          crestValue = minValue;
          $("#crestValue").text(minValue);
          if (ctx) {
              drawRing(minValue);
          }
      }
  });

  //===================== UPDATE HISTORY / HOME LIST =====================

  function updateHistory() {
      let historyList = $("#history-list");
      historyList.empty();

      const userEntries = Array.isArray(localData[currentUser]) ? localData[currentUser] : [];

      if (userEntries.length === 0) {
          historyList.html('<li class="list-group-item text-center text-muted">No history.</li>');
          return;
      }

      userEntries.forEach(entry => {
          if (!entry || typeof entry.timestamp !== 'number' || isNaN(entry.timestamp)) {
               // Skip invalid entries quietly
               console.warn("Skipping invalid history entry:", entry);
               return;
          }

          let drawDate = new Date(entry.timestamp).toLocaleDateString();
          let drawTime = new Date(entry.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
          });
          let diamondText = (entry.diamond === 0) ?
              `<img src="assets/mystical_dial.png" class="small-icon" alt="Free Draw"> Free` :
              `${entry.diamond} <img class='small-icon' src='assets/diamond.png' alt='Diamond'>`;

          let entryId = entry.id;
          let entryIdAttr = entryId ? `data-entry-id="${entryId}"` : '';
          // Check if entry is synced (has a non-local ID)
          let canEditDelete = entryId && !String(entryId).startsWith('local-');
          let isLocal = entryId && String(entryId).startsWith('local-');

          let listItem = `
              <div class="history-card mb-3" ${entryIdAttr}>
                  <div class="d-flex justify-content-between align-items-center">
                      <div>
                          <div class="history-date">${drawDate} ${drawTime}</div>
                          <div class="history-details">
                              ${diamondText} → ${entry.crests} <img src="assets/token.png" class="small-icon ms-1" alt="token">
                          </div>
                      </div>
                      <div>
                          ${ canEditDelete ?
                              `<button class="btn btn-sm btn-outline-danger delete-entry" data-id="${entryId}"><i class="fa fa-trash"></i></button>` +
                              `<button class="btn btn-sm btn-outline-primary edit-entry ms-2" data-id="${entryId}"><i class="fa fa-edit"></i></button>`
                              : (isLocal ? '<span class="sync-indicator text-muted small" title="Syncing..."><i class="fas fa-sync fa-spin"></i></span>' : '')
                          }
                      </div>
                  </div>
              </div>`;

          historyList.append(listItem);
      });
  }

  function updateHomeDrawList() {
      let drawListHome = $("#draw-list");
      drawListHome.empty();

      const userEntries = Array.isArray(localData[currentUser]) ? localData[currentUser] : [];

      if (userEntries.length === 0) {
          drawListHome.html('<p class="text-center text-light mt-3">No recent draws.</p>');
          return;
      }

      const recentEntries = userEntries.slice(0, 15); // Show latest 15

      recentEntries.forEach(entry => {
           if (!entry || typeof entry.timestamp !== 'number' || isNaN(entry.timestamp)) {
               // Skip invalid entries quietly
               console.warn("Skipping invalid home list entry:", entry);
               return;
           }

          let drawDate = new Date(entry.timestamp).toLocaleDateString();
          let drawTime = new Date(entry.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
          });
          let diamondText = (entry.diamond === 0) ?
              `<img src="assets/mystical_dial.png" class="small-icon" alt="Free Draw"> Free` :
              `${entry.diamond} <img class='small-icon' src='assets/diamond.png' alt='Diamond'>`;

          let entryId = entry.id;
          let entryIdAttr = entryId ? `data-entry-id="${entryId}"` : '';
          // Check if entry is synced (has a non-local ID)
          let canEditDelete = entryId && !String(entryId).startsWith('local-');
          let isLocal = entryId && String(entryId).startsWith('local-');

          let card = `
              <div class="card mb-2 history-card" ${entryIdAttr}>
                  <div class="card-body d-flex align-items-center p-2">
                      <div class="me-auto">
                          <div class="history-date small">${drawDate} ${drawTime}</div>
                          <div class="history-details">
                              ${diamondText} → ${entry.crests} <img src="assets/token.png" alt="Token" class="small-icon ms-1">
                          </div>
                      </div>
                      ${ canEditDelete ?
                          `<button class="btn btn-sm btn-outline-danger delete-entry" data-id="${entryId}"><i class="fa fa-trash"></i></button>` +
                          `<button class="btn btn-sm btn-outline-primary edit-entry ms-2" data-id="${entryId}"><i class="fa fa-edit"></i></button>`
                          : (isLocal ? '<span class="sync-indicator text-muted small" title="Syncing..."><i class="fas fa-sync fa-spin"></i></span>' : '')
                      }
                  </div>
              </div>`;

          drawListHome.append(card);
      });
  }

  //===================== UPDATE STATS =====================

  function updateStats() {
      let entries = localData[currentUser];

      if (!entries || !Array.isArray(entries)) {
          $("#tab-stats .container").html('<p class="text-light text-center mt-4">No stats data.</p>');
          return;
      }

      // Check if stats HTML structure exists, if not, create it
      if ($("#tab-stats .container #stats-chart").length === 0) {
          $("#tab-stats .container").html(`
              <div class="stats-panel card p-3 mb-3">
                  <div class="text-center mb-3">
                      <img id="character-image" src="" alt="Character" class="character-img mb-2">
                      <h4 id="progress-title">Progress</h4>
                  </div>
                  <div id="stats-toggle" class="d-flex justify-content-center mb-3">
                      <button id="toggle-tokens" class="btn btn-sm btn-outline-light">Tokens</button>
                      <button id="toggle-diamonds" class="btn btn-sm btn-outline-light ms-2">Diamonds Spent</button>
                  </div>
                  <div class="progress mb-3">
                      <div id="progress-bar" class="progress-bar" role="progressbar" style="width: 0%;" aria-valuemin="0" aria-valuemax="100">0%</div>
                  </div>
                  <p id="stats-summary" class="mb-0">
                      Total: <span id="total-crest">0</span> <img src="assets/token.png" alt="Token" class="small-icon">
                  </p>
              </div>
              <canvas id="stats-chart" class="mb-4"></canvas>
              <div class="card mb-3 p-2">
                  <h5 class="text-dark">Free vs Diamond</h5>
                  <canvas id="stats-pie"></canvas>
              </div>
              <div class="card mb-3 p-2">
                  <h5 class="text-dark">Tokens Over Time (Moving Average)</h5>
                  <canvas id="stats-line"></canvas>
              </div>
              <div class="card mb-3 p-2">
                  <h5 class="text-dark"><img src="assets/token.png" class="draw-img" alt="Dial" /> Distribution</h5>
                  <canvas id="stats-hist"></canvas>
              </div>
              <div class="card mb-3 p-2">
                   <h5 class="text-dark">Average <img src="assets/token.png" class="draw-img" alt="Dial" /> by Diamond Tier</h5>
                  <canvas id="stats-tier"></canvas>
              </div>
              <div id="advanced-metrics" class="card p-3" style="background-color: rgba(0, 0, 0, 0.5);">
                  <h5 class="text-light mb-3">Advanced Metrics</h5>
                  <div id="advanced-metrics-grid" class="metrics-grid"></div>
              </div>
          `);
          // Set initial character image
          let charImgSrc = (currentUser === "Mitko") ? "assets/fredrinn.png" : "assets/lylia.png";
          $("#character-image").attr("src", charImgSrc);
      }

      // Attach listeners and set active toggle
      attachStatsToggleListeners();
      $("#toggle-tokens, #toggle-diamonds").removeClass("active");
      $(`#toggle-${statsView}`).addClass("active");

      // Update all charts and metrics
      updateMainBarChart(entries);
      updatePieChart(entries);
      updateLineChart(entries);
      updateHistogram(entries);
      updateTierChart(entries);
      updateAdvancedMetrics(entries);
  }

  //===================== CHART UPDATE FUNCTIONS =====================

  function updateMainBarChart(entries) {
      const canvas = document.getElementById("stats-chart");
      if (!canvas) return;

      // Destroy existing chart instance if it exists
      if (window.myChart) {
          window.myChart.destroy();
      }

      const labels = entries.map((_, i) => "Draw " + (entries.length - i)).reverse();
      const progressTarget = 1200; // Target for progress bar (tokens)

      // Ensure character image is correct
      const characterImageSrc = (currentUser === "Mitko") ? "assets/fredrinn.png" : "assets/lylia.png";
      const imgElement = $("#character-image");
      if (imgElement.length) {
          imgElement.attr("src", characterImageSrc);
      }

      if (statsView === "tokens") {
          $("#progress-title").html(`Token Progress <img src='assets/token.png' alt='Token' class='small-icon'>`);
          let totalCrests = entries.reduce((sum, e) => sum + e.crests, 0);
          $("#stats-summary").html(`Total Tokens: <span id='total-crest'>${totalCrests}</span> <img src='assets/token.png' alt='Token' class='small-icon'> / ${progressTarget}`);
          let progressPercent = Math.min((totalCrests / progressTarget) * 100, 100);
          $("#progress-bar")
              .css("width", progressPercent + "%")
              .text(Math.floor(progressPercent) + "%")
              .parent().show(); // Show progress bar container

          let dataPoints = entries.map(e => e.crests).reverse();
          window.myChart = new Chart(canvas, {
              type: "bar",
              data: {
                  labels: labels,
                  datasets: [{
                      label: "Tokens per Draw",
                      data: dataPoints,
                      backgroundColor: "#FFD4D4"
                  }]
              },
              options: {
                  responsive: true,
                  maintainAspectRatio: true,
                  scales: {
                      y: { beginAtZero: true }
                  },
                  plugins: {
                      legend: { display: false }
                  }
              }
          });
      } else { // statsView === "diamonds"
          $("#progress-title").html(`Diamond Spending <img src='assets/diamond.png' alt='Diamond' class='small-icon'>`);
          let totalDiamonds = entries.reduce((sum, e) => sum + (e.diamond > 0 ? e.diamond : 0), 0);
          $("#stats-summary").html(`Total Spent: <span id='total-diamonds'>${totalDiamonds}</span> <img src='assets/diamond.png' alt='Diamond' class='small-icon'>`);
          $("#progress-bar").parent().hide(); // Hide progress bar container

          let dataPoints = entries.map(e => (e.diamond > 0 ? e.diamond : 0)).reverse();
          window.myChart = new Chart(canvas, {
              type: "bar",
              data: {
                  labels: labels,
                  datasets: [{
                      label: "Diamonds per Draw",
                      data: dataPoints,
                      backgroundColor: "#FFDEAD" // Different color for diamonds
                  }]
              },
              options: {
                  responsive: true,
                  maintainAspectRatio: true,
                  scales: {
                      y: { beginAtZero: true }
                  },
                  plugins: {
                      legend: { display: false }
                  }
              }
          });
      }
  }

  function updatePieChart(entries) {
      const canvas = document.getElementById("stats-pie");
      if (!canvas) return;

      if (window.myPieChart) {
          window.myPieChart.destroy();
      }
      if (entries.length === 0) {
          canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height); // Clear if no data
          return;
      }

      let freeCount = entries.filter(e => e.diamond === 0).length;
      let diamondCount = entries.length - freeCount;

      window.myPieChart = new Chart(canvas, {
          type: "pie",
          data: {
              labels: [`Free (${freeCount})`, `Diamond (${diamondCount})`],
              datasets: [{
                  data: [freeCount, diamondCount],
                  backgroundColor: ["#FFAEC9", "#F28EFF"],
                  borderColor: '#fff',
                  borderWidth: 1
              }]
          },
          options: {
              responsive: true,
              maintainAspectRatio: true,
              plugins: {
                  legend: {
                      display: true,
                      position: 'top'
                  }
              }
          }
      });
  }

  function updateLineChart(entries) {
      const canvas = document.getElementById("stats-line");
      if (!canvas) return;

      if (window.myLineChart) {
          window.myLineChart.destroy();
      }
      if (entries.length === 0) {
           canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height); // Clear if no data
          return;
      }

      // Sort entries by timestamp for chronological order
      let sorted = [...entries].sort((a, b) => a.timestamp - b.timestamp);
      const windowSize = 3; // Moving average window
      let tokensArray = sorted.map(e => e.crests);
      let labels = sorted.map((e, i) => "D" + (i + 1)); // Label as Draw 1, Draw 2, ...
      let maData = []; // Moving average data

      for (let i = 0; i < tokensArray.length; i++) {
          let start = Math.max(0, i - windowSize + 1);
          let subset = tokensArray.slice(start, i + 1);
          let avg = subset.reduce((s, val) => s + val, 0) / subset.length;
          maData.push(avg);
      }

      window.myLineChart = new Chart(canvas, {
          type: "line",
          data: {
              labels: labels,
              datasets: [{
                  label: `Tokens (${windowSize}-Draw Avg)`,
                  data: maData,
                  backgroundColor: "rgba(255, 184, 238, 0.5)",
                  borderColor: "#ffaec9",
                  borderWidth: 2,
                  fill: true,
                  tension: 0.2 // Smooths the line
              }]
          },
          options: {
              responsive: true,
              maintainAspectRatio: true,
              scales: {
                  y: { beginAtZero: true }
              },
              plugins: {
                  legend: {
                      display: true,
                      position: 'top'
                  }
              }
          }
      });
  }

  function updateHistogram(entries) {
      const canvas = document.getElementById("stats-hist");
      if (!canvas) return;

      if (window.myHistChart) {
          window.myHistChart.destroy();
      }
      if (entries.length === 0) {
           canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height); // Clear if no data
          return;
      }

      // Count occurrences of each crest value
      let distributionMap = {};
      entries.forEach(e => {
          distributionMap[e.crests] = (distributionMap[e.crests] || 0) + 1;
      });

      // Prepare data for bar chart (sorted labels)
      let crestValues = Object.keys(distributionMap).map(v => parseInt(v)).sort((a, b) => a - b);
      let frequencies = crestValues.map(v => distributionMap[v]);

      window.myHistChart = new Chart(canvas, {
          type: "bar",
          data: {
              labels: crestValues.map(v => String(v)), // Crest values as labels
              datasets: [{
                  label: "Draw count",
                  data: frequencies,
                  backgroundColor: "#fdc5f5"
              }]
          },
          options: {
              responsive: true,
              maintainAspectRatio: true,
              scales: {
                  y: {
                      beginAtZero: true,
                      ticks: { stepSize: 1 } // Integer ticks for count
                  }
              },
              plugins: {
                  legend: { display: false } // Label in title is sufficient
              }
          }
      });
  }

   function updateTierChart(entries) {
      const canvas = document.getElementById("stats-tier");
      if (!canvas) return;

      if (window.myTierChart) {
          window.myTierChart.destroy();
      }
       if (entries.length === 0) {
           canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height); // Clear if no data
           return;
       }

      let tiers = [0, 25, 50, 450, 500]; // Define diamond tiers
      let tierLabels = ["Free(0)", "25💎", "50💎", "450💎", "500💎"];
      let avgTokensForTier = [];
      let drawCountsForTier = []; // Store draw counts for tooltips

      tiers.forEach(t => {
          let subset = entries.filter(e => e.diamond === t);
          drawCountsForTier.push(subset.length);
          avgTokensForTier.push(subset.length === 0 ? 0 : subset.reduce((acc, e) => acc + e.crests, 0) / subset.length);
      });

      window.myTierChart = new Chart(canvas, {
          type: "bar",
          data: {
              labels: tierLabels,
              datasets: [{
                  label: "Avg Tokens",
                  data: avgTokensForTier,
                  backgroundColor: "#fed8de",
                  drawCounts: drawCountsForTier // Store draw counts in dataset
              }]
          },
          options: {
              responsive: true,
              maintainAspectRatio: true,
              scales: {
                  y: { beginAtZero: true }
              },
              plugins: {
                  legend: { display: false },
                  tooltip: {
                      callbacks: {
                          label: function(context) {
                              return `Avg Tokens: ${context.parsed.y.toFixed(2)}`;
                          },
                           afterLabel: function(context) {
                              // Access draw counts from dataset
                              return `(${context.dataset.drawCounts[context.dataIndex]} draws)`;
                          }
                      }
                  }
              }
          }
      });
  }

  //===================== METRICS CALCULATION =====================

  function computeMetrics(entries) {
       // Ensure entries is an array, default to empty if not
      entries = Array.isArray(entries) ? entries : [];

      let totalDraws = entries.length;
      let totalFree = entries.filter(e => e.diamond === 0).length;
      let totalDiamond = totalDraws - totalFree;

      let totalCrests = entries.reduce((acc, e) => acc + e.crests, 0);
      let totalDiamondsSpent = entries.reduce((acc, e) => acc + (e.diamond > 0 ? e.diamond : 0), 0);

      let tokensPerDraw = totalDraws === 0 ? 0 : totalCrests / totalDraws;

      // Find best draw entry
      let best = entries.reduce((b, e) => (e && typeof e.crests === 'number' && e.crests > b.crests) ? e : b, { crests: -Infinity });
      let bestDraw = (best.crests === -Infinity) ? null : best; // Check if a best draw was found

      // Simple luck status based on average tokens per draw (adjust threshold as needed)
      let luckStatus = "Average";
      if (tokensPerDraw > 9) { // Example threshold
          luckStatus = "Lucky";
      } else if (tokensPerDraw < 9 && totalDraws > 0) { // Only unlucky if draws exist
          luckStatus = "Unlucky";
      } else if (totalDraws === 0) {
           luckStatus = "N/A";
      }

      // Cost efficiency (diamonds per token)
      let costEfficiency = null; // Use null for N/A cases
      if (totalDiamondsSpent > 0 && totalCrests > 0) {
          costEfficiency = totalDiamondsSpent / totalCrests;
      } else if (totalDiamondsSpent === 0 && totalCrests > 0) {
           costEfficiency = 0; // Free tokens are infinitely efficient
      } else if (totalDiamondsSpent > 0 && totalCrests === 0) {
          costEfficiency = Infinity; // Spent diamonds, got no tokens
      }
      // If totalDiamondsSpent = 0 and totalCrests = 0, costEfficiency remains null


      return {
          totalDraws,
          totalFree,
          totalDiamond,
          totalCrests,
          totalDiamondsSpent,
          bestDraw,
          tokensPerDraw,
          costEfficiency,
          luckStatus
      };
  }

  //===================== METRICS HTML BUILDER (SHARED) =====================

  function buildMetricsHTML(m, isComparePage = false, compareFlags = {}) {
      let freePercent = (m.totalDraws === 0) ? 0 : (m.totalFree / m.totalDraws) * 100;
      let diamondPercent = (m.totalDraws === 0) ? 0 : (m.totalDiamond / m.totalDraws) * 100;

      // Helper function to add 'leader' class on compare page
      const leaderClass = (flag) => (isComparePage && flag) ? ' compare-leader' : '';

      let html = '';

      // Total Draws
      html += `
          <div class="metric-card">
              <div class="metric-label">
                  Total Draws <img src="assets/mystical_dial.png" class="metric-icon" alt="Dial" />
              </div>
              <div class="metric-value">${m.totalDraws}</div>
          </div>`;

      // Total Tokens
      html += `
          <div class="metric-card${leaderClass(compareFlags.isLeadingTotalTokens)}">
              <div class="metric-label">
                  Total Tokens <img src="assets/token.png" class="metric-icon" alt="Token" />
              </div>
              <div class="metric-value">${m.totalCrests}</div>
          </div>`;

      // Avg Tokens/Draw (only on Stats page, implied in Luck on Compare page)
      if (!isComparePage) {
          html += `
              <div class="metric-card">
                  <div class="metric-label">
                      Avg Tokens/Draw <img src="assets/token.png" class="metric-icon" alt="Token" />
                  </div>
                  <div class="metric-value">${m.tokensPerDraw.toFixed(2)}</div>
              </div>`;
      }

      // Total Diamonds Spent
      html += `
          <div class="metric-card">
              <div class="metric-label">
                  Total Spent <img src="assets/diamond.png" class="metric-icon" alt="Diamond" />
              </div>
              <div class="metric-value">${m.totalDiamondsSpent}</div>
              <div class="metric-note">Diamonds</div>
          </div>`;

      // Cost Efficiency
      let costEfficiencyText = "N/A";
      if (m.costEfficiency === 0) {
           costEfficiencyText = "0.00 💎/Token (Free)";
      } else if (m.costEfficiency === Infinity) {
          costEfficiencyText = "∞ 💎/Token";
      } else if (m.costEfficiency !== null) {
          costEfficiencyText = m.costEfficiency.toFixed(2) + " 💎/Token";
      }
      const costNote = (m.costEfficiency !== null && m.costEfficiency !== Infinity && m.costEfficiency !== 0) ? '(Lower is Better)' : '';
      html += `
          <div class="metric-card${leaderClass(compareFlags.isLeadingCostEfficiency)}">
              <div class="metric-label">
                  Cost Efficiency <i class="fas fa-coins metric-icon"></i>
              </div>
              <div class="metric-value">${costEfficiencyText}</div>
               <div class="metric-note">${costNote}</div>
          </div>`;

      // Best Draw
      let bestDrawHTML = "";
      if (m.bestDraw) {
          bestDrawHTML = `
              <div class="metric-card${leaderClass(compareFlags.isLeadingBestDraw)}">
                  <div class="metric-label">
                      Best Draw <img src="assets/token.png" class="metric-icon" alt="token" />
                  </div>
                  <div class="metric-value">${m.bestDraw.crests}</div>
                   <div class="metric-note"> ${m.bestDraw.diamond > 0 ? `(${m.bestDraw.diamond}💎)` : "(Free)"} </div>
              </div>`;
      } else {
           bestDrawHTML = `
              <div class="metric-card">
                  <div class="metric-label">
                      Best Draw <img src="assets/token.png" class="metric-icon" alt="token" />
                  </div>
                  <div class="metric-value">N/A</div>
              </div>`;
      }
      html += bestDrawHTML;

      // Free Draws
      html += `
          <div class="metric-card">
              <div class="metric-label">
                  Free Draws <img src="assets/mystical_dial.png" class="metric-icon" alt="Free" />
              </div>
              <div class="metric-value">${m.totalFree}</div>
              <div class="metric-note">${freePercent.toFixed(1)}%</div>
          </div>`;

      // Diamond Draws
      html += `
          <div class="metric-card">
              <div class="metric-label">
                  Diamond Draws <img src="assets/diamond.png" class="metric-icon" alt="diamond" />
              </div>
              <div class="metric-value">${m.totalDiamond}</div>
              <div class="metric-note">${diamondPercent.toFixed(1)}%</div>
          </div>`;

      // Luck Status / Score
      let luckNote = '';
      if (isComparePage) {
          // Show the average on compare page's luck note
           luckNote = `${m.tokensPerDraw.toFixed(2)} <img src="assets/token.png" class="metric-icon" alt="Token" style="height: 1em; vertical-align: baseline;"/> /draw`;
      } else {
          // On stats page, average is already shown separately
           luckNote = `${m.tokensPerDraw.toFixed(2)} tokens/draw`;
      }

      html += `
          <div class="metric-card${leaderClass(compareFlags.isLeadingLuck)}">
              <div class="metric-label">
                  Luck Score™ <img src="assets/mystical_dial.png" class="metric-icon" alt="Luck" />
              </div>
              <div class="metric-value">${m.luckStatus}</div>
              <div class="metric-note"> ${luckNote} </div>
          </div>`;

      return html;
  }

  //===================== UPDATE ADVANCED METRICS (STATS PAGE) =====================

  function updateAdvancedMetrics(entries) {
      // Ensure entries is an array
       entries = Array.isArray(entries) ? entries : [];

      let metrics = computeMetrics(entries);
      let advHtml = buildMetricsHTML(metrics); // Use the shared builder
      $("#advanced-metrics-grid").html(advHtml);
  }

  //===================== UPDATE COMPARE PAGE =====================

  function updateCompare() {
      let compareContainer = $("#compare-container");
      compareContainer.empty();

      // Setup compare page structure
      compareContainer.html(`
          <div class="compare-row">
              <div class="compare-column" id="compare-mitko-col">
                  <h5 class="text-light mb-3 d-flex align-items-center justify-content-center flex-column">
                      <img src="assets/fredrinn.png" alt="Mitko" class="compare-user-icon me-2" /> Mitko
                  </h5>
                  <div class="metrics-grid" id="compare-mitko-grid"></div>
              </div>
              <div class="compare-column" id="compare-aylin-col">
                  <h5 class="text-light mb-3 d-flex align-items-center justify-content-center flex-column">
                      <img src="assets/lylia.png" alt="Aylin" class="compare-user-icon me-2" /> Aylin
                  </h5>
                  <div class="metrics-grid" id="compare-aylin-grid"></div>
              </div>
          </div>
      `);

      const mitkoEntries = Array.isArray(localData["Mitko"]) ? localData["Mitko"] : [];
      const aylinEntries = Array.isArray(localData["Aylin"]) ? localData["Aylin"] : [];

      let mitkoMetrics = computeMetrics(mitkoEntries);
      let aylinMetrics = computeMetrics(aylinEntries);

      // Determine who is "leading" in each relevant metric for highlighting
       const mitkoFlags = {
          isLeadingTotalTokens: mitkoMetrics.totalCrests > aylinMetrics.totalCrests,
          isLeadingAvgTokens: false, // Not directly shown, covered by Luck
          isLeadingBestDraw: (mitkoMetrics.bestDraw ? mitkoMetrics.bestDraw.crests : -1) > (aylinMetrics.bestDraw ? aylinMetrics.bestDraw.crests : -1),
          isLeadingCostEfficiency: (() => {
              const mEff = mitkoMetrics.costEfficiency;
              const oEff = aylinMetrics.costEfficiency;
              // Lower non-null/non-infinity is better. 0 is best.
              if (mEff === 0 && oEff !== 0) return true; // Mitko free, Aylin not
              if (mEff !== null && mEff !== Infinity && (oEff === null || oEff === Infinity || mEff < oEff)) return true; // Mitko has finite cost, better than Aylin's N/A, Inf, or higher finite cost
              if (mEff === null && oEff === Infinity) return true; // Mitko N/A (no cost/no tokens) is better than infinite cost
              return false;
          })(),
          isLeadingLuck: mitkoMetrics.tokensPerDraw > aylinMetrics.tokensPerDraw && mitkoMetrics.luckStatus !== 'Average' && mitkoMetrics.luckStatus !== 'N/A' // Lead only if status is Lucky/Unlucky
      };

      const aylinFlags = {
          isLeadingTotalTokens: aylinMetrics.totalCrests > mitkoMetrics.totalCrests,
          isLeadingAvgTokens: false, // Not directly shown, covered by Luck
          isLeadingBestDraw: (aylinMetrics.bestDraw ? aylinMetrics.bestDraw.crests : -1) > (mitkoMetrics.bestDraw ? mitkoMetrics.bestDraw.crests : -1),
          isLeadingCostEfficiency: (() => {
               const mEff = aylinMetrics.costEfficiency;
               const oEff = mitkoMetrics.costEfficiency;
              if (mEff === 0 && oEff !== 0) return true;
              if (mEff !== null && mEff !== Infinity && (oEff === null || oEff === Infinity || mEff < oEff)) return true;
              if (mEff === null && oEff === Infinity) return true;
              return false;
          })(),
          isLeadingLuck: aylinMetrics.tokensPerDraw > mitkoMetrics.tokensPerDraw && aylinMetrics.luckStatus !== 'Average' && aylinMetrics.luckStatus !== 'N/A'
      };

      // Use the shared builder function with flags
      $("#compare-mitko-grid").html(buildMetricsHTML(mitkoMetrics, true, mitkoFlags));
      $("#compare-aylin-grid").html(buildMetricsHTML(aylinMetrics, true, aylinFlags));
  }

  //===================== DELETE / EDIT ENTRY =====================

  // Use event delegation for dynamically added elements
  $(document).on("click", ".delete-entry", function() {
      const id = $(this).data("id");
      if (!id || String(id).startsWith('local-')) {
           alert("Cannot delete an entry that hasn't synced yet.");
           return;
       }

      if (confirm("Delete this entry?")) {
          $("#loader").removeClass("d-none");
          $.post(url_tracker, { action: "delete", id: id, User: currentUser }, function(response) {
                  console.log("Delete response:", response);
                  // Refetch data after successful delete
                  fetchRemoteData(() => {
                      updateHistory();
                      updateStats();
                      updateCompare();
                      updateHomeDrawList();
                      $("#loader").addClass("d-none");
                  });
              })
              .fail(function() {
                  alert("Delete failed. Please check the console or try again later.");
                  $("#loader").addClass("d-none");
              });
      }
  });

  $(document).on("click", ".edit-entry", function() {
      const id = $(this).data("id");
       if (!id || String(id).startsWith('local-')) {
           alert("Cannot edit an entry that hasn't synced yet.");
           return;
       }

      // Find the entry in local data first
      let entry = localData[currentUser]?.find(e => String(e.id) === String(id));
      if (!entry) {
          alert("Local data for this entry not found. Cannot edit.");
          return;
      }

      // Prompt for new values
      const nDStr = prompt("Edit Diamonds:", entry.diamond);
      if (nDStr === null) return; // User cancelled

      const nCStr = prompt("Edit Tokens:", entry.crests);
      if (nCStr === null) return; // User cancelled

      const nD = parseInt(nDStr);
      const nC = parseInt(nCStr);

      if (isNaN(nD) || nD < 0 || isNaN(nC) || nC < 0) {
          alert("Invalid input. Diamonds and Tokens must be non-negative numbers.");
          return;
      }

      // Check if values actually changed
      if (nD === entry.diamond && nC === entry.crests) {
          // No changes made
          return;
      }

      if (confirm(`Confirm Edit: ${nD}💎 -> ${nC} Tokens?`)) {
          $("#loader").removeClass("d-none");
          $.post(url_tracker, { action: "edit", id: entry.id, diamond: nD, crests: nC, user: currentUser }, function(res) {
                  console.log("Edited:", res);
                  // Refetch data after successful edit
                  fetchRemoteData(() => {
                      updateHistory();
                      updateStats();
                      updateCompare();
                      updateHomeDrawList();
                      $("#loader").addClass("d-none");
                  });
              })
              .fail(function() {
                  alert("Edit failed. Please check the console or try again later.");
                  $("#loader").addClass("d-none");
              });
      }
  });

  //===================== SWIPE HANDLING =====================

  let startX = 0;
  let currentX = 0;
  let threshold = 50; // Min swipe distance
  let touchOnSwipeZone = false; // Flag to track if touch started within the designated zone

  // Only initiate swipe tracking if touch starts on the swipe zone
  $("#swipe-zone").on("touchstart", function(e) {
      startX = e.originalEvent.touches[0].clientX;
      currentX = startX; // Initialize currentX
      touchOnSwipeZone = true;
      // No preventDefault here to allow vertical scroll etc. if swipe doesn't happen
  });

  $(document).on("touchmove", function(e) {
      if (!touchOnSwipeZone) return;
      currentX = e.originalEvent.touches[0].clientX;
  });

  $(document).on("touchend", function() {
      if (!touchOnSwipeZone) return; 

      let diffX = currentX - startX;

      if (diffX > threshold && !$("#sidebar").hasClass("open")) {
          $("#open-sidebar").trigger('click'); // Open sidebar
      }

      touchOnSwipeZone = false;
      startX = 0;
      currentX = 0;
  });

});