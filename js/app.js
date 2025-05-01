$(document).ready(function() {

  let url_tracker = "https://script.google.com/macros/s/AKfycbw5zf6W7KeeYmYcSzc_s96kg6oJVdmak0tnj_Pr0pbCO6CadaAHEFcUL3ZH9Jm-1ZSy/exec";

  if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().then(function(permission) {
          console.log("Notification permission: " + permission);
      });
  }

  let inTenDrawMode = false;      // Flag for the special 10x input state
let tenDrawCounter = 0;         // How many of the 10 results have been entered
let tenDrawDiamondCost = 0;     // Stores 450 or 500 during 10x input
let tenDrawTimestamp = null;    // Timestamp for the entire 10x batch
let tenDrawBatchId = null;      // Optional: Shared ID for the 10 entries
  window.myChart = null;
  window.myPieChart = null;
  window.myLineChart = null;
  window.myHistChart = null;
  window.myTierChart = null;

  let holdTimer = null;
const HOLD_DURATION = 750; // Milliseconds for long press
  let localData = {
      Mitko: [],
      Aylin: []
  };
  let currentUser = localStorage.getItem("currentUser");
  let currentDiamond = null;
  let inSessionMode = false;
  let sessionEntries = []; // Holds entry objects {diamond, crests, timestamp, User, tempId, synced?}
  let statsView = "tokens";
//   const SESSION_MODE_KEY = 'drawTrackerSessionMode';
//   const SESSION_ENTRIES_KEY = 'drawTrackerSessionEntries';
  let minValue = 0;
  let maxValue = 20;
  let crestValue = minValue;
  const radialCanvas = document.getElementById("radialSlider");
  let ctx = radialCanvas ? radialCanvas.getContext("2d") : null;
  const centerX = radialCanvas ? radialCanvas.width / 2 : 0;
  const centerY = radialCanvas ? radialCanvas.height / 2 : 0;
  const radius = 100;
  const lineWidth = 20;
  const LAST_ACTIVE_TAB_KEY = 'drawTrackerLastActiveTab';
  if (!currentUser) {
      $("#welcome-screen").removeClass("d-none");
      $("#main-app").addClass("d-none");
  } else {
      initUser(currentUser);
      $("#welcome-screen").addClass("d-none");
      $("#main-app").removeClass("d-none");
  }

  //===================== USER SELECTION =====================

// Inside $(document).ready()
    $(".choose-user").click(function() {
        currentUser = $(this).data("user");
        localStorage.setItem("currentUser", currentUser);

        $("#welcome-screen").fadeOut(300, function() {
            $(this).addClass("d-none");
            // Call initUser AFTER welcome screen is hidden
            // initUser will now handle fetching data and deciding the next screen
            initUser(currentUser);
        });
        // DO NOT show main-app here anymore
    });

//===================== INIT USER =====================
function initUser(user) {
    // --- User setup ---
    currentUser = user; // Ensure currentUser is set correctly at the start
    $("body")
        .removeClass("mitko aylin")
        .addClass(user.toLowerCase());
    let charImg = (user === "Mitko") ? "assets/fredrinn.png" : "assets/lylia.png";
    $("#settings-current-user-img").attr("src", charImg);
    $("#navbar-current-user-img").attr("src", charImg);
    if ($("#character-image").length) { $("#character-image").attr("src", charImg); }

    // --- Define User-Specific Keys ---
    const userSessionModeKey = `drawTrackerSessionMode_${currentUser}`;
    const userSessionEntriesKey = `drawTrackerSessionEntries_${currentUser}`;
    const user10xActiveKey = `drawTracker10xModeActive_${currentUser}`;
    const user10xCounterKey = `drawTracker10xCounter_${currentUser}`;
    const user10xCostKey = `drawTracker10xCost_${currentUser}`;
    const user10xTimestampKey = `drawTracker10xTimestamp_${currentUser}`;
    const user10xBatchIdKey = `drawTracker10xBatchId_${currentUser}`;
    const LAST_ACTIVE_TAB_KEY = 'drawTrackerLastActiveTab'; // Make sure this key is defined if not already global

    // --- Load and Restore General Session State ---
    try {
        const savedSessionMode = localStorage.getItem(userSessionModeKey) === 'true';
        const savedSessionEntries = JSON.parse(localStorage.getItem(userSessionEntriesKey) || '[]');
        if (savedSessionMode && Array.isArray(savedSessionEntries)) {
            console.log(`Restoring previous session state for ${currentUser}...`);
            inSessionMode = true;
            sessionEntries = savedSessionEntries;
            $("#toggle-session-mode").addClass('active').html('<i class="fa-solid fa-circle-stop"></i> End Session Entry');
            $("#session-entries-container").removeClass("d-none");
            renderSessionList();
        } else {
            console.log(`No active session found for ${currentUser}.`);
            inSessionMode = false; sessionEntries = [];
            localStorage.removeItem(userSessionModeKey); localStorage.removeItem(userSessionEntriesKey);
            $("#toggle-session-mode").removeClass('active').html('<i class="fa-solid fa-bolt"></i> Start Session Entry');
            $("#session-entries-container").addClass("d-none"); renderSessionList();
        }
    } catch (e) {
        console.error(`Error loading session state for ${currentUser} from localStorage:`, e);
        inSessionMode = false; sessionEntries = [];
        localStorage.removeItem(userSessionModeKey); localStorage.removeItem(userSessionEntriesKey);
        $("#toggle-session-mode").removeClass('active').html('<i class="fa-solid fa-bolt"></i> Start Session Entry');
        $("#session-entries-container").addClass("d-none"); renderSessionList();
    }

    // --- Load and Restore 10x Draw State (if active) ---
    try {
        if (localStorage.getItem(user10xActiveKey) === 'true') {
            console.log(`Restoring active 10x draw state for ${currentUser}...`);
            inTenDrawMode = true;
            tenDrawCounter = parseInt(localStorage.getItem(user10xCounterKey) || '0');
            tenDrawDiamondCost = parseInt(localStorage.getItem(user10xCostKey) || '0');
            tenDrawTimestamp = parseInt(localStorage.getItem(user10xTimestampKey) || Date.now());
            tenDrawBatchId = localStorage.getItem(user10xBatchIdKey) || `10x-${tenDrawTimestamp}`;

            // Update UI to reflect restored 10x state
            $("#selected-draw-label").text(`Enter Result ${tenDrawCounter + 1} / 10 for ${tenDrawDiamondCost}💎 Draw`);
            $("#draw-type-icon").attr("src", "assets/diamond.png");
            $('.draw-option').removeClass('active');
            $(`.draw-option[data-diamond="${tenDrawDiamondCost}"]`).addClass('active');
            $("#preset-buttons-container").removeClass("d-none");
            $("#slider-container").addClass("d-none");
             // Ensure Extended Mode switch is NOT disabled on restore
            $("#extendedMode").prop("checked", false);
            $("#submit-draw").prop("disabled", true); // Submit initially disabled

        } else {
            inTenDrawMode = false; tenDrawCounter = 0; tenDrawDiamondCost = 0;
            tenDrawTimestamp = null; tenDrawBatchId = null;
        }
    } catch(e) {
        console.error(`Error loading 10x state for ${currentUser} from localStorage:`, e);
        inTenDrawMode = false; // Reset on error
        localStorage.removeItem(user10xActiveKey); localStorage.removeItem(user10xCounterKey);
        localStorage.removeItem(user10xCostKey); localStorage.removeItem(user10xTimestampKey);
        localStorage.removeItem(user10xBatchIdKey);
    }

    // --- DETERMINE AND SET INITIAL ACTIVE TAB ---
    let initialTabId = localStorage.getItem(LAST_ACTIVE_TAB_KEY);
    const validTabIds = ['home', 'history', 'stats', 'compare', 'settings'];
    const defaultTabId = 'home';
    if (!initialTabId || !validTabIds.includes(initialTabId)) {
        initialTabId = defaultTabId;
    }
    console.log(`Restoring last active tab: ${initialTabId}`);
    $(".tab-content").addClass("d-none");
    $("#tab-" + initialTabId).removeClass("d-none"); // Show the correct tab content
    $("#sidebar .nav-link").removeClass('active');
    $(`#sidebar .nav-link[data-tab='${initialTabId}']`).addClass('active'); // Highlight the correct sidebar link

    // --- Reset draw input state ONLY IF NOT in restored 10x mode ---
     // Also find minValue definition, assuming it's 0 globally or defined earlier
     // Let's assume minValue = 0 for this context
     const minValue = 0; // Add this if minValue is not defined globally
    if (!inTenDrawMode) {
         console.log("Resetting draw input area (not in 10x mode)");
         // Ensure ctx is defined (radial slider context)
         const radialCanvas = document.getElementById("radialSlider");
         let ctx = radialCanvas ? radialCanvas.getContext("2d") : null;
         if (ctx) { drawRing(minValue); } // Assuming drawRing function exists
         maxValue = 20; crestValue = minValue; // Assuming maxValue/crestValue are global or defined earlier
         $("#crestValue").text(crestValue);
         $("#extendedMode").prop("disabled", false).prop("checked", false);
         // Check if trigger('change') is necessary, might depend on your change handler
         // $("#extendedMode").trigger('change'); // If needed to update UI based on check state
         $("#slider-container").addClass("d-none");
         $("#preset-buttons-container").removeClass("d-none");
         $(".preset-crest-btn").removeClass('active');
         currentDiamond = null; // Assuming currentDiamond is global or defined earlier
         $(".draw-option").removeClass('active');
         $("#selected-draw-label").text("");
         $("#draw-type-icon").attr("src", "assets/other_draw.png");
         $("#submit-draw").prop("disabled", false); // Enable submit for normal mode
    }


    // --- Fetch remote data THEN decide which screen to show ---
    fetchRemoteData(() => {
        // This code runs AFTER data is fetched and localData is populated

        const todayStr = getTodayDateString();
        const hideUntilDate = localStorage.getItem('hideDailySummaryUntil');

        // Check if the summary should be skipped for today
        if (hideUntilDate === todayStr) {
            console.log("Daily summary hidden for today.");
            // Hide loader if it's still visible
            $("#loader").addClass("d-none");
            $("#main-app").hide().removeClass("d-none").fadeIn(300); // Show main app directly
        } else {
            // Calculate today's draws AND discount info using the CORRECT function
            const todaysInfo = calculateTodaysDrawsAndDiscount(localData);

            // Update TOTAL counts
            $("#mitko-today-count").text(todaysInfo.mitkoTotal);
            $("#aylin-today-count").text(todaysInfo.aylinTotal);

            // Update Mitko's DAILY DISCOUNT info
            const mitkoDiscountEl = $("#mitko-daily-discount");
            if (todaysInfo.mitkoDiscountCrests !== null) {
                mitkoDiscountEl.html(`Daily 25💎: <span class="fw-bold">${todaysInfo.mitkoDiscountCrests}</span> <img src="assets/token.png" class="small-icon" alt="token">`);
                mitkoDiscountEl.removeClass('text-muted').addClass('text-dark'); // Make text darker if done
            } else {
                mitkoDiscountEl.html('Daily 25💎: <span class="fw-normal">Not done</span>');
                mitkoDiscountEl.removeClass('text-dark').addClass('text-muted'); // Keep muted if not done
            }

            // Update Aylin's DAILY DISCOUNT info
            const aylinDiscountEl = $("#aylin-daily-discount");
            if (todaysInfo.aylinDiscountCrests !== null) {
                 aylinDiscountEl.html(`Daily 25💎: <span class="fw-bold">${todaysInfo.aylinDiscountCrests}</span> <img src="assets/token.png" class="small-icon" alt="token">`);
                 aylinDiscountEl.removeClass('text-muted').addClass('text-dark');
            } else {
                 aylinDiscountEl.html('Daily 25💎: <span class="fw-normal">Not done</span>');
                 aylinDiscountEl.removeClass('text-dark').addClass('text-muted');
            }

            // Hide loader before showing summary
            $("#loader").addClass("d-none");
             // Show the summary screen (fade it in)
            console.log("Showing daily summary screen.");
            $("#daily-summary-screen").hide().removeClass("d-none").fadeIn(300);

            // IMPORTANT: Do NOT show the main-app yet.
        }

        // Update the data for the hidden tabs (History, Stats, Compare)
        // These functions should be safe to call now that localData is populated
        updateHistory();
        updateStats();
        updateCompare();

    }); // End of fetchRemoteData callback
}

  //===================== FETCH REMOTE DATA =====================

  function fetchRemoteData(callback) {
    $("#loader").removeClass("d-none");

    $.ajax({
        url: url_tracker,
        method: "GET",
        dataType: "jsonp",
        jsonpCallback: "callback", // Ensure this matches default/Apps Script doGet
        timeout: 15000,
        success: function(data) {
            localData = { Mitko: [], Aylin: [] };
            let parseErrors = 0;

            (data || []).forEach(entry => {
                // Basic validation of essential fields
                if (entry && entry.User && localData[entry.User] !== undefined && entry.Timestamp) {
                     // Use original timestamp if present, otherwise try parsing again
                    let timestampMs = Date.parse(entry.Timestamp); // Try parsing standard format
                    if (isNaN(timestampMs)) {
                         // If parsing fails, maybe it's already a ms timestamp? (Less likely from Sheets)
                         timestampMs = Number(entry.Timestamp); // Try converting directly
                         if (isNaN(timestampMs)) {
                              console.warn("Invalid timestamp format for entry:", entry);
                              parseErrors++;
                              return; // Skip entry if timestamp is unusable
                         }
                    }

                     const parsed = {
                         id: entry.Entry_Id ? Number(String(entry.Entry_Id).trim()) : null,
                         diamond: parseInt(entry.Diamonds) || 0, // Default to 0 if NaN
                         crests: parseInt(entry.Crests) || 0,    // Default to 0 if NaN
                         date: entry.Date, // Keep original Date if present
                         timestamp: timestampMs,
                         user: entry.User,
                         batchId: entry.Batch_Id || entry.batchId || null // Check common variations, default null
                     };

                    localData[entry.User].push(parsed);
                } else {
                    if (!entry || !entry.User) console.warn("Skipping entry with missing User:", entry);
                    else if (localData[entry.User] === undefined) console.warn("Skipping entry for unknown user:", entry);
                    else if (!entry.Timestamp) console.warn("Skipping entry with missing Timestamp:", entry);
                     parseErrors++;
                }
            });

            localData.Mitko.sort((a, b) => b.timestamp - a.timestamp);
            localData.Aylin.sort((a, b) => b.timestamp - a.timestamp);

            if (parseErrors > 0) { console.warn(`Data parsing errors: ${parseErrors}`); }
            $("#loader").addClass("d-none");
            if (callback) { callback(); }
        },
        error: function(jqXHR, textStatus, errorThrown) { /* ... error handling ... */ }
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

    localStorage.setItem(LAST_ACTIVE_TAB_KEY, tabId);

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
    if (inTenDrawMode) {
        alert("Please finish entering the 10 results for the current draw or cancel.");
        return;
    }
    // Define user-specific keys
    const user10xActiveKey = `drawTracker10xModeActive_${currentUser}`;
    const user10xCounterKey = `drawTracker10xCounter_${currentUser}`;
    const user10xCostKey = `drawTracker10xCost_${currentUser}`;
    const user10xTimestampKey = `drawTracker10xTimestamp_${currentUser}`;
    const user10xBatchIdKey = `drawTracker10xBatchId_${currentUser}`;

    $(".draw-option").removeClass('active');
    $(".preset-crest-btn").removeClass('active');
    crestValue = minValue; $("#crestValue").text(crestValue);
    $("#extendedMode").prop("checked", false).trigger('change');
    $("#submit-draw").prop("disabled", true); 

    const diamond = parseInt($(this).data("diamond"));
    const isTenDraw = diamond === 450 || diamond === 500;
    $(this).addClass('active');

    if (isTenDraw) {
        // === ENTERING 10x DRAW MODE ===
        inTenDrawMode = true;
        tenDrawCounter = 0;
        tenDrawDiamondCost = diamond;
        tenDrawTimestamp = Date.now();
        tenDrawBatchId = `10x-${tenDrawTimestamp}`;
        currentDiamond = diamond;

        // --- Save 10x state to localStorage ---
        try {
            localStorage.setItem(user10xActiveKey, 'true');
            localStorage.setItem(user10xCounterKey, tenDrawCounter);
            localStorage.setItem(user10xCostKey, tenDrawDiamondCost);
            localStorage.setItem(user10xTimestampKey, tenDrawTimestamp);
            localStorage.setItem(user10xBatchIdKey, tenDrawBatchId);
        } catch (e) {
             console.error("Error saving 10x state to localStorage:", e);
             alert("Warning: Could not save 10x state.");
        }
        // ------------------------------------

        // Update UI
        $("#selected-draw-label").text(`Enter Result 1 / 10 for ${diamond}💎 Draw`);
        $("#draw-type-icon").attr("src", "assets/diamond.png");
        $("#preset-buttons-container").removeClass("d-none");
        $("#slider-container").addClass("d-none");
        $("#extendedMode").prop("disabled", false).prop("checked", false).trigger('change');
        $("#submit-draw").prop("disabled", true);

    } else {
        // === NORMAL DRAW TYPE SELECTED ===
        inTenDrawMode = false; // Ensure flag is false
        currentDiamond = diamond;
        const label = (diamond === 0) ? "Free Draw" : diamond + " Diamonds";
        $("#selected-draw-label").text(label);
        $("#draw-type-icon").attr("src", diamond === 0 ? "assets/mystical_dial.png" : "assets/diamond.png");
        $("#extendedMode").prop("disabled", false);
        $("#submit-draw").prop("disabled", false);
        // --- Clear any stray 10x state from storage ---
        localStorage.removeItem(user10xActiveKey); localStorage.removeItem(user10xCounterKey);
        localStorage.removeItem(user10xCostKey); localStorage.removeItem(user10xTimestampKey);
        localStorage.removeItem(user10xBatchIdKey);
        // ---------------------------------------------
    }
});

//===================== SESSION MODE TOGGLE =====================
$("#toggle-session-mode").click(function() {
    // --- Define User-Specific Keys inside the handler ---
    // Ensure currentUser is reliably available here. It should be, as it's set globally after user selection.
    if (!currentUser) {
         alert("Error: No user selected. Please refresh.");
         return; // Prevent action if currentUser is missing
     }
    const userSessionModeKey = `drawTrackerSessionMode_${currentUser}`;
    const userSessionEntriesKey = `drawTrackerSessionEntries_${currentUser}`;
    // ----------------------------------------------------

    inSessionMode = !inSessionMode; // Toggle the state
    // --- Use the USER-SPECIFIC key ---
    localStorage.setItem(userSessionModeKey, inSessionMode); // Save the new state for this user

    if (inSessionMode) {
        // --- Entering Session Mode ---
        $(this).addClass('active').html('<i class="fa-solid fa-circle-stop"></i> End Session Entry');
        $("#session-entries-container").removeClass("d-none");
        // Load entries fresh from USER-SPECIFIC storage
        try {
            // --- Use the USER-SPECIFIC key ---
            const storedEntries = JSON.parse(localStorage.getItem(userSessionEntriesKey) || '[]');
            sessionEntries = Array.isArray(storedEntries) ? storedEntries : [];
        } catch (e) {
            console.error("Error reading session entries on toggle:", e);
            sessionEntries = []; // Reset if error
        }
        renderSessionList();
        document.getElementById('session-entries-container')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    } else {
        // --- Ending Session Mode ---
        $(this).removeClass('active').html('<i class="fa-solid fa-bolt"></i> Start Session Entry');
        $("#session-entries-container").addClass("d-none");

        if (sessionEntries.length > 0) {
            if (confirm(`You have ${sessionEntries.length} unsynced draws in this session. Sync them now before ending?`)) {
                $("#sync-session-entries").click();
            }
        }

        // Clear session state from memory and USER-SPECIFIC localStorage
        sessionEntries = [];
        // --- Use the USER-SPECIFIC keys ---
        localStorage.removeItem(userSessionEntriesKey);
        localStorage.removeItem(userSessionModeKey);
        renderSessionList(); // Update UI
    }
});

//===================== EXTENDED MODE =====================
$("#extendedMode").change(function() {
    const isChecked = $(this).is(":checked");

    if (isChecked) { // Extended Mode ON
        maxValue = 300;
        $("#preset-buttons-container").addClass("d-none");
        $("#slider-container").removeClass("d-none");
         // If we are in 10x mode, enable Confirm button for slider input
         if (inTenDrawMode) {
              $("#submit-draw").prop("disabled", false); // <<< Enables Confirm
         }
        // Reset slider value only if NOT in 10x mode (keep current progress otherwise)
         if (!inTenDrawMode) {
             crestValue = minValue;
             $("#crestValue").text(crestValue);
             $(".preset-crest-btn").removeClass('active');
             if (ctx) { drawRing(crestValue); }
         } else {
              // If in 10x mode, just draw the ring without resetting value
              if (ctx) { drawRing(crestValue); } // Reflect current (potentially preset-clicked) value initially
         }

    } else { // Extended Mode OFF
        maxValue = 20;
        $("#preset-buttons-container").removeClass("d-none");
        $("#slider-container").addClass("d-none");
         // If we are in 10x mode, disable Confirm button again (input via presets)
         if (inTenDrawMode) {
             $("#submit-draw").prop("disabled", true); // <<< Disables Confirm
         }
        // Reset preset button selection
         $(".preset-crest-btn").removeClass('active');
    }
});

//===================== PRESET CREST BUTTONS =====================
$(document).on("click", ".preset-crest-btn", function() {
    const selectedCrestValue = parseInt($(this).data("value"));
    // Define user-specific keys (needed for both saving counter and clearing state)
    const userSessionEntriesKey = `drawTrackerSessionEntries_${currentUser}`;
    const user10xActiveKey = `drawTracker10xModeActive_${currentUser}`;
    const user10xCounterKey = `drawTracker10xCounter_${currentUser}`;
    const user10xCostKey = `drawTracker10xCost_${currentUser}`;
    const user10xTimestampKey = `drawTracker10xTimestamp_${currentUser}`;
    const user10xBatchIdKey = `drawTracker10xBatchId_${currentUser}`;

    if (inTenDrawMode) {
        // === PROCESSING CLICK IN 10x MODE ===
        tenDrawCounter++;
        crestValue = selectedCrestValue;

        let entry = {
            tempId: `session-${tenDrawTimestamp}-${tenDrawCounter}`,
            diamond: tenDrawDiamondCost, crests: crestValue,
            timestamp: tenDrawTimestamp, batchId: tenDrawBatchId,
            User: currentUser, synced: false
        };
        console.log(`Adding 10x result ${tenDrawCounter}/10 (Entry Object):`, entry);

        sessionEntries.push(entry);
        try { // Save session entries list
            localStorage.setItem(userSessionEntriesKey, JSON.stringify(sessionEntries));
        } catch (e) { /* Handle error */ }

        renderSessionList();

        // Update the status label AND 10x counter in storage
        if (tenDrawCounter < 10) {
            $("#selected-draw-label").text(`Enter Result ${tenDrawCounter + 1} / 10 for ${tenDrawDiamondCost}💎 Draw`);
            // --- Update counter in localStorage ---
            try { localStorage.setItem(user10xCounterKey, tenDrawCounter); } catch(e) {}
            // ----------------------------------
            $(this).addClass('active-flash');
            setTimeout(() => $(this).removeClass('active-flash'), 200);
        } else {
            // === FINISHED 10x DRAW ===
            alert(`Finished entering 10 results for ${tenDrawDiamondCost}💎 draw.`);
            inTenDrawMode = false; // Reset flag *first*
            tenDrawCounter = 0;   // Reset counter *after* using it for last tempId

            // --- Clear 10x state from localStorage ---
            localStorage.removeItem(user10xActiveKey); localStorage.removeItem(user10xCounterKey);
            localStorage.removeItem(user10xCostKey); localStorage.removeItem(user10xTimestampKey);
            localStorage.removeItem(user10xBatchIdKey);
            // -----------------------------------------

            // Reset UI
            $(".draw-option").removeClass('active'); $(".preset-crest-btn").removeClass('active');
            currentDiamond = null; crestValue = minValue;
            $("#crestValue").text(crestValue); $("#selected-draw-label").text("");
            $("#draw-type-icon").attr("src", "assets/other_draw.png");
            $("#extendedMode").prop("disabled", false).prop("checked", false).trigger('change');
            $("#submit-draw").prop("disabled", false);
            // Clear 10x state vars from memory
            tenDrawDiamondCost = 0; tenDrawTimestamp = null; tenDrawBatchId = null;
        }
    } else { /* ... Normal mode click logic ... */
        if (currentDiamond === null) { alert("Please select a draw type first."); return; }
        $(".preset-crest-btn").removeClass('active'); $(this).addClass('active');
        crestValue = selectedCrestValue; $("#crestValue").text(crestValue);
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
    // Prepare data, including batchId if it exists
    let dataToSend = {
        action: "add",
        diamond: entry.diamond,
        crests: entry.crests,
        timestamp: entry.timestamp, // Pass the original timestamp
        User: entry.User,
        batchId: entry.batchId || "" // Send batchId if present, otherwise empty string
    };

    return $.ajax({
        url: url_tracker,
        method: "POST",
        data: dataToSend,
        timeout: 20000
    });
}

$("#submit-draw").click(function() {
    // --- ADD THIS CHECK: Prevent submit during 10x mode ---
    if (inTenDrawMode && !$("#extendedMode").is(":checked")) { // <<< Allow if Extended Mode is ON
        alert("Please finish clicking the 10 results for the 10x draw first, or Cancel.");
        return; // Don't submit normally during 10x mode *unless* Extended Mode is active
    }
    // --------------------------------------------------------

    // Check if draw type is selected (for normal/single entry)
    if (currentDiamond === null) {
        alert("Select draw type first.");
        return;
    }

    // Check if a crest value is selected (either via preset or slider)
    // Add check to ensure crestValue isn't still the minValue if using presets/slider
    let isCrestSelected = $(".preset-crest-btn.active").length > 0 || $("#extendedMode").is(":checked"); // Basic check
    // More robust check: ensure a preset is active OR extended mode is on (value is handled by crestValue variable)
    if (!isCrestSelected) {
         alert("Please select the number of crests received using the preset buttons or Extended Mode.");
         return;
     }
     // Optional stricter check: prevent submitting 0 in non-extended mode unless it's the Prize Pool button
     if (!$("#extendedMode").is(":checked") && crestValue === 0 && !$(".preset-crest-btn[data-value='0']").hasClass('active')) {
          if (!confirm("Record 0 crests without selecting Prize Pool?")) {
                return;
          }
     }
     if (inTenDrawMode && $("#extendedMode").is(":checked")) {
        // === HANDLE 10x SUBMISSION VIA EXTENDED MODE (SLIDER) ===
        const userSessionEntriesKey = `drawTrackerSessionEntries_${currentUser}`;
        const user10xActiveKey = `drawTracker10xModeActive_${currentUser}`;
        const user10xCounterKey = `drawTracker10xCounter_${currentUser}`;
        const user10xCostKey = `drawTracker10xCost_${currentUser}`;
        const user10xTimestampKey = `drawTracker10xTimestamp_${currentUser}`;
        const user10xBatchIdKey = `drawTracker10xBatchId_${currentUser}`;
    
        tenDrawCounter++;
        // crestValue is already set by the radial slider interaction
    
        let entry = {
            tempId: `session-${tenDrawTimestamp}-${tenDrawCounter}`,
            diamond: tenDrawDiamondCost,
            crests: crestValue, // Use the slider value
            timestamp: tenDrawTimestamp,
            batchId: tenDrawBatchId,
            User: currentUser,
            synced: false
        };

        console.log(`Adding 10x result ${tenDrawCounter}/10 via Extended Mode (Entry Object):`, entry);
    
        sessionEntries.push(entry);
        try { // Save session entries list
            localStorage.setItem(userSessionEntriesKey, JSON.stringify(sessionEntries));
        } catch (e) { console.error("Error saving session entry to localStorage:", e); }
    
        renderSessionList();
    
        // Update the status label AND 10x counter in storage
        if (tenDrawCounter < 10) {
            $("#selected-draw-label").text(`Enter Result ${tenDrawCounter + 1} / 10 for ${tenDrawDiamondCost}💎 Draw`);
            // Update counter in localStorage
            try { localStorage.setItem(user10xCounterKey, tenDrawCounter); } catch(e) {}
            // --- Important: Do NOT reset the slider value here ---
            // Reset preset button selection in case user clicked one before switching
            $(".preset-crest-btn").removeClass('active');
    
        } else {
            // === FINISHED 10x DRAW (via Extended Mode Submit) ===
            alert(`Finished entering 10 results for ${tenDrawDiamondCost}💎 draw.`);
            inTenDrawMode = false;
            tenDrawCounter = 0;
    
            // Clear 10x state from localStorage
            localStorage.removeItem(user10xActiveKey); localStorage.removeItem(user10xCounterKey);
            localStorage.removeItem(user10xCostKey); localStorage.removeItem(user10xTimestampKey);
            localStorage.removeItem(user10xBatchIdKey);
    
            // Reset UI fully
            $(".draw-option").removeClass('active'); $(".preset-crest-btn").removeClass('active');
            currentDiamond = null; crestValue = minValue; // Reset crestValue now
            $("#crestValue").text(crestValue); $("#selected-draw-label").text("");
            $("#draw-type-icon").attr("src", "assets/other_draw.png");
            // Ensure extended mode is off and slider is hidden after finishing
            $("#extendedMode").prop("disabled", false).prop("checked", false).trigger('change');
            $("#submit-draw").prop("disabled", false);
            if (ctx) { drawRing(minValue); } // Reset slider visual
    
            // Clear 10x state vars from memory
            tenDrawDiamondCost = 0; tenDrawTimestamp = null; tenDrawBatchId = null;
        }
    
        return; // <<< IMPORTANT: Stop further execution in this click handler
    }

    // --- Create the entry object (for normal mode or session mode AFTER 10x) ---
     // This section now ONLY runs for single draw entries (not the 10x clicks)
    let entryData = {
         diamond: currentDiamond,
         crests: crestValue,
         timestamp: Date.now(),
         User: currentUser
    };

    if (inSessionMode) {
        // === SESSION MODE LOGIC (for single entries) ===
        const userSessionEntriesKey = `drawTrackerSessionEntries_${currentUser}`; // User-specific key
    
        let sessionEntry = {
             ...entryData,
             tempId: 'session-' + entryData.timestamp,
             synced: false
        };
        console.log("Adding SINGLE entry to session:", sessionEntry);
        sessionEntries.push(sessionEntry);
    
        // Save to user-specific localStorage key
        try {
             localStorage.setItem(userSessionEntriesKey, JSON.stringify(sessionEntries));
        } catch (e) {
             console.error("Error saving session entry to localStorage:", e);
             alert("Warning: Could not save session data. Storage might be full.");
        }
        renderSessionList();
    
        // Perform partial reset...
         $("#extendedMode").prop("checked", false);
         maxValue = 20;
         $("#slider-container").addClass("d-none");
         $("#preset-buttons-container").removeClass("d-none");
         crestValue = minValue;
         $("#crestValue").text(minValue);
         $(".preset-crest-btn").removeClass('active');
         if (ctx) { drawRing(minValue); }
    
     } else {
        // === NORMAL MODE LOGIC (for single entries) ===
        let historyEntry = {
            ...entryData,
            id: 'local-' + entryData.timestamp, // Use 'local-' prefix for optimistic UI in history
            synced: false // Explicitly mark for history rendering logic
        };
        console.log("Submitting directly:", historyEntry);

        // 1. Optimistic UI Update
        localData[currentUser].unshift(historyEntry);
        updateHistory();
        updateStats();
        updateCompare();

        // 2. Show loader & Submit to Sheet
        $("#loader").removeClass("d-none");
        submitEntryToSheet(entryData) // Pass the core data
             .done(function(response) {
                 console.log("Entry submitted: ", response);
                 fetchRemoteData(() => {
                     updateHistory();
                     updateStats();
                     updateCompare();
                     $("#loader").addClass("d-none");
                 });
             })
             .fail(function(jqXHR, textStatus, errorThrown) {
                 console.error("Submit Error:", textStatus, errorThrown);
                 alert("Error submitting draw. Entry added locally but not synced.");
                 // Update the specific history entry to show a failure icon
                  const failedEntryElement = $(`#history-list .history-card[data-entry-id='${historyEntry.id}']`);
                  if(failedEntryElement.length > 0) {
                       failedEntryElement.find('.sync-indicator').html('<i class="fa-solid fa-triangle-exclamation text-danger" title="Sync Failed"></i>');
                  }
                  $("#loader").addClass("d-none");
             });

         // 3. Notification
         if ("Notification" in window && Notification.permission === "granted") {
             new Notification("Draw Recorded", {
                  body: `Gained ${entryData.crests} tokens!`, // Use entryData
                  icon: "assets/token.png"
              });
         }

         // 4. Perform partial reset (keep draw type, reset crests selection)
         $("#extendedMode").prop("checked", false); // Turn off extended mode
         maxValue = 20;
         $("#slider-container").addClass("d-none"); // Hide slider
         $("#preset-buttons-container").removeClass("d-none"); // Show presets
         crestValue = minValue; // Reset crest value variable
         $("#crestValue").text(minValue); // Reset display
         $(".preset-crest-btn").removeClass('active'); // Deactivate preset button
         if (ctx) { drawRing(minValue); }
          // Note: Draw type button remains active
    }
});

$("#cancel-draw").click(function() {
    // Define user-specific keys
    const user10xActiveKey = `drawTracker10xModeActive_${currentUser}`;
    const user10xCounterKey = `drawTracker10xCounter_${currentUser}`;
    const user10xCostKey = `drawTracker10xCost_${currentUser}`;
    const user10xTimestampKey = `drawTracker10xTimestamp_${currentUser}`;
    const user10xBatchIdKey = `drawTracker10xBatchId_${currentUser}`;

    if (inTenDrawMode) {
         if (confirm("Cancel entering the current 10x draw results?")) {
             inTenDrawMode = false;
             tenDrawCounter = 0;
             // --- Clear 10x state from localStorage ---
             localStorage.removeItem(user10xActiveKey); localStorage.removeItem(user10xCounterKey);
             localStorage.removeItem(user10xCostKey); localStorage.removeItem(user10xTimestampKey);
             localStorage.removeItem(user10xBatchIdKey);
             // -----------------------------------------
             // Reset UI fully
             $(".draw-option").removeClass('active'); $(".preset-crest-btn").removeClass('active');
             currentDiamond = null; crestValue = minValue;
             $("#crestValue").text(crestValue); $("#selected-draw-label").text("");
             $("#draw-type-icon").attr("src", "assets/other_draw.png");
             $("#extendedMode").prop("disabled", false).prop("checked", false).trigger('change');
             $("#submit-draw").prop("disabled", false);
              // Clear 10x vars from memory
              tenDrawDiamondCost = 0; tenDrawTimestamp = null; tenDrawBatchId = null;
         }
    } else { /* ... Normal cancel logic ... */
         if (confirm("Cancel current draw input?")) {
             currentDiamond = null; $("#selected-draw-label").text("");
             $("#extendedMode").prop("disabled", false).prop("checked", false).trigger('change');
             maxValue = 20; crestValue = minValue;
             $("#crestValue").text(minValue); $(".preset-crest-btn").removeClass('active');
             if (ctx) { drawRing(minValue); }
             $(".draw-option").removeClass('active');
         }
    }
});

//===================== SESSION ENTRY DELETE (HOLD) =====================
$(document).on('mousedown touchstart', '#session-entries-list .session-entry-card', function(e) {
    if (e.type === 'mousedown' && e.button !== 0) return;

    clearTimeout(holdTimer);
    $('#session-entries-list .session-entry-card').not(this).removeClass('show-delete');

    const $card = $(this);
    const tempId = $card.data('tempid');


    holdTimer = setTimeout(() => {
        $card.addClass('show-delete');
        // Console log below should now show the CORRECT tempId after fixing renderSessionList
        console.log('Hold detected on:', tempId);
    }, HOLD_DURATION);
});

// Clear timer if mouse leaves or touch ends/is cancelled before hold duration
$(document).on('mouseup mouseleave touchend touchcancel', '#session-entries-list .session-entry-card', function(e) {
    clearTimeout(holdTimer);
    
});

// Handle click on the actual delete button (X) inside the overlay
$(document).on('click', '.delete-session-entry-btn', function(e) {
    // e.preventDefault(); // Prevent default button action
    e.stopPropagation(); // Stop click from bubbling up to the card container

    const $card = $(this).closest('.session-entry-card');
    const tempIdToDelete = $card.data('tempid');

    console.log('Attempting to delete session entry:', tempIdToDelete);

    // Find index in the array based on tempId
    const indexToDelete = sessionEntries.findIndex(entry => entry.tempId === tempIdToDelete);

    if (indexToDelete > -1) {
        // Remove from array
        sessionEntries.splice(indexToDelete, 1);
        // Update localStorage
        localStorage.setItem(SESSION_ENTRIES_KEY, JSON.stringify(sessionEntries));
        // Re-render the list (this will remove the item visually)
        renderSessionList();
        console.log('Entry deleted, list updated.');
    } else {
        console.warn('Could not find session entry in array to delete with tempId:', tempIdToDelete);
         // As a fallback, just remove the visual element if data is inconsistent
         $card.remove();
         $("#session-count-badge").text(sessionEntries.length); // Ensure badge is updated
    }
});
// --- End Session Entry Delete ---

// Inside the SESSION ENTRY DELETE (HOLD) block...
$(document).on('mousedown touchstart', '#session-entries-list .session-entry-card', function(e) {
    if (e.type === 'mousedown' && e.button !== 0) return;

    clearTimeout(holdTimer);
    $('#session-entries-list .session-entry-card').not(this).removeClass('show-delete');

    const $card = $(this);
    const tempId = $card.data('tempid');

    // --- ADD/MODIFY THIS ---
    // Prevent default for both touch and mouse to potentially stop scroll/selection during hold detection
    e.preventDefault();
    // ----------------------

    holdTimer = setTimeout(() => {
        $card.addClass('show-delete');
        console.log('Hold detected on:', tempId); // Should log correct ID now
    }, HOLD_DURATION);

});

//===================== SYNC SESSION ENTRIES (Sequential) =====================
$("#sync-session-entries").click(async function() { // <<< Add async keyword here
    // Define user-specific key
    const userSessionEntriesKey = `drawTrackerSessionEntries_${currentUser}`;

    if (sessionEntries.length === 0) {
        console.log("No session entries to sync.");
        return;
    }

    const $syncButton = $(this);
    const $loader = $("#loader");
    // We'll work directly with the sessionEntries array and remove successful ones
    let entriesToProcess = [...sessionEntries]; // Copy for safety in loop if needed, though modifying sessionEntries directly is ok here
    let originalCount = sessionEntries.length;
    let successCount = 0;
    let firstError = null;

    $syncButton.prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i> Syncing...');
    $loader.removeClass("d-none");

    console.log(`Starting sequential sync for ${originalCount} entries...`);

    // Process entries one by one
    for (let i = 0; i < entriesToProcess.length; i++) {
        const entry = entriesToProcess[i];
        console.log(`Attempting to sync entry ${i + 1}/${originalCount}:`, entry);

        try {
            // Prepare data for this entry
            let dataToSend = {
                diamond: entry.diamond,
                crests: entry.crests,
                timestamp: entry.timestamp,
                User: entry.User,
                batchId: entry.batchId || "" // Send batchId if present
            };

            // Wait for the submission to complete
            const response = await submitEntryToSheet(dataToSend);

            // Check response from Apps Script (assuming it returns {result: 'success', ...})
            if (response && response.result === 'success') {
                console.log(`Entry ${entry.tempId} synced successfully:`, response);
                successCount++;
                // Remove the successfully synced entry from the *main* sessionEntries array
                const indexToRemove = sessionEntries.findIndex(item => item.tempId === entry.tempId);
                if (indexToRemove > -1) {
                    sessionEntries.splice(indexToRemove, 1);
                } else {
                     console.warn("Synced item not found in sessionEntries array?", entry.tempId); // Should not happen
                }
                // Update localStorage immediately after successful sync
                localStorage.setItem(userSessionEntriesKey, JSON.stringify(sessionEntries));
                // Update the UI list immediately (optional, or wait until the end)
                 renderSessionList(); // Re-render to remove the synced item

            } else {
                // If Apps Script indicates failure even though AJAX didn't fail
                console.error(`Sync failed for entry ${entry.tempId} (Apps Script Error):`, response);
                firstError = response || { message: "Unknown script error" };
                // Mark UI element as failed
                 $(`#session-entries-list .session-entry-card[data-tempid="${entry.tempId}"] .sync-status-icon`)
                         .html('<i class="fa-solid fa-triangle-exclamation text-danger" title="Sync Failed - Script Error"></i>');
                break; // Stop syncing on first script error
            }

        } catch (error) {
            // Catch AJAX errors (network, timeout, script execution error like 5xx)
            console.error(`Sync failed for entry ${entry.tempId} (AJAX/Network Error), stopping sync process:`, error);
            firstError = error;
             // Mark UI element as failed
             $(`#session-entries-list .session-entry-card[data-tempid="${entry.tempId}"] .sync-status-icon`)
                     .html('<i class="fa-solid fa-triangle-exclamation text-danger" title="Sync Failed - Network/Script Error"></i>');
            break; // Stop syncing on first AJAX/network error
        }
    } // End loop

    // --- Sync process finished (either completed or stopped on error) ---

    console.log(`Sync finished. ${successCount} successful, ${sessionEntries.length} remaining.`);

    // Update localStorage one last time (contains only remaining/failed entries)
     try {
       localStorage.setItem(userSessionEntriesKey, JSON.stringify(sessionEntries));
     } catch(e){ console.error("Final save to localStorage failed:", e); }

    // Re-render the list one last time to be sure
    renderSessionList();

    // Fetch remote data IF at least one entry was successfully synced
    if (successCount > 0) {
        fetchRemoteData(() => {
            updateHistory();
            updateStats();
            updateCompare();
            $loader.addClass("d-none");
            $syncButton.prop('disabled', false).html(`<i class="fa-solid fa-cloud-arrow-up"></i> Sync <span id="session-count-badge" class="badge bg-light text-dark ms-1">${sessionEntries.length}</span>`);

            if (sessionEntries.length === 0) { // Check if all done *after* potential failures
                console.log("All originally pending session entries synced successfully.");
                localStorage.removeItem(userSessionEntriesKey); // Clear storage key
            } else if(firstError) {
                 alert(`Sync stopped due to an error after ${successCount} successful entries. ${sessionEntries.length} entries remain unsynced.`);
            }
        });
    } else {
        // No successes, just hide loader and reset button
        if(firstError){
             alert(`Sync failed on the first entry. ${sessionEntries.length} entries remain unsynced. Please check console.`);
        } else {
             // This case should ideally not happen if the initial length check works
             console.log("Sync process finished with no successes and no errors?");
        }
        $loader.addClass("d-none");
        $syncButton.prop('disabled', false).html(`<i class="fa-solid fa-cloud-arrow-up"></i> Sync <span id="session-count-badge" class="badge bg-light text-dark ms-1">${sessionEntries.length}</span>`);
    }
}); // End sync button click handler
//===================== RENDER SESSION LIST =====================
function renderSessionList() {
    let sessionList = $("#session-entries-list");
    sessionList.empty(); // Clear current list

    // Update badge count first
    $("#session-count-badge").text(sessionEntries.length);

    if (sessionEntries.length === 0) {
        sessionList.html('<p class="text-light text-center small mt-2 mb-0">No draws added in this session yet.</p>');
        // If list is empty, ensure multi-select mode (if you were using it) is cancelled
        // This part might be irrelevant now if you reverted the multi-select feature
        // if(multiSelectModeActive) $("#cancel-session-selection").click();
    } else {
        // Display newest first
        let reversedSessionEntries = [...sessionEntries].reverse();

        reversedSessionEntries.forEach(entry => {
            // Ensure tempId is treated as a string for the attribute
            const tempIdValue = String(entry.tempId || '');

            let diamondDisplayHtml = (entry.diamond === 0) ?
                `<img src="assets/mystical_dial.png" class="small-icon me-1" alt="Free Draw"> Free` :
                `${entry.diamond} <img class='small-icon mx-1' src='assets/diamond.png' alt='Diamond'>`;

            let crestDisplayHtml = `${entry.crests} <img src="assets/token.png" class="small-icon ms-1" alt="token">`;
            if (entry.crests === 0 && entry.diamond > 0) { // Prize Pool Item display
                 crestDisplayHtml = `<img src="assets/prize_pool_item.png" class="small-icon ms-1" alt="Prize Pool Item"> Item`;
             }

            let syncIconHtml = entry.synced ?
                 '<span class="sync-status-icon" title="Synced"><i class="fa-solid fa-check text-success"></i></span>' :
                 '<span class="sync-status-icon" title="Pending Sync"><i class="fa-solid fa-clock text-warning"></i></span>';

            // --- Check if it's part of a 10x batch and extract counter ---
            let batchCounterHtml = ''; // Default to empty string
            if (entry.batchId && entry.batchId.startsWith('10x-')) {
                const parts = tempIdValue.split('-'); // Split tempId like "session-TIMESTAMP-COUNTER"
                if (parts.length >= 3) { // Check if format seems correct
                    const counter = parts[parts.length - 1]; // Get the last part (the counter)
                    // Create the HTML for the counter (use text-white-50 for visibility)
                    batchCounterHtml = `<span class="batch-counter small text-white-50 ms-2">(${counter}/10)</span>`;
                }
            }
            // --- End batch counter logic ---

            // Construct list item HTML (including the delete overlay from hold-to-delete)
            let listItem = `
                <div class="list-group-item session-entry-card" data-tempid="${tempIdValue}">
                    <div class="delete-overlay">
                         <button class="btn btn-danger btn-sm delete-session-entry-btn p-0" style="width: 25px; height: 25px; line-height: 1; border-radius: 50%;" title="Delete this entry">
                              <i class="fa-solid fa-times"></i>
                         </button>
                    </div>
                    <div class="session-content d-flex justify-content-between align-items-center">
                        <span class="entry-details d-flex align-items-center flex-grow-1">
                            ${diamondDisplayHtml}
                            <i class="fa-solid fa-arrow-right text-muted mx-2"></i>
                            ${crestDisplayHtml}
                            ${batchCounterHtml}  </span>
                        ${syncIconHtml}
                    </div>
                </div>`;

            sessionList.append(listItem);
        });
    }
    // Badge count already updated at the top
}
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

        // --- Determine Sync Status and Buttons ---
        let isLocal = entryId && String(entryId).startsWith('local-'); // Check for 'local-' prefix
        let canEditDelete = entryId && !isLocal; // Can only edit/delete non-local (synced) entries

        let syncIconHtml = '';
        if (isLocal) {
            // If ID starts with 'local-', it's syncing (added optimistically in Normal Mode)
            syncIconHtml = '<span class="sync-indicator text-muted small ms-2" title="Syncing..."><i class="fas fa-sync fa-spin"></i></span>';
        } else if (entryId) {
             // If it has an ID and it's not local, it's synced (from sheet)
             syncIconHtml = '<span class="sync-indicator text-success small ms-2" title="Synced"><i class="fa-solid fa-check"></i></span>';
             // You can uncomment the next line and comment the one above if you prefer NO icon for synced items
             // syncIconHtml = '';
        }
        // Note: Entries added in Session Mode *don't* appear here until they are synced and fetched.

        let editDeleteButtons = canEditDelete ?
             `<button class="btn btn-sm btn-outline-danger delete-entry" data-id="${entryId}"><i class="fa fa-trash"></i></button>` +
             `<button class="btn btn-sm btn-outline-primary edit-entry ms-2" data-id="${entryId}"><i class="fa fa-edit"></i></button>` :
             ''; // No edit/delete for local entries
        // --- End Determine Sync Status ---


        // --- Construct List Item HTML ---
        let listItem = `
            <div class="history-card mb-3" ${entryIdAttr}>
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <div class="history-date">${drawDate} ${drawTime}</div>
                        <div class="history-details">
                            ${diamondText} → ${entry.crests} <img src="assets/token.png" class="small-icon ms-1" alt="token">
                        </div>
                    </div>
                    <div class="d-flex align-items-center"> ${editDeleteButtons}
                        ${syncIconHtml}   </div>
                </div>
            </div>`;

        historyList.append(listItem);
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

//===================== METRICS CALCULATION (Client-Side Heuristic) =====================
function computeMetrics(entries) {
    entries = Array.isArray(entries) ? entries : [];
    let totalDraws = entries.length;
    let totalCrests = entries.reduce((acc, e) => acc + (e.crests || 0), 0); // Ensure crests is a number

    // --- Heuristic Diamond Spending Calculation ---
    let totalDiamondsSpent = 0;
    entries.forEach(entry => {
        const cost = entry.diamond || 0; // Ensure diamond is a number
        if (cost === 450 || cost === 500) {
             // Approximate cost per result for 10x pulls for efficiency calc
             // Note: This makes total spent inaccurate but efficiency potentially more intuitive
             totalDiamondsSpent += cost / 10;
        } else if (cost > 0) {
             totalDiamondsSpent += cost; // Add cost for normal 25/50 draws
        }
    });
    // --- End Heuristic Calculation ---

    let totalFree = entries.filter(e => (e.diamond || 0) === 0).length;
    let totalDiamondDraws = totalDraws - totalFree;

    let tokensPerDraw = totalDraws === 0 ? 0 : totalCrests / totalDraws;

    let best = entries.reduce((b, e) => (e && typeof e.crests === 'number' && e.crests > b.crests) ? e : b, { crests: -Infinity });
    let bestDraw = (best.crests === -Infinity) ? null : best;

    let luckStatus = "Average";
    if (tokensPerDraw > 9) { luckStatus = "Lucky"; }
    else if (tokensPerDraw < 9 && totalDraws > 0) { luckStatus = "Unlucky"; }
    else if (totalDraws === 0) { luckStatus = "N/A"; }

    let costEfficiency = null;
    if (totalDiamondsSpent > 0 && totalCrests > 0) {
        costEfficiency = totalDiamondsSpent / totalCrests;
    } else if (totalDiamondsSpent === 0 && totalCrests > 0) {
        costEfficiency = 0;
    } else if (totalDiamondsSpent > 0 && totalCrests === 0) {
        costEfficiency = Infinity;
    }

    return {
        totalDraws, totalFree, totalDiamondDraws, totalCrests,
        totalDiamondsSpent, // Represents an adjusted value, not true total spend
        bestDraw, tokensPerDraw, costEfficiency, luckStatus
    };
}

//===================== METRICS HTML BUILDER (SHARED) =====================
function buildMetricsHTML(m, isComparePage = false, compareFlags = {}) {
    // Calculate percentages based on total draws
    let freePercent = (m.totalDraws === 0) ? 0 : (m.totalFree / m.totalDraws) * 100;
    // *** USE totalDiamondDraws for percentage calculation ***
    let diamondPercent = (m.totalDraws === 0) ? 0 : (m.totalDiamondDraws / m.totalDraws) * 100;

    const leaderClass = (flag) => (isComparePage && flag) ? ' compare-leader' : '';
    let html = '';

    // Total Draws
    html += `
        <div class="metric-card">
            <div class="metric-label">Total Draws <img src="assets/mystical_dial.png" class="metric-icon" alt="Dial" /></div>
            <div class="metric-value">${m.totalDraws}</div>
        </div>`;

    // Total Tokens
    html += `
        <div class="metric-card${leaderClass(compareFlags.isLeadingTotalTokens)}">
            <div class="metric-label">Total Tokens <img src="assets/token.png" class="metric-icon" alt="Token" /></div>
            <div class="metric-value">${m.totalCrests}</div>
        </div>`;

    // Avg Tokens/Draw (Stats page only)
    if (!isComparePage) {
        html += `
            <div class="metric-card">
                <div class="metric-label">Avg Tokens/Draw <img src="assets/token.png" class="metric-icon" alt="Token" /></div>
                <div class="metric-value">${m.tokensPerDraw.toFixed(2)}</div>
            </div>`;
    }

    // Total Diamonds Spent (Now correctly calculated by computeMetrics)
    html += `
        <div class="metric-card">
            <div class="metric-label">Total Spent <img src="assets/diamond.png" class="metric-icon" alt="Diamond" /></div>
            <div class="metric-value">${m.totalDiamondsSpent}</div>
            <div class="metric-note">Diamonds</div>
        </div>`;

    // Cost Efficiency (Now correctly calculated by computeMetrics)
    let costEfficiencyText = "N/A";
    if (m.costEfficiency === 0) { costEfficiencyText = "0.00 💎/Token (Free)"; }
    else if (m.costEfficiency === Infinity) { costEfficiencyText = "∞ 💎/Token"; }
    else if (m.costEfficiency !== null) { costEfficiencyText = m.costEfficiency.toFixed(2) + " 💎/Token"; }
    const costNote = (m.costEfficiency !== null && m.costEfficiency !== Infinity && m.costEfficiency !== 0) ? '(Lower is Better)' : '';
    html += `
        <div class="metric-card${leaderClass(compareFlags.isLeadingCostEfficiency)}">
            <div class="metric-label">Cost Efficiency <i class="fas fa-coins metric-icon"></i></div>
            <div class="metric-value">${costEfficiencyText}</div>
            <div class="metric-note">${costNote}</div>
        </div>`;

    // Best Draw
    let bestDrawHTML = "";
    if (m.bestDraw) {
        bestDrawHTML = `
            <div class="metric-card${leaderClass(compareFlags.isLeadingBestDraw)}">
                <div class="metric-label">Best Draw <img src="assets/token.png" class="metric-icon" alt="token" /></div>
                <div class="metric-value">${m.bestDraw.crests}</div>
                <div class="metric-note"> ${m.bestDraw.diamond > 0 ? `(${m.bestDraw.diamond}💎)` : "(Free)"} </div>
            </div>`;
    } else { /* N/A case */ }
    html += bestDrawHTML || `<div class="metric-card"><div class="metric-label">Best Draw <img src="assets/token.png" class="metric-icon" alt="token" /></div><div class="metric-value">N/A</div></div>`;


    // Free Draws
    html += `
        <div class="metric-card">
            <div class="metric-label">Free Draws <img src="assets/mystical_dial.png" class="metric-icon" alt="Free" /></div>
            <div class="metric-value">${m.totalFree}</div>
            <div class="metric-note">${freePercent.toFixed(1)}%</div>
        </div>`;

    // Diamond Draws (Uses the count: totalDiamondDraws)
    html += `
        <div class="metric-card">
            <div class="metric-label">Diamond Draws <img src="assets/diamond.png" class="metric-icon" alt="diamond" /></div>
            <div class="metric-value">${m.totalDiamondDraws}</div>
            <div class="metric-note">${diamondPercent.toFixed(1)}%</div>
        </div>`;

    // Luck Status / Score
    let luckNote = isComparePage ? `${m.tokensPerDraw.toFixed(2)} <img src="assets/token.png" class="metric-icon" alt="Token" style="height: 1em; vertical-align: baseline;"/> /draw`
                                 : `${m.tokensPerDraw.toFixed(2)} tokens/draw`;
    html += `
        <div class="metric-card${leaderClass(compareFlags.isLeadingLuck)}">
            <div class="metric-label">Luck Score™ <img src="assets/mystical_dial.png" class="metric-icon" alt="Luck" /></div>
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

  function getTodayDateString() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const day = String(today.getDate()).padStart(2, '0');
    return `<span class="math-inline">\{year\}\-</span>{month}-${day}`;
}

// Helper to get the timestamp for the start of a given date
function getStartOfDayTimestamp(date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    return start.getTime();
}

// Helper to get the timestamp for the end of a given date
function getEndOfDayTimestamp(date) {
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return end.getTime();
}


// --- Daily Summary Screen Button Handlers ---

$("#continue-to-app").click(function() {
    $("#daily-summary-screen").fadeOut(300, function() {
        $(this).addClass("d-none"); // Hide summary screen
        $("#main-app").hide().removeClass("d-none").fadeIn(300); // Show main app
    });
});

$("#hide-summary-today").click(function() {
    const todayStr = getTodayDateString();
    localStorage.setItem('hideDailySummaryUntil', todayStr); // Store today's date
    console.log("Hiding daily summary until end of day:", todayStr);

    $("#daily-summary-screen").fadeOut(300, function() {
        $(this).addClass("d-none"); // Hide summary screen
        $("#main-app").hide().removeClass("d-none").fadeIn(300); // Show main app
    });
});

function calculateTodaysDrawsAndDiscount(allData) { // Renamed for clarity
    const todayStart = getStartOfDayTimestamp(new Date());
    const todayEnd = getEndOfDayTimestamp(new Date());
    let mitkoCount = 0;
    let aylinCount = 0;
    let mitkoDiscountCrests = null; // Use null to indicate not found/done
    let aylinDiscountCrests = null;

    // Process Mitko's data (find total and first 25 diamond draw)
    if (allData && allData.Mitko) {
        // Sort Mitko's entries today by timestamp ascending to find the first easily
        const mitkoTodayEntries = allData.Mitko
            .filter(entry => entry.timestamp >= todayStart && entry.timestamp <= todayEnd)
            .sort((a, b) => a.timestamp - b.timestamp);

        mitkoCount = mitkoTodayEntries.length; // Total count for today

        // Find the first entry where diamond is 25
        const firstDiscountDraw = mitkoTodayEntries.find(entry => entry.diamond === 25);
        if (firstDiscountDraw) {
            mitkoDiscountCrests = firstDiscountDraw.crests; // Store the crests value
        }
    }

    // Process Aylin's data (find total and first 25 diamond draw)
    if (allData && allData.Aylin) {
        // Sort Aylin's entries today by timestamp ascending
        const aylinTodayEntries = allData.Aylin
            .filter(entry => entry.timestamp >= todayStart && entry.timestamp <= todayEnd)
            .sort((a, b) => a.timestamp - b.timestamp);

        aylinCount = aylinTodayEntries.length; // Total count for today

        // Find the first entry where diamond is 25
        const firstDiscountDraw = aylinTodayEntries.find(entry => entry.diamond === 25);
        if (firstDiscountDraw) {
            aylinDiscountCrests = firstDiscountDraw.crests; // Store the crests value
        }
    }

    return {
        mitkoTotal: mitkoCount,
        aylinTotal: aylinCount,
        mitkoDiscountCrests: mitkoDiscountCrests,
        aylinDiscountCrests: aylinDiscountCrests
    };
}


// --- Start Wrapped View Logic ---
let currentSlideIndex = 0;
let totalSlides = 0; // Will be updated dynamically

// Function to calculate stats needed for Wrapped
function calculateWrappedStats(currentUser, allLocalData) {
    const userEntries = allLocalData[currentUser] || [];
    const otherUser = currentUser === 'Mitko' ? 'Aylin' : 'Mitko';
    const otherUserEntries = allLocalData[otherUser] || [];

    // Base metrics for current user
    const baseMetrics = computeMetrics(userEntries);
    // Base metrics for other user (for comparison)
    const otherBaseMetrics = computeMetrics(otherUserEntries);

    // Initialize counters/variables for calculations
    let tokenFrequency = {};
    let mostFrequentTokenValue = null;
    let maxTokenFreq = 0;
    let drawTypeFrequency = { 0: 0, 25: 0, 50: 0, 450: 0, 500: 0 };
    let mostUsedDrawType = null;
    let maxDrawTypeFreq = 0;
    let doubleDigitDraws = 0;
    // ** Time of Day Counts **
    let timeOfDayCounts = { Morning: 0, Afternoon: 0, Evening: 0, LateNight: 0 };

    if (userEntries.length > 0) {
        userEntries.forEach(entry => {
            // Most Frequent Token
            tokenFrequency[entry.crests] = (tokenFrequency[entry.crests] || 0) + 1;

            // Most Used Draw Type
            if (drawTypeFrequency.hasOwnProperty(entry.diamond)) {
                drawTypeFrequency[entry.diamond]++;
            }

            // Double Digit Calculation
            if (entry.crests >= 10) {
                doubleDigitDraws++;
            }

            // ** Time of Day Calculation **
            const drawHour = new Date(entry.timestamp).getHours();
            if (drawHour >= 6 && drawHour < 12) { // 6 AM to 11:59 AM
                timeOfDayCounts.Morning++;
            } else if (drawHour >= 12 && drawHour < 18) { // 12 PM to 5:59 PM
                timeOfDayCounts.Afternoon++;
            } else if (drawHour >= 18 && drawHour < 23) { // 6 PM to 10:59 PM
                timeOfDayCounts.Evening++;
            } else { // 11 PM to 5:59 AM
                timeOfDayCounts.LateNight++;
            }
        });

        // Find Most Frequent Token (Final calculation)
        let currentMaxTokenFreq = 0;
        for (const token in tokenFrequency) {
            if (tokenFrequency[token] > currentMaxTokenFreq) {
                currentMaxTokenFreq = tokenFrequency[token];
                mostFrequentTokenValue = parseInt(token);
            }
        }
        maxTokenFreq = currentMaxTokenFreq;

        // Find Most Used Draw Type (Final calculation)
        for (const type in drawTypeFrequency) {
            if (drawTypeFrequency[type] > maxDrawTypeFreq) {
                maxDrawTypeFreq = drawTypeFrequency[type];
                mostUsedDrawType = parseInt(type);
            }
        }
    } // End if(userEntries.length > 0)

    // --- Find Peak Draw Time ---
    let peakTimeName = 'Anytime!'; // Default if no draws or perfect tie (unlikely)
    let peakTimeCount = 0;
    let peakTimeIcon = '<i class="fa-regular fa-clock fa-3x text-white-50"></i>'; // Default icon
    const timeEntries = Object.entries(timeOfDayCounts); // [ ['Morning', count], ['Afternoon', count], ... ]

    if (timeEntries.some(entry => entry[1] > 0)) { // Check if any draws exist
        timeEntries.sort((a, b) => b[1] - a[1]); // Sort descending by count
        peakTimeName = timeEntries[0][0]; // Name of the block with the highest count
        peakTimeCount = timeEntries[0][1]; // The highest count

        // Assign Icon based on peak time
        switch (peakTimeName) {
            case 'Morning':
                peakTimeIcon = '<i class="fa-solid fa-sun fa-3x text-warning"></i>';
                break;
            case 'Afternoon':
                peakTimeIcon = '<i class="fa-solid fa-cloud-sun fa-3x text-info"></i>';
                break;
            case 'Evening':
                peakTimeIcon = '<i class="fa-solid fa-cloud-moon fa-3x text-light"></i>';
                break;
            case 'LateNight':
                peakTimeIcon = '<i class="fa-solid fa-moon fa-3x text-secondary"></i>';
                peakTimeName = "Late Night"; // Add space for display
                break;
        }
    }


    // --- Format Most Used Draw Type Text/Icon ---
    let mostUsedDrawText = 'N/A';
    let mostUsedDrawIconHtml = '<i class="fa-solid fa-question fa-3x text-white-50"></i>';
    if (mostUsedDrawType !== null) {
        const drawImgClass = 'img-fluid my-2'; const iconSize = '80px';
        switch (mostUsedDrawType) {
            case 0: mostUsedDrawText = 'Free Draw'; mostUsedDrawIconHtml = `<img src="assets/mystical_dial.png" alt="Free Draw" style="height: ${iconSize}; width: ${iconSize};" class="${drawImgClass}">`; break;
            case 25: mostUsedDrawText = '25 <img src="assets/diamond.png" class="small-icon" alt="diamond"> Draw'; mostUsedDrawIconHtml = `<img src="assets/diamond.png" alt="Diamond" style="height: ${iconSize}; width: ${iconSize};" class="${drawImgClass}">`; break;
            case 50: mostUsedDrawText = '50 <img src="assets/diamond.png" class="small-icon" alt="diamond"> Draw'; mostUsedDrawIconHtml = `<img src="assets/diamond.png" alt="Diamond" style="height: ${iconSize}; width: ${iconSize};" class="${drawImgClass}">`; break;
            case 450: mostUsedDrawText = '450 <img src="assets/diamond.png" class="small-icon" alt="diamond"> Draw (10x)'; mostUsedDrawIconHtml = `<img src="assets/diamond.png" alt="Diamond" style="height: ${iconSize}; width: ${iconSize};" class="${drawImgClass}">`; break;
            case 500: mostUsedDrawText = '500 <img src="assets/diamond.png" class="small-icon" alt="diamond"> Draw (10x)'; mostUsedDrawIconHtml = `<img src="assets/diamond.png" alt="Diamond" style="height: ${iconSize}; width: ${iconSize};" class="${drawImgClass}">`; break;
        }
    }

    // --- Determine Draw Personality ---
    let personality = "The Balanced Tracker";
    if (baseMetrics.totalDraws > 5) {
        if (baseMetrics.totalFree > baseMetrics.totalDiamondDraws * 2) { personality = "The F2P Strategist"; }
        else if (baseMetrics.totalDiamondDraws > baseMetrics.totalFree * 2) {
            if (baseMetrics.tokensPerDraw > 10.5) { personality = "The Lucky Spender"; }
            else if (drawTypeFrequency[450] + drawTypeFrequency[500] > baseMetrics.totalDraws / 4) { personality = "The 10-Pull Enthusiast"; }
            else { personality = "The Diamond Investor"; }
        } else if (baseMetrics.tokensPerDraw >= 11) { personality = "The Token Magnet"; }
        else if (baseMetrics.tokensPerDraw < 7.5) { personality = "The Persistent Optimist"; }
        else if (drawTypeFrequency[25] > baseMetrics.totalDraws / 4 && baseMetrics.totalFree < baseMetrics.totalDiamondDraws) { personality = "The Daily Deal Hunter"; }
    } else if (baseMetrics.totalDraws > 0) { personality = "The Tracker Starter"; }
    else { personality = "The Observer"; }


    // --- Format Best Draw Cost ---
    let bestDrawCostHTML = 'N/A'; if (baseMetrics.bestDraw) { if (baseMetrics.bestDraw.diamond === 0) { bestDrawCostHTML = '<img src="assets/mystical_dial.png" class="small-icon" alt="Free Draw"> Free'; } else { bestDrawCostHTML = `${baseMetrics.bestDraw.diamond} <img src='assets/diamond.png' class='small-icon' alt='diamond'>`; } }

    // --- Calculate Percentages ---
    const totalDrawsOverall = baseMetrics.totalDraws || 1; // Avoid division by zero
    const freePercent = ((baseMetrics.totalFree / totalDrawsOverall) * 100).toFixed(1);
    const diamondPercent = ((baseMetrics.totalDiamondDraws / totalDrawsOverall) * 100).toFixed(1);
    const doubleDigitPercent = baseMetrics.totalDraws > 0 ? ((doubleDigitDraws / baseMetrics.totalDraws) * 100).toFixed(1) : "0.0";

    // --- Start NEW Calculations for Missing Slides ---

    // 1. Thinking Alike (Sync Count - Slide 11)
    let syncCount = 0;
    const syncTimeWindow = 10 * 60 * 1000; // 10 minutes in milliseconds
    if (userEntries.length > 0 && otherUserEntries.length > 0) {
        const sortedUserEntries = [...userEntries].sort((a, b) => a.timestamp - b.timestamp);
        const sortedOtherEntries = [...otherUserEntries].sort((a, b) => a.timestamp - b.timestamp);

        // Refined approach: count pairs only once
        syncCount = 0;
        const processedOtherIndices = new Set(); // Keep track of other entries already paired
        sortedUserEntries.forEach(uEntry => {
            for (let i = 0; i < sortedOtherEntries.length; i++) {
                // Skip if this 'other' entry was already part of a pair
                if (processedOtherIndices.has(i)) continue;

                const oEntry = sortedOtherEntries[i];
                if (Math.abs(uEntry.timestamp - oEntry.timestamp) <= syncTimeWindow) {
                    syncCount++;
                    processedOtherIndices.add(i); // Mark this 'other' entry as used
                    break; // Move to the next 'user' entry once a pair is found
                }
            }
        });
    }

    // 2. Teamwork (Combined Totals - Slide 12)
    const combinedDraws = baseMetrics.totalDraws + otherBaseMetrics.totalDraws;
    const combinedTokens = baseMetrics.totalCrests + otherBaseMetrics.totalCrests;

    // 3. Superlatives Basis (Slide 13) - Calculate the *actual* winners first
    const allEntries = [...userEntries, ...otherUserEntries];
    let actualSuperlativeWinners = {
        nightOwl: 'N/A',
        freebie: 'N/A',
        lucky: 'N/A',
        daily: 'N/A',
        jackpot: 'N/A'
    };

    if (allEntries.length > 0) {
        // Helper function to count draws in a time range
        const countDrawsInHourRange = (entries, startHour, endHour) => {
             return entries.filter(e => {
                const hour = new Date(e.timestamp).getHours();
                if (startHour < endHour) { // Normal range (e.g., 6 to 12)
                     return hour >= startHour && hour < endHour;
                } else { // Range wraps around midnight (e.g., 23 to 6)
                     return hour >= startHour || hour < endHour;
                }
             }).length;
        };

        // Night Owl (e.g., 11 PM - 5:59 AM) - Higher count wins
        const mitkoNightDraws = countDrawsInHourRange(userEntries, 23, 6);
        const aylinNightDraws = countDrawsInHourRange(otherUserEntries, 23, 6);
        if (mitkoNightDraws > aylinNightDraws) actualSuperlativeWinners.nightOwl = currentUser;
        else if (aylinNightDraws > mitkoNightDraws) actualSuperlativeWinners.nightOwl = otherUser;
        else if (mitkoNightDraws > 0) actualSuperlativeWinners.nightOwl = 'Both'; // Tie

        // Freebie (% Free Draws) - Higher percentage wins (min 1 draw needed)
        const mitkoFreePercent = baseMetrics.totalDraws > 0 ? (baseMetrics.totalFree / baseMetrics.totalDraws) : -1;
        const aylinFreePercent = otherBaseMetrics.totalDraws > 0 ? (otherBaseMetrics.totalFree / otherBaseMetrics.totalDraws) : -1;
        if (mitkoFreePercent > aylinFreePercent) actualSuperlativeWinners.freebie = currentUser;
        else if (aylinFreePercent > mitkoFreePercent) actualSuperlativeWinners.freebie = otherUser;
        else if (mitkoFreePercent >= 0) actualSuperlativeWinners.freebie = 'Both'; // Tie

        // Lucky (Avg Tokens/Draw) - Higher average wins (min 1 draw needed)
        const mitkoAvg = baseMetrics.totalDraws > 0 ? baseMetrics.tokensPerDraw : -1;
        const aylinAvg = otherBaseMetrics.totalDraws > 0 ? otherBaseMetrics.tokensPerDraw : -1;
        if (mitkoAvg > aylinAvg) actualSuperlativeWinners.lucky = currentUser;
        else if (aylinAvg > mitkoAvg) actualSuperlativeWinners.lucky = otherUser;
        else if (mitkoAvg >= 0) actualSuperlativeWinners.lucky = 'Both'; // Tie

        // Daily Deal (Count of 25 Diamond Draws) - Higher count wins
        const mitkoDailyCount = userEntries.filter(e => e.diamond === 25).length;
        const aylinDailyCount = otherUserEntries.filter(e => e.diamond === 25).length;
        if (mitkoDailyCount > aylinDailyCount) actualSuperlativeWinners.daily = currentUser;
        else if (aylinDailyCount > mitkoDailyCount) actualSuperlativeWinners.daily = otherUser;
        else if (mitkoDailyCount > 0) actualSuperlativeWinners.daily = 'Both'; // Tie

        // Jackpot (Count of 20+ Token Draws) - Higher count wins
        const mitkoJackpotCount = userEntries.filter(e => e.crests >= 20).length;
        const aylinJackpotCount = otherUserEntries.filter(e => e.crests >= 20).length;
        if (mitkoJackpotCount > aylinJackpotCount) actualSuperlativeWinners.jackpot = currentUser;
        else if (aylinJackpotCount > mitkoJackpotCount) actualSuperlativeWinners.jackpot = otherUser;
        else if (mitkoJackpotCount > 0) actualSuperlativeWinners.jackpot = 'Both'; // Tie
    }

    // // 4. Trailblazer (First Draw - Slide 14)
    // let trailblazerName = 'N/A';
    // if (allEntries.length > 0) {
    //     let firstTimestamp = Infinity;
    //     allEntries.forEach(entry => {
    //         if (entry.timestamp < firstTimestamp) {
    //             firstTimestamp = entry.timestamp;
    //             trailblazerName = entry.User; // User who made the first draw
    //         }
    //     });
    // }

    // --- Manually Set Trailblazer ---
    const manualTrailblazerName = 'Aylin'; // <<< SET WINNER HERE ('Aylin' or 'Mitko')
    // --- End Manual Setting ---

    // --- End NEW Calculations ---

    // --- Structure the final result object ---
    return {
        // Base user stats
        currentUser: currentUser,
        userEntriesExist: userEntries.length > 0,
        totalDraws: baseMetrics.totalDraws,
        totalCrests: baseMetrics.totalCrests,
        bestDrawCrests: baseMetrics.bestDraw ? baseMetrics.bestDraw.crests : null,
        bestDrawCostHTML: bestDrawCostHTML,
        mostFrequentTokenValue: mostFrequentTokenValue,
        mostFrequentTokenCount: maxTokenFreq,
        totalFree: baseMetrics.totalFree,
        totalDiamondDraws: baseMetrics.totalDiamondDraws,
        freeDrawPercent: freePercent,
        diamondDrawPercent: diamondPercent,
        mostUsedDrawTextHTML: mostUsedDrawText,
        mostUsedDrawIconHtml: mostUsedDrawIconHtml,
        avgTokens: baseMetrics.tokensPerDraw.toFixed(2),
        luckStatus: baseMetrics.luckStatus,
        personality: personality,
        totalDiamondsSpent: baseMetrics.totalDiamondsSpent.toFixed(0),
        doubleDigitDrawCount: doubleDigitDraws,
        doubleDigitDrawPercent: doubleDigitPercent,
        peakDrawTimeName: peakTimeName,
        peakDrawTimeCount: peakTimeCount,
        peakDrawTimeIconHTML: peakTimeIcon,

        // Other User Stats
        otherUser: otherUser,
        otherTotalDraws: otherBaseMetrics.totalDraws,
        otherTotalCrests: otherBaseMetrics.totalCrests,
        otherAvgTokens: otherBaseMetrics.tokensPerDraw.toFixed(2),

        // Newly added stats for specific slides
        syncCount: syncCount,
        combinedDraws: combinedDraws,
        combinedTokens: combinedTokens,
        actualSuperlativeWinners: actualSuperlativeWinners,
        trailblazerName: manualTrailblazerName
    };
}


// Function to show a specific slide (Handles navigation and progress)
function showWrappedSlide(index) {
    const $slides = $('#wrapped-slides-container .wrapped-slide');
    totalSlides = $slides.length;

    if (index < 0) index = 0;
    if (index >= totalSlides) index = totalSlides - 1;

    const $currentActive = $slides.filter('.active-slide');
    const $nextActive = $slides.eq(index);

    if ($currentActive.length && $currentActive.data('slide-index') !== index) {
        const direction = index > $currentActive.data('slide-index') ? 'next' : 'prev';
        // Apply exiting class to the current slide
        $currentActive.removeClass('active-slide').addClass(direction === 'next' ? 'exiting-next' : 'exiting-prev');
        // Remove exiting class after animation (match transition duration)
        setTimeout(() => {
            $currentActive.removeClass('exiting-next exiting-prev');
        }, 500); // Duration should match CSS transition
    }

    // Add active class to the target slide
    $nextActive.addClass('active-slide');
    currentSlideIndex = index;

    // Update navigation button states
    $('#prev-slide-btn').prop('disabled', currentSlideIndex === 0);
    $('#next-slide-btn').prop('disabled', currentSlideIndex === totalSlides - 1);

    // Update progress bar
    const progressPercent = totalSlides > 0 ? ((currentSlideIndex + 1) / totalSlides) * 100 : 0;
    // Ensure the inner progress bar element exists
    if ($('.wrapped-progress-bar .progress-inner').length === 0) {
        $('.wrapped-progress-bar').html('<div class="progress-inner"></div>');
    }
    $('.wrapped-progress-bar .progress-inner').css('width', progressPercent + '%');
}

// --- Event Handlers ---

// Button on Home tab to show Wrapped
$('#show-wrapped-btn').click(function() {
     if (!localData || !localData[currentUser]) {
         alert(`Please wait for data to load or select a user.`);
         return;
     }
     if (!Array.isArray(localData[currentUser]) || localData[currentUser].length === 0) {
         alert(`No draw data found for ${currentUser} to generate a summary.`);
         return;
     }

    const stats = calculateWrappedStats(currentUser, localData);
    if (!stats) {
        alert("Could not generate summary stats. Please try again later.");
        return;
    }
    console.log("Wrapped Stats:", stats); // Good for debugging

    // --- Define image sources *before* using them ---
    let userImgSrc = (currentUser === "Mitko") ? "assets/fredrinn.png" : "assets/lylia.png";
    let otherUserImgSrc = (stats.otherUser === "Mitko") ? "assets/fredrinn.png" : "assets/lylia.png";

    // --- Populate ALL Slides Sequentially ---

    // Slide 0: Intro
    $("#wrapped-user-img").attr("src", userImgSrc);
    $("#wrapped-user-name-intro").text(stats.currentUser);

    // Slide 1: Total Draws
    $("#wrapped-total-draws").text(stats.totalDraws);

    // Slide 2: Total Tokens
    $("#wrapped-total-tokens").text(stats.totalCrests);

    // Slide 3: Best Draw
    $("#wrapped-best-draw-crests").text(stats.bestDrawCrests !== null ? stats.bestDrawCrests : 'N/A');
    $("#wrapped-best-draw-cost").html(stats.bestDrawCostHTML); // Use .html() for image tags

    // Slide 4: Frequent Token
    $("#wrapped-freq-token-value").text(stats.mostFrequentTokenValue !== null ? stats.mostFrequentTokenValue : '-');
    $("#wrapped-freq-token-count").text(stats.mostFrequentTokenCount);

    // Slide 5: Draw Style Breakdown
    $("#wrapped-free-draws").text(stats.totalFree);
    $("#wrapped-diamond-draws").text(stats.totalDiamondDraws);
    $("#wrapped-free-percent").text(stats.freeDrawPercent);
    $("#wrapped-diamond-percent").text(stats.diamondDrawPercent);

    // Slide 6: Go-To Draw
    $("#wrapped-most-used-draw-icon").html(stats.mostUsedDrawIconHtml); // Use .html() for image tags
    $("#wrapped-most-used-draw-text").html(stats.mostUsedDrawTextHTML); // Use .html() for image tags

    // Slide 7: Luck Score
    $("#wrapped-luck-status").text(stats.luckStatus);
    $("#wrapped-avg-tokens").text(stats.avgTokens);

    // Slide 8: Personality
    $("#wrapped-personality").text(stats.personality);

    // Slide 9: Peak Draw Time
    $("#wrapped-peak-time-icon").html(stats.peakDrawTimeIconHTML); // Use .html() for icon tag
    $("#wrapped-peak-time-name").text(stats.peakDrawTimeName);
    $("#wrapped-peak-time-desc").text(`You logged the most draws during the ${stats.peakDrawTimeName.toLowerCase()}!`);

    // Slide 10: Double Digit Dominance
    $("#wrapped-double-digit-percent").text(stats.doubleDigitDrawPercent);
    $("#wrapped-double-digit-count").text(stats.doubleDigitDrawCount);

    // Slide 11: Thinking Alike (Syncing Draws)
    $("#wrapped-sync-other-name").text(stats.otherUser);
    $("#wrapped-sync-count").text(stats.syncCount);
    // Adjust text based on the count
    if (stats.syncCount === 0) {
        $("#wrapped-slide[data-slide-index='11'] .slide-content p:last-child").text("Even when drawing apart, you were working towards the same goal! 😊");
    } else {
         $("#wrapped-slide[data-slide-index='11'] .slide-content p:last-child").text(`times! Were you drawing together? 😉`); // Default text if count > 0
    }

    // Slide 12: Teamwork
    $("#wrapped-combined-draws").text(stats.combinedDraws);
    $("#wrapped-combined-tokens").text(stats.combinedTokens);

    // Slide 13: Superlatives (Apply Aylin Favoritism Here)
    let superlativeWinners = { ...stats.actualSuperlativeWinners }; // Copy actual winners
    const aylinName = 'Aylin'; // Define names clearly
    const mitkoName = 'Mitko';

    // --- Apply the override logic ---
    superlativeWinners.freebie = aylinName; // Give Freebie to Aylin
    superlativeWinners.lucky = aylinName; // Give Lucky to Aylin
    superlativeWinners.jackpot = aylinName; // Give Jackpot to Aylin

    // Assign Night Owl and Daily based on who didn't get the others, or default to Mitko
    // If Aylin actually won Night Owl, give it to Mitko. If Mitko won, keep it Mitko. If tie, give to Mitko.
    if (superlativeWinners.nightOwl === aylinName || superlativeWinners.nightOwl === 'Both' || superlativeWinners.nightOwl === 'N/A') {
        superlativeWinners.nightOwl = mitkoName;
    } // Implicitly keeps Mitko if he won

    // If Aylin actually won Daily, give it to Mitko. If Mitko won, keep it Mitko. If tie, give to Mitko.
    if (superlativeWinners.daily === aylinName || superlativeWinners.daily === 'Both' || superlativeWinners.daily === 'N/A') {
        superlativeWinners.daily = mitkoName;
    }// Implicitly keeps Mitko if he won

    // Ensure Aylin always has her assigned ones even if calculations resulted in N/A initially
    if (superlativeWinners.freebie === 'N/A') superlativeWinners.freebie = aylinName;
    if (superlativeWinners.lucky === 'N/A') superlativeWinners.lucky = aylinName;
    if (superlativeWinners.jackpot === 'N/A') superlativeWinners.jackpot = aylinName;

    // --- Populate the HTML using the *modified* superlativeWinners ---
    $("#wrapped-likely-nightowl").text(superlativeWinners.nightOwl);
    $("#wrapped-likely-freebie").text(superlativeWinners.freebie);
    $("#wrapped-likely-lucky").text(superlativeWinners.lucky);
    $("#wrapped-likely-daily").text(superlativeWinners.daily);
    $("#wrapped-likely-jackpot").text(superlativeWinners.jackpot);

    // Slide 14: Trailblazer
    $("#wrapped-trailblazer-name").text(stats.trailblazerName);
    // Adjust text based on winner
    if (stats.trailblazerName === 'Aylin') {
        $("#wrapped-slide[data-slide-index='14'] .slide-content p:last-child").text("for getting the adventure started right away! Leading the charge! 🥳");
    } else if (stats.trailblazerName === 'Mitko') {
        $("#wrapped-slide[data-slide-index='14'] .slide-content p:last-child").text("for lighting the signal flare... making sure everything was ready for Aylin! 😉");
    } else {
        $("#wrapped-slide[data-slide-index='14'] .slide-content p:last-child").text("Hmm, couldn't determine the first draw!");
    }

    // Slide 15: Comparison (How You Stack Up)
    $("#wrapped-compare-user-img").attr("src", userImgSrc);
    $("#wrapped-compare-user-name").text(stats.currentUser);
    $("#wrapped-compare-user-draws").text(stats.totalDraws);
    $("#wrapped-compare-user-tokens").text(stats.totalCrests);
    $("#wrapped-compare-user-avg").text(stats.avgTokens);
    $("#wrapped-compare-other-img").attr("src", otherUserImgSrc);
    $("#wrapped-compare-other-name").text(stats.otherUser);
    $("#wrapped-compare-other-draws").text(stats.otherTotalDraws);
    $("#wrapped-compare-other-tokens").text(stats.otherTotalCrests);
    $("#wrapped-compare-other-avg").text(stats.otherAvgTokens);

    // Slide 16: Outro - No dynamic data needed

    // --- Show the view ---
    currentSlideIndex = 0; // Reset to first slide
    $('#wrapped-slides-container .wrapped-slide').removeClass('active-slide exiting-next exiting-prev'); // Clear states
    $('#wrapped-view').removeClass('d-none').hide().fadeIn(300, function() {
        showWrappedSlide(0); // Show the first slide properly after fade-in
    });
});

// Close button for Wrapped view
$('#close-wrapped-btn, #finish-wrapped-btn').click(function() {
    $('#wrapped-view').fadeOut(300, function() {
        $(this).addClass('d-none');
        // Reset slide states for next time
        $('#wrapped-slides-container .wrapped-slide').removeClass('active-slide exiting-next exiting-prev');
        $('.wrapped-progress-bar .progress-inner').css('width', '0%');
        // Ensure first slide is visually ready for next open, though showWrappedSlide(0) will handle activation
        $('#wrapped-slides-container .wrapped-slide').eq(0).addClass('active-slide');
    });
});

// Navigation buttons
$('#next-slide-btn').click(function() { showWrappedSlide(currentSlideIndex + 1); });
$('#prev-slide-btn').click(function() { showWrappedSlide(currentSlideIndex - 1); });

// --- End Wrapped View Logic ---
});