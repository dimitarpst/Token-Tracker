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
  let inSessionMode = false;
  let sessionEntries = []; // Holds entry objects {diamond, crests, timestamp, User, tempId, synced?}
  let statsView = "tokens";
  const SESSION_MODE_KEY = 'drawTrackerSessionMode';
  const SESSION_ENTRIES_KEY = 'drawTrackerSessionEntries';
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

    // --- Load and Restore Session State (Keep this logic) ---
    try {
        const savedSessionMode = localStorage.getItem(SESSION_MODE_KEY) === 'true';
        const savedSessionEntries = JSON.parse(localStorage.getItem(SESSION_ENTRIES_KEY) || '[]');

        if (savedSessionMode && Array.isArray(savedSessionEntries)) {
            console.log("Restoring previous session state...");
            inSessionMode = true;
            sessionEntries = savedSessionEntries;
            $("#toggle-session-mode").addClass('active').html('<i class="fa-solid fa-circle-stop"></i> End Session Entry');
            $("#session-entries-container").removeClass("d-none");
            renderSessionList();
        } else {
            inSessionMode = false;
            sessionEntries = [];
            localStorage.removeItem(SESSION_MODE_KEY);
            localStorage.removeItem(SESSION_ENTRIES_KEY);
            $("#toggle-session-mode").removeClass('active').html('<i class="fa-solid fa-bolt"></i> Start Session Entry');
            $("#session-entries-container").addClass("d-none");
             renderSessionList(); // Render empty state
        }
    } catch (e) {
         console.error("Error loading session state from localStorage:", e);
         inSessionMode = false;
         sessionEntries = [];
         localStorage.removeItem(SESSION_MODE_KEY);
         localStorage.removeItem(SESSION_ENTRIES_KEY);
    }
    // --- End Load/Restore Session State ---

    // --- DETERMINE AND SET INITIAL ACTIVE TAB ---
    let initialTabId = localStorage.getItem(LAST_ACTIVE_TAB_KEY);
    const validTabIds = ['home', 'history', 'stats', 'compare', 'settings']; // List of valid tab IDs
    const defaultTabId = 'home';

    // Validate saved tab ID, default to 'home' if invalid or missing
    if (!initialTabId || !validTabIds.includes(initialTabId)) {
        initialTabId = defaultTabId;
        // Optionally save the default back if it was invalid/missing
        // localStorage.setItem(LAST_ACTIVE_TAB_KEY, initialTabId);
    }
     console.log(`Restoring last active tab: ${initialTabId}`);

    // Ensure all tabs are hidden first, then show the target one
    $(".tab-content").addClass("d-none");
    $("#tab-" + initialTabId).removeClass("d-none"); // Make target tab visible

    // Update sidebar link highlight to match the loaded tab
    $("#sidebar .nav-link").removeClass('active');
    $(`#sidebar .nav-link[data-tab='${initialTabId}']`).addClass('active');
    // --- END SET INITIAL ACTIVE TAB ---

    // Reset draw input state (slider, etc.) for consistency on load
    if (ctx) {
        drawRing(minValue);
    }
     maxValue = 20; // Default max value
     crestValue = minValue;
     $("#crestValue").text(crestValue);
     $("#extendedMode").prop("checked", false);
     $("#slider-container").addClass("d-none");
     $("#preset-buttons-container").removeClass("d-none");
     $(".preset-crest-btn").removeClass('active');
     // currentDiamond = null; // Maybe reset selected draw type too? Or keep it? Let's keep it for now.
     // $(".draw-option").removeClass('active');


    // Fetch remote data and update relevant content areas
    fetchRemoteData(() => {
        // These functions update the *content* of the tabs, regardless of which is visible
        updateHistory();
        updateStats();
        updateCompare();
         // The tab visibility and sidebar highlight are already set above based on localStorage
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
    $(".draw-option").removeClass('active'); // Remove active class from all buttons first

      const diamond = parseInt($(this).data("diamond"));
      currentDiamond = diamond;

      $(this).addClass('active'); // Add active class to the clicked button

      const label = (diamond === 0) ? "Free Draw" : diamond + " Diamonds";
      $("#selected-draw-label").text(label);
      $("#draw-type-icon").attr("src", diamond === 0 ? "assets/mystical_dial.png" : "assets/diamond.png");

        // Reset crest selection when changing draw type
        $("#extendedMode").prop("checked", false); // Ensure extended is off
        maxValue = 20;
        $("#slider-container").addClass("d-none"); // Ensure slider is hidden
        $("#preset-buttons-container").removeClass("d-none"); // Ensure presets are shown
        crestValue = minValue; // Reset crest value
        $("#crestValue").text(crestValue); // Update display
        $(".preset-crest-btn").removeClass('active'); // Deactivate any active preset button
        if (ctx) {
            drawRing(minValue); // Reset slider visual just in case
        }
  });

  //===================== SESSION MODE TOGGLE =====================
$("#toggle-session-mode").click(function() {
    inSessionMode = !inSessionMode; // Toggle the state
    localStorage.setItem(SESSION_MODE_KEY, inSessionMode); // Save the new state

    if (inSessionMode) {
        // --- Entering Session Mode ---
        $(this).addClass('active').html('<i class="fa-solid fa-circle-stop"></i> End Session Entry');
        $("#session-entries-container").removeClass("d-none");
        // Load entries from storage *in case* they weren't loaded on init (e.g., manual clear)
         try {
             const storedEntries = JSON.parse(localStorage.getItem(SESSION_ENTRIES_KEY) || '[]');
             sessionEntries = Array.isArray(storedEntries) ? storedEntries : [];
         } catch (e) {
             console.error("Error reading session entries on toggle:", e);
             sessionEntries = []; // Reset if error
         }
        renderSessionList();
        // Optional scroll into view
         document.getElementById('session-entries-container')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    } else {
        // --- Ending Session Mode ---
        $(this).removeClass('active').html('<i class="fa-solid fa-bolt"></i> Start Session Entry');
        $("#session-entries-container").addClass("d-none");

        // Prompt to sync before clearing data if there are entries
        if (sessionEntries.length > 0) {
            if (confirm(`You have ${sessionEntries.length} unsynced draws in this session. Sync them now before ending?`)) {
                $("#sync-session-entries").click(); // Trigger sync
                // Note: Sync is async. We proceed to clear local state immediately.
                // If sync fails later, the failed items will remain in sessionEntries (memory)
                // and will be re-saved if the user re-enters session mode before refresh.
                // If they refresh after a failed sync, unsynced items might be lost unless sync logic saves failed items back to localStorage.
            }
        }

        // Clear session state from memory and localStorage when manually ending
        sessionEntries = []; // Clear array in memory
        localStorage.removeItem(SESSION_ENTRIES_KEY); // Remove entries from storage
        localStorage.removeItem(SESSION_MODE_KEY); // Remove mode flag from storage (already set to false above, but remove for cleanliness)
        renderSessionList(); // Update UI (shows empty message inside hidden container)
    }
});

  //===================== EXTENDED MODE =====================

  $("#extendedMode").change(function() {
    if ($(this).is(":checked")) {
        // Extended Mode ON
        maxValue = 300;
        $("#preset-buttons-container").addClass("d-none"); // Hide presets
        $("#slider-container").removeClass("d-none"); // Show slider
        crestValue = minValue; // Reset value when switching mode
        $("#crestValue").text(crestValue);
        $(".preset-crest-btn").removeClass('active'); // Deactivate preset buttons
        if (ctx) {
            drawRing(crestValue);
        }
    } else {
        // Extended Mode OFF
        maxValue = 20; // Or keep 300 if presets can exceed 20? Let's stick to 20 for now.
        $("#preset-buttons-container").removeClass("d-none"); // Show presets
        $("#slider-container").addClass("d-none"); // Hide slider
        crestValue = minValue; // Reset value when switching mode
         $("#crestValue").text(crestValue); // Optionally hide/clear this if only presets matter? Let's keep it updated.
        $(".preset-crest-btn").removeClass('active'); // Deactivate preset buttons
    }
});

  //===================== RADIAL SLIDER =====================

    $(document).on("click", ".preset-crest-btn", function() {
        if (currentDiamond === null) {
            alert("Please select a draw type first.");
            return; // Don't allow setting crests if draw type isn't selected
        }

    $(".preset-crest-btn").removeClass('active'); // Deactivate other presets
    $(this).addClass('active'); // Activate clicked preset

    crestValue = parseInt($(this).data("value")); // Get value from button
    $("#crestValue").text(crestValue); // Update the display span (even if hidden)
    });
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
    // No loader handling here - handled by calling function
    return $.ajax({ // <-- RETURN this
        url: url_tracker,
        method: "POST",
        data: {
            action: "add",
            diamond: entry.diamond,
            crests: entry.crests,
            timestamp: entry.timestamp, // Make sure timestamp is passed correctly
            User: entry.User
        },
        timeout: 20000
        // Success/error are handled by .done()/.fail() where called
    });
}

  $("#submit-draw").click(function() {
    if (currentDiamond === null) {
        alert("Select draw type.");
        return;
    }
    // Crest value is already set by preset click or slider change

    // --- Create the entry object ---
    let entry = {
        // Use a temporary ID for the session list rendering
        tempId: 'session-' + Date.now(),
        diamond: currentDiamond,
        crests: crestValue,
        timestamp: Date.now(), // Use current time for session logging
        User: currentUser,
        synced: false // Mark as not synced initially
    };

    if (inSessionMode) {
        // === SESSION MODE LOGIC ===
        console.log("Adding to session:", entry);
        sessionEntries.push(entry); // Add to the temporary array

    // --- ADD THIS LINE to save after adding ---
    localStorage.setItem(SESSION_ENTRIES_KEY, JSON.stringify(sessionEntries));
    // -------------------------------------------
        renderSessionList(); // Update the session list UI

        // Perform partial reset (keep draw type, reset crests)
        $("#extendedMode").prop("checked", false);
        maxValue = 20;
        $("#slider-container").addClass("d-none");
        $("#preset-buttons-container").removeClass("d-none");
        crestValue = minValue;
        $("#crestValue").text(minValue);
        $(".preset-crest-btn").removeClass('active');
        if (ctx) { drawRing(minValue); }
        // NOTE: Active draw option button remains active

    } else {
        // === NORMAL MODE LOGIC (Modified for Promise) ===
        console.log("Submitting directly:", entry);
        // 1. Optimistic UI Update (to main history) - uses 'local-' prefix
        let historyEntry = { ...entry, id: 'local-' + entry.timestamp }; // Use different temp ID for history
        localData[currentUser].unshift(historyEntry);
        updateHistory(); // Update main history list immediately
        updateStats();   // Update stats immediately
        updateCompare(); // Update compare immediately

        // Show loader for single sync
        $("#loader").removeClass("d-none");

        // 2. Submit to Sheet (returns a promise)
        submitEntryToSheet({ diamond: entry.diamond, crests: entry.crests, timestamp: entry.timestamp, User: entry.User })
            .done(function(response) {
                console.log("Entry submitted: ", response);
                // Fetch data AFTER successful single submission to update IDs etc.
                fetchRemoteData(() => {
                    updateHistory(); // Refresh history potentially with real ID
                    updateStats();
                    updateCompare();
                    $("#loader").addClass("d-none");
                });
            })
            .fail(function(jqXHR, textStatus, errorThrown) {
                console.error("Submit Error:", textStatus, errorThrown);
                alert("Error submitting draw. Entry added locally but not synced.");
                // Maybe add a visual indicator to the failed local entry in history?
                 $("#loader").addClass("d-none");
                 // We might need to update the specific history entry to show a failure icon
                 // This requires finding the 'local-' entry and changing its appearance
            })
            .always(function() {
                 // Hide loader if it's still visible for any reason
                 // $("#loader").addClass("d-none"); // Already handled in done/fail usually
            });


        // 3. Notification
        if ("Notification" in window && Notification.permission === "granted") {
            new Notification("Draw Recorded", { /* ... */ });
        }

        // 4. Perform partial reset (same as session mode now)
         $("#extendedMode").prop("checked", false);
         maxValue = 20;
         $("#slider-container").addClass("d-none");
         $("#preset-buttons-container").removeClass("d-none");
         crestValue = minValue;
         $("#crestValue").text(minValue);
         $(".preset-crest-btn").removeClass('active');
         if (ctx) { drawRing(minValue); }
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
          $(".preset-crest-btn").removeClass('active'); // --- ADD THIS LINE ---
          if (ctx) {
              drawRing(minValue);
          }
          $(".draw-option").removeClass('active'); 
      }
  });

//===================== SYNC SESSION ENTRIES =====================
$("#sync-session-entries").click(function() {
    if (sessionEntries.length === 0) {
        console.log("No session entries to sync.");
        return;
    }

    const $syncButton = $(this);
    const $loader = $("#loader");
    const entriesToSync = [...sessionEntries]; // Copy array to avoid issues if sessionEntries is modified during async operations

    $syncButton.prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i> Syncing...');
    $loader.removeClass("d-none"); // Show global loader during sync

    let promises = entriesToSync.map(entry => {
        // Pass data needed by the sheet script
         return submitEntryToSheet({
             diamond: entry.diamond,
             crests: entry.crests,
             timestamp: entry.timestamp, // Ensure timestamp is included
             User: entry.User
         })
         // IMPORTANT: Attach temporary ID to success/failure for tracking
         .then(response => ({ status: 'fulfilled', value: response, tempId: entry.tempId }))
         // Need to catch potential network errors or script errors from the ajax call itself
         .catch(error => {
             console.error("AJAX Error for entry:", entry.tempId, error);
             // Return a specific structure indicating rejection, including tempId
             // Use the original entry or just tempId for identification
             return { status: 'rejected', reason: error, tempId: entry.tempId };
          });
    });

    Promise.allSettled(promises)
        .then(results => {
            console.log("Sync results:", results);
            let successfullySyncedTempIds = []; // Store tempIds of successful ones
            let failedEntries = [];             // Store full entry objects of failed ones

            results.forEach(result => {
                if (result.status === 'fulfilled') {
                    // Assuming result.value structure is good if fulfilled
                    successfullySyncedTempIds.push(result.value.tempId);
                    // Optional: Update UI for this specific item temporarily if needed
                    // $(`#session-entries-list .session-entry-card[data-tempid="${result.value.tempId}"]`).addClass('synced-briefly');
                } else {
                    // Status is 'rejected'
                    console.error(`Sync failed for entry tempId ${result.reason.tempId}:`, result.reason);
                    // Find the original entry object using the tempId stored in the reason object
                    let failedEntry = entriesToSync.find(e => e.tempId === result.reason.tempId);
                    if (failedEntry) {
                        failedEntries.push(failedEntry); // Keep the whole object for retry/display
                        // Mark the failed item in the session list UI
                        $(`#session-entries-list .session-entry-card[data-tempid="${result.reason.tempId}"] .sync-status-icon`)
                          .html('<i class="fa-solid fa-triangle-exclamation text-danger" title="Sync Failed"></i>');
                    } else {
                         console.error("Could not find original entry for failed tempId:", result.reason.tempId);
                    }
                }
            });

            // Update the main sessionEntries array: keep only failed ones
            sessionEntries = failedEntries;

            // --- SAVE remaining (failed) entries back to localStorage ---
            localStorage.setItem(SESSION_ENTRIES_KEY, JSON.stringify(sessionEntries));
            // -----------------------------------------------------------

            // Re-render the session list (will now only show failed ones, if any)
            renderSessionList(); // This also updates the badge

            // If *any* entries succeeded, fetch fresh data for history/stats
            if (successfullySyncedTempIds.length > 0) {
                console.log(`${successfullySyncedTempIds.length} entries synced successfully.`);
                // Fetch remote data AFTER processing all sync results
                fetchRemoteData(() => {
                    updateHistory();
                    updateStats();
                    updateCompare();
                    $loader.addClass("d-none"); // Hide loader after fetch completes
                    // Reset button state (badge reflects remaining failed entries count)
                    $syncButton.prop('disabled', false).html(`<i class="fa-solid fa-cloud-arrow-up"></i> Sync <span id="session-count-badge" class="badge bg-light text-dark ms-1">${sessionEntries.length}</span>`);

                    // --- Check if ALL originally attempted entries synced successfully ---
                     if (failedEntries.length === 0) { // This check is now inside the fetch callback if successes occurred
                          console.log("All session entries synced successfully.");
                          // Clear the storage key as the session is now definitively empty
                          localStorage.removeItem(SESSION_ENTRIES_KEY); // <<< Explicitly clear if fully successful

                           // Optional: Auto-end session mode
                           // if (inSessionMode) {
                           //      $("#toggle-session-mode").click(); // This handles removing SESSION_MODE_KEY too
                           // }
                     }
                    // --- End Check for Full Success ---

                });
            } else if (failedEntries.length > 0) {
                // Only failures occurred, no need to fetchRemoteData
                alert(`Sync failed for ${failedEntries.length} entries. Please check console and try again.`);
                $loader.addClass("d-none"); // Hide loader
                $syncButton.prop('disabled', false).html(`<i class="fa-solid fa-cloud-arrow-up"></i> Sync <span id="session-count-badge" class="badge bg-light text-dark ms-1">${sessionEntries.length}</span>`); // Reset button state
            } else {
                // No entries were processed initially (should be caught at the start)
                // Or somehow results array was empty
                 $loader.addClass("d-none");
                 $syncButton.prop('disabled', false).html(`<i class="fa-solid fa-cloud-arrow-up"></i> Sync <span id="session-count-badge" class="badge bg-light text-dark ms-1">0</span>`);
            }

        }); // End Promise.allSettled.then
}); // End sync button click handler
  //===================== RENDER SESSION LIST =====================
function renderSessionList() {
    let sessionList = $("#session-entries-list");
    sessionList.empty(); // Clear current list

    if (sessionEntries.length === 0) {
        // Use text-white or text-light depending on your background
        sessionList.html('<p class="text-light text-center small mt-2 mb-0">No draws added in this session yet.</p>');
    } else {
        // Reverse the array temporarily for display order (newest first)
        // Or keep as is for oldest first - adjust slice/reverse as needed
        let reversedSessionEntries = [...sessionEntries].reverse();

        reversedSessionEntries.forEach(entry => {
            // Generate text/icon for draw type (cost)
            let diamondDisplayHtml = (entry.diamond === 0) ?
                `<img src="assets/mystical_dial.png" class="small-icon me-1" alt="Free Draw"> Free` :
                `${entry.diamond} <img class='small-icon mx-1' src='assets/diamond.png' alt='Diamond'>`;

            // Generate text/icon for crests earned
            let crestDisplayHtml = `${entry.crests} <img src="assets/token.png" class="small-icon ms-1" alt="token">`;
            // Handle the "Prize Pool Item" case specifically if needed
            if (entry.diamond > 0 && entry.crests === 0) { // Example condition: Spent diamonds but got 0 crests could mean prize pool
                // Or use the Prize Pool button value if that's always 0 crests:
                // if (entry.crests === 0 && entry.diamond === /* value of prize pool button if non-zero */ )
                // This check might need refinement based on how you definitively log prize pool items
                crestDisplayHtml = `<img src="assets/prize_pool_item.png" class="small-icon ms-1" alt="Prize Pool Item">`;
            }


            // Determine sync status icon
            let syncIconHtml = entry.synced ? // (This will usually be false here)
                 '<span class="sync-status-icon" title="Synced"><i class="fa-solid fa-check text-success"></i></span>' :
                 '<span class="sync-status-icon" title="Pending Sync"><i class="fa-solid fa-clock text-warning"></i></span>';

            // Construct the list item HTML - **Corrected template literals and structure**
            let listItem = `
                <div class="list-group-item session-entry-card" data-tempid="${entry.tempId}">
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="entry-details d-flex align-items-center flex-grow-1"> ${diamondDisplayHtml}
                            <i class="fa-solid fa-arrow-right text-muted mx-2"></i> ${crestDisplayHtml}
                        </span>
                        ${syncIconHtml} </div>
                </div>`;
            sessionList.append(listItem);
        });
    }
    // Update badge count outside the loop
    $("#session-count-badge").text(sessionEntries.length);
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

});