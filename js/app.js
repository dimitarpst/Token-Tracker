$(document).ready(function() {
  // --- START Event Configuration ---
  const eventConfigs = {
    "neobeasts": {
      eventName: "NeoBeasts",
      logo: "assets/neobeasts/neobeasts_logo.png", // Corrected path
      backgroundImage: "assets/neobeasts/lylia_fredrinn_selfie.jpg", // Corrected path
      themeClass: "neobeasts-event",
      mitkoIcon: "assets/neobeasts/fredrinn.png", // Specific user icon
      aylinIcon: "assets/neobeasts/lylia.png",    // Specific user icon
      mysticalDialIcon: "assets/neobeasts/mystical_dial.png", // Specific free draw icon
      tokenIcon: "assets/neobeasts/token.png",
      prizePoolItemIcon: "assets/neobeasts/prize_pool_item.png",
      otherDrawIcon: "assets/neobeasts/other_draw.png",
      targetTokens: 1200 // Example: Target for Neobeasts
    },
    "naruto": {
      eventName: "Naruto Collab",
      logo: "assets/naruto/naruto_logo.svg", // Path from your structure
      backgroundImage: "assets/naruto/background.png", // Path from your structure
      themeClass: "naruto-event",
      mitkoIcon: "assets/naruto/suyou.png",     // Specific user icon (Sasuke)
      aylinIcon: "assets/naruto/kalea.png",     // Specific user icon (Sakura)
      mysticalDialIcon: "assets/naruto/scroll_of_flame.png", // Specific free draw icon
      tokenIcon: "assets/naruto/token.png", // Assuming themed token icon exists
      prizePoolItemIcon: "assets/naruto/prize_pool_item.png", // Assuming themed item icon exists
      otherDrawIcon: "assets/naruto/other_draw.png", // Assuming themed icon exists
      targetTokens: 1200 // Example: Different target for Naruto
    }
    // Add future events here...
  };

  const EVENT_STORAGE_KEY = 'drawTrackerCurrentEvent';
  // Load the last selected event, default to 'neobeasts' if none is stored
  let currentEventKey = localStorage.getItem(EVENT_STORAGE_KEY) || "neobeasts";
  // Ensure the loaded key is valid, otherwise default
  if (!eventConfigs[currentEventKey]) {
      currentEventKey = "neobeasts";
      localStorage.setItem(EVENT_STORAGE_KEY, currentEventKey); // Save default if invalid key was stored
  }
  let currentConfig = eventConfigs[currentEventKey];
  // console.log(`Current Event Config Loaded: ${currentConfig.eventName}`);
  // --- END Event Configuration ---

  // --- START Default/Shared Assets & Helper ---
  // Define paths for assets potentially shared across events or as fallbacks
  const SHARED_ASSETS = {
      diamond: "assets/diamond.png" // Diamond icon seems shared based on structure
      // Add other truly shared assets here if any
  };

  // Helper function to get asset path:
  // 1. Checks event config for specific asset
  // 2. Checks shared assets
  // 3. Returns a default/placeholder if not found (optional)
  function getAsset(assetName) {
      // assetName should match keys in eventConfigs (e.g., 'logo', 'tokenIcon', 'mitkoIcon')
      // or keys in SHARED_ASSETS (e.g., 'diamond')
      if (currentConfig && currentConfig[assetName]) {
          return currentConfig[assetName];
      } else if (SHARED_ASSETS[assetName]) {
          return SHARED_ASSETS[assetName];
      } else {
          console.warn(`Asset type '${assetName}' not found in current event config ('${currentEventKey}') or shared assets. Returning placeholder path.`);
          // Return a default placeholder or handle the error appropriately
          return "assets/other_draw.png"; // Example placeholder
      }
  }
  // --- END Default/Shared Assets & Helper ---


  // The rest of your variables from the previous version...
  let url_tracker = "https://script.google.com/macros/s/AKfycbw5zf6W7KeeYmYcSzc_s96kg6oJVdmak0tnj_Pr0pbCO6CadaAHEFcUL3ZH9Jm-1ZSy/exec";

  if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().then(function(permission) {
          // console.log("Notification permission: " + permission);
      });
  }

  let inTenDrawMode = false;
  let tenDrawCounter = 0;
  let tenDrawDiamondCost = 0;
  let tenDrawTimestamp = null;
  let tenDrawBatchId = null;
  window.myChart = null;
  window.myPieChart = null;
  window.myLineChart = null;
  window.myHistChart = null;
  window.myTierChart = null;

  let holdTimer = null;
  const HOLD_DURATION = 750;
  let localData = { Mitko: [], Aylin: [] };
  let currentUser = localStorage.getItem("currentUser");
  let currentDiamond = null;
  let inSessionMode = false;
  let sessionEntries = [];
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
  const LAST_ACTIVE_TAB_KEY = 'drawTrackerLastActiveTab';

  // Initial setup checks (welcome screen or init user)
  if (!currentUser) {
      $("#welcome-screen").removeClass("d-none");
      $("#main-app").addClass("d-none");
  } else {
      // initUser will be called below, no need to call it here twice
      $("#welcome-screen").addClass("d-none");
      // initUser handles showing main-app after data fetch
  }

  //===================== USER SELECTION =====================
  // No changes needed in this section itself
  $(".choose-user").click(function() {
      currentUser = $(this).data("user");
      localStorage.setItem("currentUser", currentUser);

      $("#welcome-screen").fadeOut(300, function() {
          $(this).addClass("d-none");
          initUser(currentUser);
      });
  });

  
//===================== INIT USER =====================
function initUser(user) {
    // --- Event Setup (Load config based on stored key) ---
    currentEventKey = localStorage.getItem(EVENT_STORAGE_KEY) || "neobeasts";
    if (!eventConfigs[currentEventKey]) { // Validate stored key
        currentEventKey = "neobeasts";
        localStorage.setItem(EVENT_STORAGE_KEY, currentEventKey);
    }
    currentConfig = eventConfigs[currentEventKey];
    // console.log(`Initializing for User: ${user}, Event: ${currentConfig.eventName} (${currentEventKey})`);

    // --- Apply Event Theme & User Class ---
    const allThemeClasses = Object.values(eventConfigs).map(config => config.themeClass).join(' ');
    $("body").removeClass(allThemeClasses + " mitko aylin");
    $("body").addClass(currentConfig.themeClass + " " + user.toLowerCase());

    // --- User Visual Setup ---
    currentUser = user; // Set global currentUser
    let mitkoIconPath = getAsset('mitkoIcon');
    let aylinIconPath = getAsset('aylinIcon');
    let charImg = (user === "Mitko") ? mitkoIconPath : aylinIconPath;

    $("#settings-current-user-img").attr("src", charImg);
    $("#navbar-current-user-img").attr("src", charImg);
    if ($("#character-image").length) { $("#character-image").attr("src", charImg); }

    // *** ADDED: Set icons for Daily Summary screen ***
    $("#summary-mitko-icon").attr("src", mitkoIconPath);
    $("#summary-aylin-icon").attr("src", aylinIconPath);
    // *** END ADDED ***

    // --- Update Event Specific UI Elements ---
    $("#event-logo").attr("src", getAsset('logo'));
    $("#nav-logo").attr("src", getAsset('logo'));

    // --- Define User & Event Specific Storage Keys ---
    const userSessionModeKey = `drawTrackerSessionMode_${currentUser}_${currentEventKey}`;
    const userSessionEntriesKey = `drawTrackerSessionEntries_${currentUser}_${currentEventKey}`;
    const user10xActiveKey = `drawTracker10xModeActive_${currentUser}_${currentEventKey}`;
    const user10xCounterKey = `drawTracker10xCounter_${currentUser}_${currentEventKey}`;
    const user10xCostKey = `drawTracker10xCost_${currentUser}_${currentEventKey}`;
    const user10xTimestampKey = `drawTracker10xTimestamp_${currentUser}_${currentEventKey}`;
    const user10xBatchIdKey = `drawTracker10xBatchId_${currentUser}_${currentEventKey}`;

    // --- Load and Restore Session State ---
    try {
        const savedSessionMode = localStorage.getItem(userSessionModeKey) === 'true';
        const savedSessionEntries = JSON.parse(localStorage.getItem(userSessionEntriesKey) || '[]');
        if (savedSessionMode && Array.isArray(savedSessionEntries)) {
            // console.log(`Restoring previous session state for ${currentUser} (${currentEventKey})...`);
            inSessionMode = true;
            sessionEntries = savedSessionEntries;
            $("#toggle-session-mode").addClass('active').html('<i class="fa-solid fa-circle-stop"></i> End Session Entry');
            $("#session-entries-container").removeClass("d-none");
            renderSessionList();
        } else {
            // console.log(`No active session found for ${currentUser} (${currentEventKey}).`);
            inSessionMode = false; sessionEntries = [];
            localStorage.removeItem(userSessionModeKey);
            localStorage.removeItem(userSessionEntriesKey);
            $("#toggle-session-mode").removeClass('active').html('<i class="fa-solid fa-bolt"></i> Start Session Entry');
            $("#session-entries-container").addClass("d-none");
            renderSessionList();
        }
    } catch (e) {
        console.error(`Error loading session state for ${currentUser} (${currentEventKey}) from localStorage:`, e);
        inSessionMode = false; sessionEntries = [];
        localStorage.removeItem(userSessionModeKey); localStorage.removeItem(userSessionEntriesKey);
        $("#toggle-session-mode").removeClass('active').html('<i class="fa-solid fa-bolt"></i> Start Session Entry');
        $("#session-entries-container").addClass("d-none");
        renderSessionList();
    }

    // --- Load and Restore 10x Draw State ---
    try {
        if (localStorage.getItem(user10xActiveKey) === 'true') {
            // console.log(`Restoring active 10x draw state for ${currentUser} (${currentEventKey})...`);
            inTenDrawMode = true;
            tenDrawCounter = parseInt(localStorage.getItem(user10xCounterKey) || '0');
            tenDrawDiamondCost = parseInt(localStorage.getItem(user10xCostKey) || '0');
            tenDrawTimestamp = parseInt(localStorage.getItem(user10xTimestampKey) || Date.now());
            tenDrawBatchId = localStorage.getItem(user10xBatchIdKey) || `10x-${tenDrawTimestamp}`;

            $("#selected-draw-label").text(`Enter Result ${tenDrawCounter + 1} / 10 for ${tenDrawDiamondCost}💎 Draw`);
            $("#draw-type-icon").attr("src", getAsset('diamond'));
            $('.draw-option').removeClass('active');
            $(`.draw-option[data-diamond="${tenDrawDiamondCost}"]`).addClass('active');
            $("#preset-buttons-container").removeClass("d-none");
            $("#slider-container").addClass("d-none");
            $("#extendedMode").prop("checked", false);
            $("#submit-draw").prop("disabled", true);

        } else {
            inTenDrawMode = false; tenDrawCounter = 0; tenDrawDiamondCost = 0;
            tenDrawTimestamp = null; tenDrawBatchId = null;
             localStorage.removeItem(user10xActiveKey); localStorage.removeItem(user10xCounterKey);
             localStorage.removeItem(user10xCostKey); localStorage.removeItem(user10xTimestampKey);
             localStorage.removeItem(user10xBatchIdKey);
        }
    } catch(e) {
        console.error(`Error loading 10x state for ${currentUser} (${currentEventKey}) from localStorage:`, e);
        inTenDrawMode = false;
        localStorage.removeItem(user10xActiveKey); localStorage.removeItem(user10xCounterKey);
        localStorage.removeItem(user10xCostKey); localStorage.removeItem(user10xTimestampKey);
        localStorage.removeItem(user10xBatchIdKey);
    }

    // --- Set Initial Active Tab ---
    let initialTabId = localStorage.getItem(LAST_ACTIVE_TAB_KEY);
    const validTabIds = ['home', 'history', 'stats', 'compare', 'settings'];
    const defaultTabId = 'home';
    if (!initialTabId || !validTabIds.includes(initialTabId)) {
        initialTabId = defaultTabId;
        localStorage.setItem(LAST_ACTIVE_TAB_KEY, initialTabId);
    }
    // console.log(`Restoring last active tab: ${initialTabId}`);
    $(".tab-content").addClass("d-none");
    $("#tab-" + initialTabId).removeClass("d-none");
    $("#sidebar .nav-link").removeClass('active');
    $(`#sidebar .nav-link[data-tab='${initialTabId}']`).addClass('active');

    // --- Reset draw input state ONLY IF NOT in restored 10x mode ---
    if (!inTenDrawMode) {
         // console.log("Resetting draw input area (not in 10x mode)");
         const radialCanvas = document.getElementById("radialSlider");
         let ctx = radialCanvas ? radialCanvas.getContext("2d") : null;
         maxValue = 20; crestValue = minValue;
         $("#crestValue").text(crestValue);
         if (ctx) { drawRing(minValue); }
         $("#extendedMode").prop("disabled", false).prop("checked", false);
         $("#slider-container").addClass("d-none");
         $("#preset-buttons-container").removeClass("d-none");
         $(".preset-crest-btn").removeClass('active');
         currentDiamond = null;
         $(".draw-option").removeClass('active');
         $("#selected-draw-label").text("");
         $("#draw-type-icon").attr("src", getAsset('otherDrawIcon'));
         $("#submit-draw").prop("disabled", true);
    }
     // --- Initialize components that need asset paths on load ---
     $('#draw-options .draw-option[data-diamond="0"] img').attr('src', getAsset('mysticalDialIcon'));
     $('#draw-options .draw-option[data-diamond="25"] img').attr('src', getAsset('diamond'));
     $('#draw-options .draw-option[data-diamond="50"] img').attr('src', getAsset('diamond'));
     $('#draw-options .draw-option[data-diamond="450"] img').attr('src', getAsset('diamond'));
     $('#draw-options .draw-option[data-diamond="500"] img').attr('src', getAsset('diamond'));
     $('#preset-buttons-container img.small-icon[alt="token"]').attr('src', getAsset('tokenIcon'));
     $('#preset-buttons-container img.small-icon[alt="Prize Pool"]').attr('src', getAsset('prizePoolItemIcon'));
     $('#slider-container img.small-icon[alt="Token"]').attr('src', getAsset('tokenIcon'));

    // --- Fetch remote data THEN decide which screen to show ---
    fetchRemoteData(() => {
        const todayStr = getTodayDateString();
        const hideUntilDate = localStorage.getItem('hideDailySummaryUntil');

        if (hideUntilDate === todayStr) {
            // console.log("Daily summary hidden for today.");
            $("#loader").addClass("d-none");
            $("#main-app").hide().removeClass("d-none").fadeIn(300);
        } else {
            const todaysInfo = calculateTodaysDrawsAndDiscount(localData);

            $("#mitko-today-count").text(todaysInfo.mitkoTotal);
            $("#aylin-today-count").text(todaysInfo.aylinTotal);

            const mitkoDiscountEl = $("#mitko-daily-discount");
            if (todaysInfo.mitkoDiscountCrests !== null) {
                mitkoDiscountEl.html(`Daily 25💎: <span class="fw-bold">${todaysInfo.mitkoDiscountCrests}</span> <img src="${getAsset('tokenIcon')}" class="small-icon" alt="token">`);
                mitkoDiscountEl.removeClass('text-muted').addClass('text-dark');
            } else {
                mitkoDiscountEl.html('Daily 25💎: <span class="fw-normal">Not done</span>');
                mitkoDiscountEl.removeClass('text-dark').addClass('text-muted');
            }

            const aylinDiscountEl = $("#aylin-daily-discount");
            if (todaysInfo.aylinDiscountCrests !== null) {
                 aylinDiscountEl.html(`Daily 25💎: <span class="fw-bold">${todaysInfo.aylinDiscountCrests}</span> <img src="${getAsset('tokenIcon')}" class="small-icon" alt="token">`);
                 aylinDiscountEl.removeClass('text-muted').addClass('text-dark');
            } else {
                 aylinDiscountEl.html('Daily 25💎: <span class="fw-normal">Not done</span>');
                 aylinDiscountEl.removeClass('text-dark').addClass('text-muted');
            }

            $("#loader").addClass("d-none");
            // console.log("Showing daily summary screen.");
            $("#daily-summary-screen").hide().removeClass("d-none").fadeIn(300);
        }

        // Update the data for the hidden tabs
        updateHistory();
        updateStats();
        updateCompare();
        // Re-set preset icons just in case
        $('#preset-buttons-container img.small-icon[alt="token"]').attr('src', getAsset('tokenIcon'));
        $('#preset-buttons-container img.small-icon[alt="Prize Pool"]').attr('src', getAsset('prizePoolItemIcon'));

    }); // End of fetchRemoteData callback
} // End initUser function
  

  //===================== FETCH REMOTE DATA =====================
  function fetchRemoteData(callback) {
    $("#loader").removeClass("d-none");

    // The backend doGet now fetches all data, including the Event column
    let fetchUrl = url_tracker;

    $.ajax({
        url: fetchUrl,
        method: "GET",
        dataType: "jsonp",
        // jsonpCallback: "callback", // Use default generated by jQuery unless specific required
        timeout: 15000, // 15 seconds
        success: function(data) {
            // Reset local data completely before populating
            localData = { Mitko: [], Aylin: [] };
            let parseErrors = 0;
            // console.log(`Fetched ${data?.length || 0} total entries from sheet.`);

            // No client-side filtering needed here anymore IF doGet fetches all.
            // We'll filter within updateHistory/Stats/Compare if needed.
            (data || []).forEach(entry => {
                // Basic validation
                if (entry && entry.User && localData[entry.User] !== undefined && entry.Timestamp && entry.Entry_Id) { // Ensure essential fields exist
                    let timestampMs = Date.parse(entry.Timestamp);
                    if (isNaN(timestampMs)) {
                         timestampMs = Number(entry.Timestamp); // Try direct number conversion
                         if (isNaN(timestampMs) || !isFinite(timestampMs)) { // Check if still invalid
                              console.warn(`Invalid timestamp format for entry ID ${entry.Entry_Id}:`, entry.Timestamp);
                              parseErrors++;
                              return; // Skip entry if timestamp is unusable
                         }
                    }

                     const parsed = {
                         id: entry.Entry_Id, // Use ID directly from sheet
                         diamond: parseInt(entry.Diamonds) || 0,
                         crests: parseInt(entry.Crests) || 0,
                         // date: entry.Date, // We use timestamp primarily
                         timestamp: timestampMs,
                         user: entry.User,
                         batchId: entry.Batch_Id || entry.batchId || null, // Check common variations
                         // Get Event field, default to neobeasts if missing/null/empty
                         event: entry.Event || "neobeasts"
                     };

                    localData[entry.User].push(parsed);
                } else {
                    // Log reasons for skipping
                    if (!entry || !entry.User) console.warn("Skipping entry with missing User:", entry);
                    else if (localData[entry.User] === undefined) console.warn("Skipping entry for unknown user:", entry);
                    else if (!entry.Timestamp) console.warn("Skipping entry with missing Timestamp:", entry);
                    else if (!entry.Entry_Id) console.warn("Skipping entry with missing Entry_Id:", entry);
                     parseErrors++;
                }
            });

            // Sort data after parsing
            localData.Mitko.sort((a, b) => b.timestamp - a.timestamp);
            localData.Aylin.sort((a, b) => b.timestamp - a.timestamp);

            // console.log(`Parsed data - Mitko: ${localData.Mitko.length}, Aylin: ${localData.Aylin.length}`);
            if (parseErrors > 0) { console.warn(`Data parsing errors encountered: ${parseErrors}`); }

            $("#loader").addClass("d-none");
            if (callback) { callback(); } // Execute callback (usually to update UI)
        },
        error: function(jqXHR, textStatus, errorThrown) {
            console.error("Fetch Error:", textStatus, errorThrown);
            alert("Error fetching data from the server. Please check connection/script URL.");
            $("#loader").addClass("d-none");
            // Optionally execute callback even on error if UI should update with empty/stale data
            // if (callback) { callback(); }
        }
    });
} // End fetchRemoteData



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

  $("#change-user").click(function() {
    // Consider clearing the selected event when changing user? Optional.
    // localStorage.removeItem(EVENT_STORAGE_KEY);
    localStorage.removeItem("currentUser");
    location.reload(); // Reload to go back to user selection
});

$("#reset-data").click(function() {
    // Confirmation message now includes the event name correctly via currentConfig
    if (confirm(`Reset LOCAL data for ${currentUser} for the ${currentConfig.eventName} event? (Google Sheet unaffected)`)) {
        if (currentUser && localData[currentUser]) {
            // Filter local data to only keep entries NOT matching current event for the user
            localData[currentUser] = localData[currentUser].filter(entry => entry.event !== currentEventKey);

            // Clear user-specific session and 10x state for the *current* event
            const userSessionModeKey = `drawTrackerSessionMode_${currentUser}_${currentEventKey}`;
            const userSessionEntriesKey = `drawTrackerSessionEntries_${currentUser}_${currentEventKey}`;
            const user10xActiveKey = `drawTracker10xModeActive_${currentUser}_${currentEventKey}`;
            const user10xCounterKey = `drawTracker10xCounter_${currentUser}_${currentEventKey}`;
            const user10xCostKey = `drawTracker10xCost_${currentUser}_${currentEventKey}`;
            const user10xTimestampKey = `drawTracker10xTimestamp_${currentUser}_${currentEventKey}`;
            const user10xBatchIdKey = `drawTracker10xBatchId_${currentUser}_${currentEventKey}`;
            localStorage.removeItem(userSessionModeKey);
            localStorage.removeItem(userSessionEntriesKey);
            localStorage.removeItem(user10xActiveKey);
            localStorage.removeItem(user10xCounterKey);
            localStorage.removeItem(user10xCostKey);
            localStorage.removeItem(user10xTimestampKey);
            localStorage.removeItem(user10xBatchIdKey);

            // Reset runtime state related to the current event's session/10x
            inSessionMode = false; sessionEntries = [];
            inTenDrawMode = false; tenDrawCounter = 0; tenDrawDiamondCost = 0; tenDrawTimestamp = null; tenDrawBatchId = null;

            // Update UI to reflect cleared data for the current event
            updateHistory(); // Will show only non-current event entries now
            updateStats();   // Will show stats based on remaining entries
            updateCompare(); // Will show comparison based on remaining entries
            renderSessionList(); // Will show empty session list
             $("#toggle-session-mode").removeClass('active').html('<i class="fa-solid fa-bolt"></i> Start Session Entry');
             $("#session-entries-container").addClass("d-none");

            alert(`Local data and session state for ${currentUser} (${currentConfig.eventName}) reset!`);
        } else {
            alert("No user selected or data empty.");
        }
    }
});

// Placeholder function for adding Event Selector (to be called later)
function setupEventSelector() {
      const selectorContainer = $('#event-selector-container'); // Assuming a div with this ID in Settings tab HTML
      if (!selectorContainer.length) {
           console.warn("Event selector container not found in Settings tab.");
           return; // Don't proceed if the container doesn't exist
      }

      // Create selector only if it doesn't exist
      if ($('#event-selector').length === 0) {
           selectorContainer.empty(); // Clear container first
           selectorContainer.append('<h5 class="text-light mt-4 mb-2">Select Event</h5>');
           const selector = $('<select id="event-selector" class="form-select"></select>');
           selectorContainer.append(selector);

           // Populate
           for (const key in eventConfigs) {
             selector.append(`<option value="${key}" ${key === currentEventKey ? 'selected' : ''}>${eventConfigs[key].eventName}</option>`);
           }

          // Attach listener
           selector.on('change', function() {
               const newEventKey = $(this).val();
               if (newEventKey !== currentEventKey) {
                    if (sessionEntries.length > 0 && inSessionMode) {
                         if (!confirm(`You have unsynced session entries for ${currentConfig.eventName}. Switching events will clear these unsynced entries. Continue?`)) {
                              // User cancelled, revert selector visually
                              $(this).val(currentEventKey);
                              return;
                          }
                          // Clear session state if user proceeds
                          const userSessionModeKey = `drawTrackerSessionMode_${currentUser}_${currentEventKey}`;
                          const userSessionEntriesKey = `drawTrackerSessionEntries_${currentUser}_${currentEventKey}`;
                          localStorage.removeItem(userSessionModeKey);
                          localStorage.removeItem(userSessionEntriesKey);
                          inSessionMode = false; sessionEntries = [];
                    }
                   localStorage.setItem(EVENT_STORAGE_KEY, newEventKey);
                   alert(`Switched to ${eventConfigs[newEventKey].eventName} event. Reloading app...`);
                   location.reload();
               }
           });
      } else {
          // Selector already exists, just ensure the correct option is selected (though reload usually handles this)
          $('#event-selector').val(currentEventKey);
      }
}

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

    // --- Check if currently in 10x mode ---
    if (inTenDrawMode) {
        // Ask user if they want to cancel the ongoing 10x entry
        if (confirm("You are in the middle of a 10x draw entry. Cancel the current 10x draw?")) {
            // User confirmed cancellation
            console.log("User cancelled ongoing 10x draw via draw option click.");
            resetInputFieldsFully(); // This clears 10x state and resets UI
        }
        // Whether they confirmed or cancelled the prompt, stop further processing of this click
        return;
    }
    // --- End 10x mode check ---

    // If not in 10x mode, proceed with selecting the new draw type:

    // Define user/event specific keys for 10x mode (only needed if starting a 10x)
    const user10xActiveKey = `drawTracker10xModeActive_${currentUser}_${currentEventKey}`;
    const user10xCounterKey = `drawTracker10xCounter_${currentUser}_${currentEventKey}`;
    const user10xCostKey = `drawTracker10xCost_${currentUser}_${currentEventKey}`;
    const user10xTimestampKey = `drawTracker10xTimestamp_${currentUser}_${currentEventKey}`;
    const user10xBatchIdKey = `drawTracker10xBatchId_${currentUser}_${currentEventKey}`;

    // --- Reset Input State ---
    $(".draw-option").removeClass('active');
    $(".preset-crest-btn").removeClass('active');
    crestValue = minValue; $("#crestValue").text(crestValue);
    if ($("#extendedMode").is(":checked")) {
      $("#extendedMode").prop("checked", false).trigger('change');
    }
    $("#submit-draw").prop("disabled", true); // Submit always disabled until crest selected

    // --- Process Selected Draw Type ---
    const diamond = parseInt($(this).data("diamond"));
    const isTenDraw = diamond === 450 || diamond === 500;
    $(this).addClass('active'); // Highlight button

    if (isTenDraw) {
        // === ENTERING 10x DRAW MODE ===
        console.log("10x Draw selected.");
        inTenDrawMode = true; // Set 10x flag
        tenDrawCounter = 0;
        tenDrawDiamondCost = diamond;
        tenDrawTimestamp = Date.now();
        tenDrawBatchId = `10x-${tenDrawTimestamp}`;
        currentDiamond = diamond;

        // --- Auto-start Session Mode if not already active ---
        if (!inSessionMode) {
              console.log("Not in session mode, auto-starting for 10x draw.");
              inSessionMode = true; // Set flag
              const userSessionModeKey = `drawTrackerSessionMode_${currentUser}_${currentEventKey}`;
              const userSessionEntriesKey = `drawTrackerSessionEntries_${currentUser}_${currentEventKey}`;
              localStorage.setItem(userSessionModeKey, 'true'); // Save state
              $("#toggle-session-mode").addClass('active').html('<i class="fa-solid fa-circle-stop"></i> End Session Entry');
              $("#session-entries-container").removeClass("d-none");
               try {
                  const storedEntries = JSON.parse(localStorage.getItem(userSessionEntriesKey) || '[]');
                  sessionEntries = Array.isArray(storedEntries) ? storedEntries : [];
               } catch (e) {
                   console.error("Error reading session entries on auto-start:", e);
                   sessionEntries = [];
               }
               renderSessionList();
               document.getElementById('session-entries-container')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        // --- End Auto-start Session Mode ---

        // Save 10x state to localStorage
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

        // Update input area UI for 10x mode
        $("#selected-draw-label").text(`Enter Result 1 / 10 for ${diamond}💎 Draw`);
        $("#draw-type-icon").attr("src", getAsset('diamond'));
        $("#preset-buttons-container").removeClass("d-none");
        $("#slider-container").addClass("d-none");
        $("#extendedMode").prop("disabled", false);
        $("#submit-draw").prop("disabled", true);

    } else {
        // === NORMAL DRAW TYPE SELECTED ===
        inTenDrawMode = false;
        currentDiamond = diamond;
        const label = (diamond === 0) ? "Free Draw" : `${diamond} Diamonds`;
        $("#selected-draw-label").text(label);
        $("#draw-type-icon").attr("src", diamond === 0 ? getAsset('mysticalDialIcon') : getAsset('diamond'));
        $("#extendedMode").prop("disabled", false);
        $("#submit-draw").prop("disabled", true);

        // Clear any stray 10x state from storage
        localStorage.removeItem(user10xActiveKey);
        localStorage.removeItem(user10xCounterKey);
        localStorage.removeItem(user10xCostKey);
        localStorage.removeItem(user10xTimestampKey);
        localStorage.removeItem(user10xBatchIdKey);
    }
}); // End ".draw-option".click

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

//===================== PRESET CREST BUTTONS / SLIDER INTERACTION =====================

  // Helper function to update crest value, UI elements, and enable submit
  function setCrestValue(value) {
    crestValue = value;
    $("#crestValue").text(crestValue); // Update text display (for slider)

    // Activate the corresponding preset button if value matches one
    $(".preset-crest-btn").removeClass('active'); // Deactivate all first
    $(`.preset-crest-btn[data-value="${value}"]`).addClass('active'); // Activate matching one

    // Draw ring if slider is currently visible
    if ($("#extendedMode").is(":checked") && ctx) {
        drawRing(crestValue);
    }

    // Enable submit button only if a draw type is also selected
    if (currentDiamond !== null || inTenDrawMode) {
       $("#submit-draw").prop("disabled", false);
    } else {
       $("#submit-draw").prop("disabled", true); // Keep disabled if no draw type selected
    }
}

// --- Click on preset buttons ---
$(document).on("click", ".preset-crest-btn", function() {
    // Don't allow click if no draw type selected (unless in 10x mode)
    if (currentDiamond === null && !inTenDrawMode) {
        alert("Please select a draw type first.");
        return;
    }

    const selectedValue = parseInt($(this).data("value"));
    setCrestValue(selectedValue); // Update value, UI, and enable submit

    // --- Handle 10x draw logic (if applicable) ---
    if (inTenDrawMode) {
        // This click counts as one entry submission for the 10x batch
         const userSessionEntriesKey = `drawTrackerSessionEntries_${currentUser}_${currentEventKey}`;
         const user10xActiveKey = `drawTracker10xModeActive_${currentUser}_${currentEventKey}`;
         const user10xCounterKey = `drawTracker10xCounter_${currentUser}_${currentEventKey}`;
         const user10xCostKey = `drawTracker10xCost_${currentUser}_${currentEventKey}`;
         const user10xTimestampKey = `drawTracker10xTimestamp_${currentUser}_${currentEventKey}`;
         const user10xBatchIdKey = `drawTracker10xBatchId_${currentUser}_${currentEventKey}`;

         tenDrawCounter++;
         // crestValue is already set by setCrestValue

         // *** ADD event: currentEventKey to the entry object ***
         let entry = {
             tempId: `session-${tenDrawTimestamp}-${tenDrawCounter}`,
             diamond: tenDrawDiamondCost, crests: crestValue,
             timestamp: tenDrawTimestamp, batchId: tenDrawBatchId,
             User: currentUser, synced: false,
             event: currentEventKey // <--- Added Event Key Here
         };
         // console.log(`Adding 10x result ${tenDrawCounter}/10 (Preset Click) (Entry Object):`, entry);

         sessionEntries.push(entry);
         try { // Save updated session list
             localStorage.setItem(userSessionEntriesKey, JSON.stringify(sessionEntries));
         } catch (e) { console.error("Error saving session entry to localStorage:", e); }

         renderSessionList(); // Update the session list display

         // Update the status label & 10x counter in storage if not finished
         if (tenDrawCounter < 10) {
             $("#selected-draw-label").text(`Enter Result ${tenDrawCounter + 1} / 10 for ${tenDrawDiamondCost}💎 Draw`);
             try { localStorage.setItem(user10xCounterKey, tenDrawCounter); } catch(e) {}

             // Briefly flash the clicked button
             $(this).addClass('active-flash');
             setTimeout(() => $(this).removeClass('active-flash'), 200);

             // Disable submit again, waiting for next preset click or slider interaction
             $("#submit-draw").prop("disabled", true);
             // Deactivate the button visually, ready for the next click
             $(".preset-crest-btn").removeClass('active');
             // Reset crest value conceptually for next input, but keep display until next click
             // crestValue = minValue; // Don't reset variable, just visual state above

         } else {
             // === FINISHED 10x DRAW (via preset click) ===
             alert(`Finished entering 10 results for ${tenDrawDiamondCost}💎 draw.`);
             resetInputFieldsFully(); // Full reset clears 10x mode and input state
         }
    }
    // For normal mode, setCrestValue already handled enabling submit. No 'else' needed.
});

// --- Interaction with radial slider (updates crestValue and enables submit) ---
// Renamed function slightly for clarity
function handleSliderInteractionUpdate(value) {
    // Allow slider interaction only if a draw type is selected or in 10x mode
    if (currentDiamond !== null || inTenDrawMode) {
        setCrestValue(value); // Update value, UI (incl. ring), and enable submit
    }
}

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

  // --- Submit entry data to Google Sheet ---
  function submitEntryToSheet(entry) {
    // Prepare data, including batchId and eventKey
    let dataToSend = {
        action: "add",
        diamond: entry.diamond,
        crests: entry.crests,
        timestamp: entry.timestamp, // Pass the original timestamp
        User: entry.User,
        batchId: entry.batchId || "",
        event: entry.event || currentEventKey // Ensure event key is sent
    };
    // console.log("Submitting to Sheet:", dataToSend); // Log data being sent

    return $.ajax({
        url: url_tracker,
        method: "POST",
        data: dataToSend,
        timeout: 20000 // 20 second timeout
    });
}

// --- Submit Button Click Handler ---
$("#submit-draw").click(function() {
    // Validation (already checks if draw type selected)
    // Check if crest value makes sense (e.g., not minValue unless 0 preset active)
     if (crestValue === minValue && !$(".preset-crest-btn[data-value='0']").hasClass('active')) {
          if (!confirm(`Record ${minValue} tokens?`)) { // Confirmation for 0 tokens
                return;
          }
     }

    // --- Handle 10x submission via Extended Mode (Slider submit) ---
    if (inTenDrawMode && $("#extendedMode").is(":checked")) {
        // (User/event specific keys defined earlier)
        const userSessionEntriesKey = `drawTrackerSessionEntries_${currentUser}_${currentEventKey}`;
        const user10xActiveKey = `drawTracker10xModeActive_${currentUser}_${currentEventKey}`;
        const user10xCounterKey = `drawTracker10xCounter_${currentUser}_${currentEventKey}`;
        // ... other 10x keys ...

        tenDrawCounter++;
        // crestValue is already set by slider interaction

        // *** ADD event: currentEventKey ***
        let entry = {
            tempId: `session-${tenDrawTimestamp}-${tenDrawCounter}`,
            diamond: tenDrawDiamondCost, crests: crestValue,
            timestamp: tenDrawTimestamp, batchId: tenDrawBatchId,
            User: currentUser, synced: false,
            event: currentEventKey // <--- Added Event Key Here
        };

        // console.log(`Adding 10x result ${tenDrawCounter}/10 via Extended Mode (Entry Object):`, entry);
        sessionEntries.push(entry);
        try { localStorage.setItem(userSessionEntriesKey, JSON.stringify(sessionEntries)); }
        catch (e) { console.error("Error saving session entry to localStorage:", e); }

        renderSessionList();

        if (tenDrawCounter < 10) { // If more entries needed for 10x
            $("#selected-draw-label").text(`Enter Result ${tenDrawCounter + 1} / 10 for ${tenDrawDiamondCost}💎 Draw`);
            try { localStorage.setItem(user10xCounterKey, tenDrawCounter); } catch(e) {}
            // Re-disable submit, waiting for next slider interaction/submit click
            $("#submit-draw").prop("disabled", true);
            // Consider resetting slider visual or value here? Maybe not, allow quick edits.
        } else { // Finished 10x draw
            alert(`Finished entering 10 results for ${tenDrawDiamondCost}💎 draw.`);
            resetInputFieldsFully(); // Full reset clears 10x mode and input state
        }
        return; // Stop further execution for this click
    } // --- End 10x Extended Mode Submit ---


    // --- Create entry object for Normal / Session Mode Single Entry ---
    // *** ADD event: currentEventKey ***
    let entryData = {
         diamond: currentDiamond, crests: crestValue,
         timestamp: Date.now(), User: currentUser,
         event: currentEventKey // <--- Added Event Key Here
    };


    if (inSessionMode) {
        // === SESSION MODE: Add to local list ===
        const userSessionEntriesKey = `drawTrackerSessionEntries_${currentUser}_${currentEventKey}`;
        let sessionEntry = {
             ...entryData, // Includes event key from entryData
             tempId: 'session-' + entryData.timestamp,
             synced: false,
             batchId: null
        };
        // console.log("Adding SINGLE entry to session:", sessionEntry);
        sessionEntries.push(sessionEntry);

        try { localStorage.setItem(userSessionEntriesKey, JSON.stringify(sessionEntries)); }
        catch (e) { console.error("Error saving session entry to localStorage:", e); alert("Warning: Could not save session data."); }

        renderSessionList();
        resetInputFieldsPartially(); // Reset crests/mode, keep draw type

    } else {
        // === NORMAL MODE: Add optimistically & submit to sheet ===
        let historyEntry = {
            ...entryData, // Includes event key from entryData
            id: 'local-' + entryData.timestamp,
            synced: false, // Mark as not synced yet
            syncFailed: false, // Add failure flag
            batchId: null
        };
        // console.log("Submitting directly:", historyEntry);

        // 1. Optimistic UI Update (Add to localData, update views)
        localData[currentUser].unshift(historyEntry);
        updateHistory(); updateStats(); updateCompare();

        // 2. Show loader & Submit to Sheet
        $("#loader").removeClass("d-none");
        submitEntryToSheet(entryData) // entryData includes event key
             .done(function(response) {
                 // console.log("Entry submitted successfully: ", response);
                  // Optional: Update the local entry with the real ID from response if needed
                  // let localEntry = localData[currentUser].find(e => e.id === historyEntry.id);
                  // if (localEntry && response.id) localEntry.id = response.id;
                 // Refetch ALL data to ensure consistency
                 fetchRemoteData(() => {
                     updateHistory(); updateStats(); updateCompare();
                     $("#loader").addClass("d-none");
                 });
             })
             .fail(function(jqXHR, textStatus, errorThrown) {
                 console.error("Submit Error:", textStatus, errorThrown);
                 alert("Error submitting draw. Entry added locally but not synced to Google Sheet.");
                 // Update the specific history entry visually to show failure
                 const failedEntryElement = $(`#history-list .history-card[data-entry-id='${historyEntry.id}']`);
                 if(failedEntryElement.length > 0) {
                      failedEntryElement.find('.sync-indicator')
                         .html('<i class="fa-solid fa-triangle-exclamation text-danger" title="Sync Failed"></i>')
                         .removeClass('text-muted text-success fa-sync fa-spin fa-check') // Clear other icons
                         .addClass('text-danger');
                      // Add failed class for potential styling
                       failedEntryElement.addClass('sync-failed');
                 }
                 // Mark the localData entry as failed for persistence until next fetch
                 let localEntry = localData[currentUser].find(e => e.id === historyEntry.id);
                 if (localEntry) localEntry.syncFailed = true;

                 $("#loader").addClass("d-none");
             });

         // 3. Notification (Use event name and dynamic token icon)
         if ("Notification" in window && Notification.permission === "granted") {
             new Notification(`${currentConfig.eventName} Draw Recorded`, {
                  body: `Gained ${entryData.crests} tokens!`,
                  icon: getAsset('tokenIcon') // Use current event token icon
              });
         }

         resetInputFieldsPartially(); // Reset crests/mode, keep draw type
    }
}); // --- End Submit Button Click Handler ---


// --- Cancel Button Click Handler ---
$("#cancel-draw").click(function() {
    // Confirmation logic is good, just uses the reset helper
    if (inTenDrawMode) {
         if (confirm("Cancel entering the current 10x draw results?")) {
             resetInputFieldsFully(); // Full reset cancels 10x mode
         }
    } else {
         // Check if any input was actually made before confirming cancel
         if (currentDiamond !== null || crestValue !== minValue || $("#extendedMode").is(":checked")) {
              if (confirm("Cancel current draw input?")) {
                  resetInputFieldsFully(); // Full reset clears selection
              }
         } else {
             // No input made, maybe do nothing or just visually deselect?
             // For simplicity, we can just call reset which handles all cases.
              resetInputFieldsFully();
         }
    }
}); // --- End Cancel Button Click Handler ---


// --- Input Field Reset Helper Functions ---
function resetInputFieldsPartially() {
    // Turns off extended mode (if on), resets crest value, buttons, slider visual
    $("#extendedMode").prop("checked", false).trigger('change');
    maxValue = 20;
    setCrestValue(minValue); // Resets value, presets, slider visual
    $("#submit-draw").prop("disabled", true); // Disable submit until new crest chosen
    // Keeps draw type active
}

function resetInputFieldsFully() {
    // Resets everything: draw type, crest value, modes, buttons, icons
    $(".draw-option").removeClass('active');
    currentDiamond = null;
    $("#selected-draw-label").text("");
    $("#draw-type-icon").attr("src", getAsset('otherDrawIcon')); // Use getAsset
    $("#extendedMode").prop("disabled", false).prop("checked", false).trigger('change');
    maxValue = 20;
    setCrestValue(minValue);
    $("#submit-draw").prop("disabled", true); // Disable submit

    // Clear 10x state from memory and localStorage (user/event specific)
    inTenDrawMode = false; tenDrawCounter = 0; tenDrawDiamondCost = 0; tenDrawTimestamp = null; tenDrawBatchId = null;
    const user10xActiveKey = `drawTracker10xModeActive_${currentUser}_${currentEventKey}`;
    const user10xCounterKey = `drawTracker10xCounter_${currentUser}_${currentEventKey}`;
    const user10xCostKey = `drawTracker10xCost_${currentUser}_${currentEventKey}`;
    const user10xTimestampKey = `drawTracker10xTimestamp_${currentUser}_${currentEventKey}`;
    const user10xBatchIdKey = `drawTracker10xBatchId_${currentUser}_${currentEventKey}`;
    localStorage.removeItem(user10xActiveKey); localStorage.removeItem(user10xCounterKey);
    localStorage.removeItem(user10xCostKey); localStorage.removeItem(user10xTimestampKey);
    localStorage.removeItem(user10xBatchIdKey);
}

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
        // console.log('Hold detected on:', tempId);
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

    // console.log('Attempting to delete session entry:', tempIdToDelete);

    // Find index in the array based on tempId
    const indexToDelete = sessionEntries.findIndex(entry => entry.tempId === tempIdToDelete);

    if (indexToDelete > -1) {
        // Remove from array
        sessionEntries.splice(indexToDelete, 1);
        // Update localStorage
        localStorage.setItem(SESSION_ENTRIES_KEY, JSON.stringify(sessionEntries));
        // Re-render the list (this will remove the item visually)
        renderSessionList();
        // console.log('Entry deleted, list updated.');
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
        // console.log('Hold detected on:', tempId); // Should log correct ID now
    }, HOLD_DURATION);

});

  //===================== SYNC SESSION ENTRIES (Sequential) =====================
  $("#sync-session-entries").click(async function() { // Added async keyword
    const userSessionEntriesKey = `drawTrackerSessionEntries_${currentUser}_${currentEventKey}`;
    const userSessionModeKey = `drawTrackerSessionMode_${currentUser}_${currentEventKey}`;

    if (sessionEntries.length === 0) {
        // console.log("No session entries to sync.");
        // Optionally disable button if empty?
        // $(this).prop('disabled', true);
        return;
    }

    const $syncButton = $(this);
    const $loader = $("#loader");
    let entriesToProcess = [...sessionEntries]; // Copy to iterate over safely
    let originalCount = sessionEntries.length;
    let successCount = 0;
    let failCount = 0; // Keep track of failures too
    let firstError = null;

    $syncButton.prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i> Syncing...');
    $loader.removeClass("d-none");
    // console.log(`Starting sequential sync for ${originalCount} entries (${currentConfig.eventName})...`);

    // Use a standard for loop for async/await compatibility if needed,
    // or manage promises if running in parallel (sequential is safer here)
    for (let i = 0; i < entriesToProcess.length; i++) {
        const entry = entriesToProcess[i];

        // *** ADDED CONSOLE LOG TO CHECK ENTRY ***
        // console.log(`Processing entry ${i + 1}/${originalCount} for sync:`, JSON.stringify(entry));
        if (!entry.event) {
            console.warn(`Entry is missing 'event' key! Defaulting to ${currentEventKey}`, entry);
            entry.event = currentEventKey; // Ensure event key exists before sending
        }
        // *** END ADDED CONSOLE LOG ***

        try {
            // Pass the individual entry to the submit function
            // submitEntryToSheet now includes the event key in its data payload
            const response = await submitEntryToSheet(entry);

            if (response && response.result === 'success') {
                // console.log(`Entry ${entry.tempId} synced successfully:`, response);
                successCount++;
                // Remove from the *main* sessionEntries array by tempId
                const indexToRemove = sessionEntries.findIndex(item => item.tempId === entry.tempId);
                if (indexToRemove > -1) {
                    sessionEntries.splice(indexToRemove, 1);
                }
                // Update localStorage immediately after successful sync and removal
                localStorage.setItem(userSessionEntriesKey, JSON.stringify(sessionEntries));
                // Update the UI list immediately
                renderSessionList();

            } else {
                // Handle script-reported errors (e.g., result: "error" or result: "not_found")
                console.error(`Sync failed for entry ${entry.tempId} (Apps Script Error):`, response);
                failCount++;
                if (!firstError) firstError = response || { message: "Unknown script error" };
                // Mark UI element as failed - find the specific card and update its icon
                 const $card = $(`#session-entries-list .session-entry-card[data-tempid="${entry.tempId}"]`);
                 if ($card.length) {
                      $card.find('.sync-status-icon')
                          .html('<i class="fa-solid fa-triangle-exclamation text-danger" title="Sync Failed - Script Error"></i>');
                      $card.addClass('sync-failed'); // Add class for potential styling
                 }
                // Should we stop on first error or try all? Let's try all for now.
                // break; // Uncomment this line to stop syncing on the first script error
            }

        } catch (error) { // Catch AJAX/Network errors
            console.error(`Sync failed for entry ${entry.tempId} (AJAX/Network Error), stopping sync process:`, error);
            failCount++;
            if (!firstError) firstError = error;
            // Mark UI element as failed
             const $card = $(`#session-entries-list .session-entry-card[data-tempid="${entry.tempId}"]`);
             if ($card.length) {
                  $card.find('.sync-status-icon')
                      .html('<i class="fa-solid fa-triangle-exclamation text-danger" title="Sync Failed - Network/Script Error"></i>');
                  $card.addClass('sync-failed'); // Add class for potential styling
             }
            // Definitely stop on network errors
            break;
        }
    } // End loop

    // console.log(`Sync finished. Success: ${successCount}, Failed: ${failCount}, Remaining: ${sessionEntries.length}.`);

    // --- Post-Sync Actions ---
    // Final update to localStorage with remaining (failed) entries
    localStorage.setItem(userSessionEntriesKey, JSON.stringify(sessionEntries));
    // Final UI update
    renderSessionList(); // Reflects remaining entries

    // Function to handle UI updates after sync completes
    const finalizeSyncUI = () => {
        $loader.addClass("d-none");
        $syncButton.prop('disabled', false).html(`<i class="fa-solid fa-cloud-arrow-up"></i> Sync <span id="session-count-badge" class="badge bg-light text-dark ms-1">${sessionEntries.length}</span>`);

        if (sessionEntries.length === 0 && failCount === 0) { // All succeeded
            // console.log("All pending session entries synced successfully.");
            alert("All session entries synced successfully!");
            localStorage.removeItem(userSessionEntriesKey); // Clear storage key if empty
            // Optionally turn off session mode if it was on and now empty
            if (inSessionMode) {
                $("#toggle-session-mode").removeClass('active').html('<i class="fa-solid fa-bolt"></i> Start Session Entry');
                localStorage.removeItem(userSessionModeKey);
                inSessionMode = false; // Update state variable
                // Keep container visible briefly or hide? Hide for now.
                 $("#session-entries-container").addClass("d-none");
            }
        } else if (failCount > 0) { // Some failures occurred
             alert(`Sync process completed. ${successCount} succeeded, ${failCount} failed. Failed entries remain.`);
        } else {
              // This case implies loop finished, no successes, no failures? Should be rare.
              // console.log("Sync process finished with no changes?");
        }
    };

    // Fetch remote data IF at least one entry was successfully synced
    if (successCount > 0) {
        fetchRemoteData(() => {
            updateHistory(); updateStats(); updateCompare();
            finalizeSyncUI(); // Update UI after data fetch
        });
    } else {
        // No successes, just finalize UI
        finalizeSyncUI();
    }

}); // End sync button click handler
//===================== RENDER SESSION LIST =====================
function renderSessionList() {
    let sessionList = $("#session-entries-list");
    sessionList.empty(); // Clear current list first

    // Update badge count (user/event specific list)
    $("#session-count-badge").text(sessionEntries.length);

    // Show message if list is empty
    if (sessionEntries.length === 0) {
        sessionList.html('<p class="text-light text-center small mt-2 mb-0">No draws added in this session yet.</p>');
        // Make sure sync button reflects zero count if needed
         $("#sync-session-entries").html(`<i class="fa-solid fa-cloud-arrow-up"></i> Sync <span id="session-count-badge" class="badge bg-light text-dark ms-1">0</span>`);

    } else {
         // Update sync button text with current count
         $("#sync-session-entries").html(`<i class="fa-solid fa-cloud-arrow-up"></i> Sync <span id="session-count-badge" class="badge bg-light text-dark ms-1">${sessionEntries.length}</span>`);

        // Display newest first
        let reversedSessionEntries = [...sessionEntries].reverse();

        reversedSessionEntries.forEach(entry => {
            const tempIdValue = String(entry.tempId || ''); // Ensure tempId is treated as a string

            // Use getAsset() for icons
            let diamondDisplayHtml = (entry.diamond === 0) ?
                `<img src="${getAsset('mysticalDialIcon')}" class="small-icon me-1" alt="Free Draw"> Free` :
                `${entry.diamond} <img class='small-icon mx-1' src='${getAsset('diamond')}' alt='Diamond'>`; // Shared diamond icon

            let crestDisplayHtml = `${entry.crests} <img src="${getAsset('tokenIcon')}" class="small-icon ms-1" alt="token">`;
            // Check for prize pool item display
            if (entry.crests === 0 && entry.diamond > 0) {
                 crestDisplayHtml = `<img src="${getAsset('prizePoolItemIcon')}" class="small-icon ms-1" alt="Prize Pool Item"> Item`;
             }

            // Sync icon - typically shows pending ('clock') as only unsynced items are in this list.
            // If sync fails, the icon might be updated to 'triangle-exclamation' by the sync function.
            let syncIconHtml = '<span class="sync-status-icon" title="Pending Sync"><i class="fa-solid fa-clock text-warning"></i></span>';
            // Check if sync failed marker was added (optional enhancement)
            // if (entry.syncFailed) {
            //     syncIconHtml = '<span class="sync-status-icon" title="Sync Failed"><i class="fa-solid fa-triangle-exclamation text-danger"></i></span>';
            // }

            // Batch counter logic (no changes needed here)
            let batchCounterHtml = '';
            if (entry.batchId && entry.batchId.startsWith('10x-')) {
                const parts = tempIdValue.split('-');
                if (parts.length >= 3) {
                    const counter = parts[parts.length - 1];
                    batchCounterHtml = `<span class="batch-counter small text-white-50 ms-2">(${counter}/10)</span>`;
                }
            }

            // Construct list item HTML with delete overlay
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
                            ${batchCounterHtml}
                        </span>
                        ${syncIconHtml}
                    </div>
                </div>`;

            sessionList.append(listItem);
        });
    }
} // End renderSessionList
  //===================== UPDATE HISTORY / HOME LIST =====================

  function updateHistory() {
    let historyList = $("#history-list");
    historyList.empty(); // Clear previous history

    // --- Filter localData for the current event ---
    const allUserEntries = Array.isArray(localData[currentUser]) ? localData[currentUser] : [];
    const userEntries = allUserEntries.filter(entry => entry.event === currentEventKey);
    // console.log(`Rendering history for ${currentUser} - ${currentConfig.eventName}: ${userEntries.length} entries found.`);

    // Display message if no history for this specific event
    if (userEntries.length === 0) {
        historyList.html(`<li class="list-group-item text-center text-muted">No history for ${currentConfig.eventName}.</li>`);
        return; // Stop execution for this function
    }

    // Iterate through the filtered entries for the current event
    userEntries.forEach(entry => {
        // Basic validation for the entry itself
        if (!entry || typeof entry.timestamp !== 'number' || isNaN(entry.timestamp) || !entry.id) {
            console.warn("Skipping invalid history entry during render:", entry);
            return; // Skip this iteration
        }

        // Format date and time
        let drawDate = new Date(entry.timestamp).toLocaleDateString();
        let drawTime = new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // Format draw cost text using getAsset()
        let diamondText = (entry.diamond === 0) ?
            `<img src="${getAsset('mysticalDialIcon')}" class="small-icon" alt="Free Draw"> Free` :
            `${entry.diamond} <img class='small-icon' src='${getAsset('diamond')}' alt='Diamond'>`; // Shared diamond icon

        // Format crests received text using getAsset()
        let crestText = `${entry.crests} <img src="${getAsset('tokenIcon')}" class="small-icon ms-1" alt="token">`;
         // Handle prize pool item display
         if (entry.crests === 0 && entry.diamond > 0) {
             crestText = `<img src="${getAsset('prizePoolItemIcon')}" class="small-icon ms-1" alt="Prize Pool Item"> Item`;
         }

        // Determine sync status and buttons
        let entryId = entry.id; // Already validated entry.id exists
        let entryIdAttr = `data-entry-id="${entryId}"`; // Use the actual ID from sheet or 'local-' prefixed ID
        let isLocal = String(entryId).startsWith('local-');
        let syncFailed = entry.syncFailed === true; // Check explicit flag

        let syncIconHtml = '';
        let canEditDelete = false;
        let cardClass = 'history-card mb-3'; // Base class

        if (syncFailed) {
            syncIconHtml = '<span class="sync-indicator text-danger small ms-2" title="Sync Failed"><i class="fa-solid fa-triangle-exclamation"></i></span>';
            cardClass += ' sync-failed'; // Add class for styling failed entries
        } else if (isLocal) {
            syncIconHtml = '<span class="sync-indicator text-muted small ms-2" title="Syncing..."><i class="fas fa-sync fa-spin"></i></span>';
        } else { // Entry has a non-local ID and hasn't failed sync = Synced
            // syncIconHtml = ''; // No icon for synced (or use checkmark below)
            syncIconHtml = '<span class="sync-indicator text-success small ms-2" title="Synced"><i class="fa-solid fa-check"></i></span>';
            canEditDelete = true; // Allow edit/delete only for successfully synced entries
        }

        // Generate Edit/Delete buttons only if allowed
        let editDeleteButtons = canEditDelete ?
             `<button class="btn btn-sm btn-outline-danger delete-entry ms-2" data-id="${entryId}" title="Delete Entry"><i class="fa fa-trash"></i></button>` +
             `<button class="btn btn-sm btn-outline-primary edit-entry ms-2" data-id="${entryId}" title="Edit Entry"><i class="fa fa-edit"></i></button>` :
             ''; // No buttons for local or failed entries

        // Construct List Item HTML
        let listItem = `
            <div class="${cardClass}" ${entryIdAttr}>
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <div class="history-date">${drawDate} ${drawTime}</div>
                        <div class="history-details">
                            ${diamondText} → ${crestText}
                        </div>
                    </div>
                    <div class="d-flex align-items-center">
                        ${editDeleteButtons}
                        ${syncIconHtml}
                    </div>
                </div>
            </div>`;

        historyList.append(listItem);
    }); // End forEach loop
} // End updateHistory function

  //===================== UPDATE STATS =====================

  function updateStats() {
    // --- Filter localData for the current event ---
    const allUserEntries = Array.isArray(localData[currentUser]) ? localData[currentUser] : [];
    const entries = allUserEntries.filter(entry => entry.event === currentEventKey); // Filter here
    // console.log(`Updating stats for ${currentUser} - ${currentConfig.eventName}: ${entries.length} entries.`);

    const statsContainer = $("#tab-stats .container");
    const characterIcon = getAsset(currentUser === 'Mitko' ? 'mitkoIcon' : 'aylinIcon');
    const tokenIcon = getAsset('tokenIcon'); // Get current event token icon

    // Check if stats HTML structure needs to be created (e.g., first load)
    // Added IDs to elements that might need updating without full recreation
    if (statsContainer.children().length === 0 || $("#stats-chart").length === 0) {
        // console.log("Creating stats tab structure.");
        statsContainer.html(`
            <h3 class="mt-3 text-light" id="stats-event-title">Stats for ${currentConfig.eventName}</h3>
            <div class="stats-panel card p-3 mb-3">
                <div class="text-center mb-3">
                    <img id="character-image" src="${characterIcon}" alt="Character" class="character-img mb-2" style="max-height: 150px; width: auto;">
                    <h4 id="progress-title">Progress</h4>
                </div>
                <div id="stats-toggle" class="d-flex justify-content-center mb-3">
                    <button id="toggle-tokens" class="btn btn-sm btn-outline-light">Tokens</button>
                    <button id="toggle-diamonds" class="btn btn-sm btn-outline-light ms-2">Diamonds Spent</button>
                </div>
                <div class="progress mb-3" id="progress-bar-container">
                    <div id="progress-bar" class="progress-bar" role="progressbar" style="width: 0%;" aria-valuemin="0" aria-valuemax="100">0%</div>
                </div>
                <p id="stats-summary" class="mb-0">Total: <span id="total-value">0</span></p>
            </div>
            <canvas id="stats-chart" class="mb-4"></canvas>
            <div class="card mb-3 p-2">
                <h5 class="text-dark chart-title" id="pie-chart-title">Free vs Diamond Draws</h5>
                <canvas id="stats-pie"></canvas>
            </div>
            <div class="card mb-3 p-2">
                <h5 class="text-dark chart-title" id="line-chart-title">Tokens Over Time (Moving Avg)</h5>
                <canvas id="stats-line"></canvas>
            </div>
            <div class="card mb-3 p-2">
                 <h5 class="text-dark chart-title" id="hist-chart-title">
                      <img src="${tokenIcon}" class="small-icon" alt="Token" /> Token Value Distribution
                 </h5>
                 <canvas id="stats-hist"></canvas>
            </div>
            <div class="card mb-3 p-2">
                <h5 class="text-dark chart-title" id="tier-chart-title">
                      Average <img src="${tokenIcon}" class="small-icon" alt="Token" /> by Draw Cost
                </h5>
                <canvas id="stats-tier"></canvas>
            </div>
            <div id="advanced-metrics" class="card p-3 mb-4" style="background-color: rgba(0, 0, 0, 0.5);">
                <h5 class="text-light mb-3">Advanced Metrics</h5>
                <div id="advanced-metrics-grid" class="metrics-grid">
                    </div>
            </div>
        `);
        // Attach listeners after creating elements
        attachStatsToggleListeners();
    } else {
        // If structure exists, just update dynamic parts like title and character image
        $("#stats-event-title").text(`Stats for ${currentConfig.eventName}`);
        $("#character-image").attr("src", characterIcon);
        // Update chart titles that use icons dynamically
        $('#hist-chart-title').html(`<img src="${tokenIcon}" class="small-icon" alt="Token" /> Token Value Distribution`);
        $('#tier-chart-title').html(`Average <img src="${tokenIcon}" class="small-icon" alt="Token" /> by Draw Cost`);
        // Ensure listeners are still attached (safer to call again)
         attachStatsToggleListeners();
    }

    // Ensure correct toggle button is active
    $("#toggle-tokens, #toggle-diamonds").removeClass("active");
    $(`#toggle-${statsView}`).addClass("active");

    // --- Call update functions with the FILTERED entries ---
    updateMainBarChart(entries);
    updatePieChart(entries);
    updateLineChart(entries);
    updateHistogram(entries);
    updateTierChart(entries);
    updateAdvancedMetrics(entries); // This calls computeMetrics with filtered data
} // End updateStats function

  //===================== CHART UPDATE FUNCTIONS =====================
  function updateMainBarChart(entries) { // entries are pre-filtered
    const canvas = document.getElementById("stats-chart");
    if (!canvas) return;
    if (window.myChart) window.myChart.destroy(); // Destroy previous instance

    // Use event-specific target from config, fallback to default
    const progressTarget = currentConfig.targetTokens || 1200;
    const labels = entries.map((_, i) => "D" + (entries.length - i)).reverse(); // Draw N...1

    let dataPoints, chartLabel, summaryHtml, progressPercent;
    const tokenIcon = getAsset('tokenIcon'); // Use current event token icon
    const diamondIcon = getAsset('diamond'); // Use shared diamond icon

    if (statsView === "tokens") {
        $("#progress-title").html(`Token Progress <img src='${tokenIcon}' alt='Token' class='small-icon'>`);
        let totalCrests = entries.reduce((sum, e) => sum + (e.crests || 0), 0);
        // Update summary text with current token icon
        summaryHtml = `Total Tokens: <span id='total-value'>${totalCrests}</span> <img src='${tokenIcon}' alt='Token' class='small-icon'> / ${progressTarget}`;
        progressPercent = (progressTarget > 0) ? Math.min((totalCrests / progressTarget) * 100, 100) : 0;
        $("#progress-bar").css("width", progressPercent + "%").text(Math.floor(progressPercent) + "%");
        $("#progress-bar-container").show(); // Show progress bar for tokens
        dataPoints = entries.map(e => e.crests || 0).reverse();
        chartLabel = "Tokens per Draw";
        window.myChart = new Chart(canvas, {
            type: "bar", data: { labels, datasets: [{ label: chartLabel, data: dataPoints, backgroundColor: "#FFD4D4" }] },
            options: { responsive: true, maintainAspectRatio: true, scales: { y: { beginAtZero: true } }, plugins: { legend: { display: false } } }
        });

    } else { // statsView === "diamonds"
         $("#progress-title").html(`Diamond Spending <img src='${diamondIcon}' alt='Diamond' class='small-icon'>`);
         // Calculate actual total diamonds spent for *these* entries
         let totalDiamonds = entries.reduce((sum, e) => sum + (e.diamond || 0), 0);
         // Update summary text with shared diamond icon
         summaryHtml = `Total Spent: <span id='total-value'>${totalDiamonds}</span> <img src='${diamondIcon}' alt='Diamond' class='small-icon'>`;
         $("#progress-bar-container").hide(); // Hide progress bar for diamonds
         dataPoints = entries.map(e => e.diamond || 0).reverse();
         chartLabel = "Diamonds per Draw";
          window.myChart = new Chart(canvas, {
             type: "bar", data: { labels, datasets: [{ label: chartLabel, data: dataPoints, backgroundColor: "#FFDEAD" }] }, // Orange color
             options: { responsive: true, maintainAspectRatio: true, scales: { y: { beginAtZero: true } }, plugins: { legend: { display: false } } }
         });
    }
     // Update the summary text element common to both views
    $("#stats-summary").html(summaryHtml);
}

// --- Pie Chart (Free vs Diamond Draws) ---
function updatePieChart(entries) { // entries are pre-filtered
    const canvas = document.getElementById("stats-pie");
    if (!canvas) return;
    if (window.myPieChart) window.myPieChart.destroy();
    // Clear canvas if no data for this event
    if (entries.length === 0) { canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height); return; }

    let freeCount = entries.filter(e => (e.diamond || 0) === 0).length;
    let diamondCount = entries.length - freeCount;

    // No assets needed here, just data calculation
    window.myPieChart = new Chart(canvas, {
        type: "pie",
        data: {
            labels: [`Free (${freeCount})`, `Diamond (${diamondCount})`],
            datasets: [{ data: [freeCount, diamondCount], backgroundColor: ["#FFAEC9", "#F28EFF"], borderColor: '#fff', borderWidth: 1 }]
        },
        options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: true, position: 'top' } } }
    });
}

// --- Line Chart (Tokens Moving Average) ---
function updateLineChart(entries) { // entries are pre-filtered
    const canvas = document.getElementById("stats-line");
    if (!canvas) return;
    if (window.myLineChart) window.myLineChart.destroy();
    // Clear canvas if no data for this event
    if (entries.length === 0) { canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height); return; }

    let sorted = [...entries].sort((a, b) => a.timestamp - b.timestamp);
    const windowSize = 5; // Moving average window size
    let tokensArray = sorted.map(e => e.crests || 0);
    let labels = sorted.map((_, i) => "D" + (i + 1)); // Label as Draw 1, Draw 2...
    let maData = []; // Moving average data points

    // Calculate moving average
    for (let i = 0; i < tokensArray.length; i++) {
        let start = Math.max(0, i - windowSize + 1);
        let subset = tokensArray.slice(start, i + 1);
        let avg = subset.reduce((s, val) => s + val, 0) / subset.length;
        maData.push(avg);
    }

    // No assets needed here, just data calculation
    window.myLineChart = new Chart(canvas, {
        type: "line",
        data: {
            labels: labels,
            datasets: [{
                label: `Tokens (${windowSize}-Draw Avg)`, data: maData,
                backgroundColor: "rgba(255, 184, 238, 0.5)", borderColor: "#ffaec9",
                borderWidth: 2, fill: true, tension: 0.2 // Slight curve
            }]
        },
        options: { responsive: true, maintainAspectRatio: true, scales: { y: { beginAtZero: true } }, plugins: { legend: { display: true, position: 'top' } } }
    });
}

// --- Histogram (Token Value Distribution) ---
function updateHistogram(entries) { // entries are pre-filtered
    const canvas = document.getElementById("stats-hist");
    if (!canvas) return;
    if (window.myHistChart) window.myHistChart.destroy();
    // Clear canvas if no data for this event
    if (entries.length === 0) { canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height); return; }

    // Count occurrences of each crest value
    let distributionMap = {};
    entries.forEach(e => {
        distributionMap[e.crests || 0] = (distributionMap[e.crests || 0] || 0) + 1;
    });

    let crestValues = Object.keys(distributionMap).map(v => parseInt(v)).sort((a, b) => a - b);
    let frequencies = crestValues.map(v => distributionMap[v]);

    // Update title dynamically (already done in updateStats)
    // $(canvas).siblings('h5#hist-chart-title').html(`<img src="${getAsset('tokenIcon')}" class="small-icon" alt="Token" /> Token Value Distribution`);

    window.myHistChart = new Chart(canvas, {
        type: "bar",
        data: {
            labels: crestValues.map(v => String(v)), // Crest values as labels
            datasets: [{ label: "Draw count", data: frequencies, backgroundColor: "#fdc5f5" }] // Light pink bars
        },
        options: {
            responsive: true, maintainAspectRatio: true,
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }, // Integer counts on Y-axis
            plugins: { legend: { display: false } } // Hide legend, title is sufficient
        }
    });
}

// --- Tier Chart (Average Tokens by Draw Cost) ---
 function updateTierChart(entries) { // entries are pre-filtered
    const canvas = document.getElementById("stats-tier");
    if (!canvas) return;
    if (window.myTierChart) window.myTierChart.destroy();
    // Clear canvas if no data for this event
    if (entries.length === 0) { canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height); return; }

    let tiers = [0, 25, 50, 450, 500]; // Define diamond cost tiers
    let tierLabels = ["Free(0)", "25💎", "50💎", "450💎", "500💎"];
    let avgTokensForTier = [];
    let drawCountsForTier = []; // Store draw counts for tooltips

    // Calculate average tokens for each tier
    tiers.forEach(t => {
        let subset = entries.filter(e => (e.diamond || 0) === t);
        drawCountsForTier.push(subset.length);
        // Calculate average only if there are entries in the subset
        const avg = subset.length === 0 ? 0 : subset.reduce((acc, e) => acc + (e.crests || 0), 0) / subset.length;
        avgTokensForTier.push(avg);
    });

    // Update title dynamically (already done in updateStats)
    // $(canvas).siblings('h5#tier-chart-title').html(`Average <img src="${getAsset('tokenIcon')}" class="small-icon" alt="Token" /> by Draw Cost`);

    window.myTierChart = new Chart(canvas, {
        type: "bar",
        data: {
            labels: tierLabels,
            datasets: [{
                label: "Avg Tokens", data: avgTokensForTier,
                backgroundColor: "#fed8de", // Light pink/peach bars
                drawCounts: drawCountsForTier // Store draw counts in dataset for tooltip
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: true, scales: { y: { beginAtZero: true } },
            plugins: {
                legend: { display: false },
                tooltip: { // Custom tooltip to show count
                    callbacks: {
                        label: ctx => `Avg Tokens: ${ctx.parsed.y.toFixed(2)}`,
                        afterLabel: ctx => `(${ctx.dataset.drawCounts[ctx.dataIndex]} draws)`
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
    let totalCrests = entries.reduce((acc, e) => acc + (e.crests || 0), 0);

    // Calculate ACTUAL total diamonds spent (raw sum) - Keep for potential other uses
    let totalActualDiamondsSpent = entries.reduce((acc, e) => acc + (e.diamond || 0), 0);

    // --- Calculate HEURISTIC total diamonds spent (prorating 10-pulls) ---
    let heuristicTotalDiamondsSpent = 0;
    entries.forEach(entry => {
        const cost = entry.diamond || 0;
        if (cost === 450 || cost === 500) {
            // Add the prorated cost per result (cost/10)
            heuristicTotalDiamondsSpent += (cost / 10);
        } else if (cost > 0) {
            // Add the normal cost for single diamond draws (25 or 50)
            heuristicTotalDiamondsSpent += cost;
        }
        // Free draws (cost=0) add nothing
    });
    // --- End Heuristic Calculation ---


    let totalFree = entries.filter(e => (e.diamond || 0) === 0).length;
    let totalDiamondDraws = totalDraws - totalFree;
    let tokensPerDraw = totalDraws === 0 ? 0 : totalCrests / totalDraws;
    let best = entries.reduce((b, e) => (e && typeof e.crests === 'number' && e.crests > b.crests) ? e : b, { crests: -Infinity });
    let bestDraw = (best.crests === -Infinity) ? null : best;
    let luckStatus = "Average";
    const luckyThreshold = 10.0;
    const unluckyThreshold = 7.0;
    if (totalDraws === 0) { luckStatus = "N/A"; }
    else if (tokensPerDraw >= luckyThreshold) { luckStatus = "Lucky"; }
    else if (tokensPerDraw < unluckyThreshold) { luckStatus = "Unlucky"; }

    // --- Calculate Cost Efficiency using HEURISTIC spend vs TOTAL crests ---
    // This gives an overall efficiency measure including free draws contribution
    let costEfficiency = null; // Heuristic Diamonds / Total Token
    if (heuristicTotalDiamondsSpent > 0 && totalCrests > 0) {
        costEfficiency = heuristicTotalDiamondsSpent / totalCrests;
    } else if (heuristicTotalDiamondsSpent > 0 && totalCrests === 0) {
        // Spent diamonds (heuristically), got zero tokens overall
        costEfficiency = Infinity;
    } else if (heuristicTotalDiamondsSpent === 0 && totalCrests > 0) {
         // Only free draws resulting in tokens, or no diamond draws
         costEfficiency = 0; // 0 cost per token is accurate here
    } else {
         // No heuristic spend and no tokens (or no draws)
         costEfficiency = null; // N/A
    }
    // --- End Cost Efficiency Calculation ---


    const metricsResult = {
        totalDraws, totalFree, totalDiamondDraws, totalCrests,
        totalActualDiamondsSpent, // Keep the raw value if needed elsewhere
        heuristicTotalDiamondsSpent, // Use this for display
        bestDraw, tokensPerDraw, costEfficiency, // Use heuristic efficiency
        luckStatus
    };

    // console.log("computeMetrics calculated:", metricsResult);
    return metricsResult;
} // End computeMetrics

//===================== METRICS HTML BUILDER (SHARED) =====================
function buildMetricsHTML(m, isComparePage = false, compareFlags = {}) {
    // console.log("buildMetricsHTML received metrics object (m):", m);
    if (m && m.heuristicTotalDiamondsSpent === undefined) { // Check the key we actually want to display
        console.error("!!! heuristicTotalDiamondsSpent is UNDEFINED in buildMetricsHTML input !!!");
    }

    let freePercent = (m.totalDraws === 0) ? 0 : (m.totalFree / m.totalDraws) * 100;
    let diamondPercent = (m.totalDraws === 0) ? 0 : (m.totalDiamondDraws / m.totalDraws) * 100;
    const leaderClass = (flag) => (isComparePage && flag) ? ' compare-leader' : '';
    const tokenIcon = getAsset('tokenIcon');
    const diamondIcon = getAsset('diamond');
    const dialIcon = getAsset('mysticalDialIcon');
    let html = '';

    // Total Draws
    html += `<div class="metric-card"><div class="metric-label">Total Draws <img src="${dialIcon}" class="metric-icon" alt="Draw" /></div><div class="metric-value">${m.totalDraws ?? 'N/A'}</div></div>`;
    // Total Tokens
    html += `<div class="metric-card${leaderClass(compareFlags.isLeadingTotalTokens)}"><div class="metric-label">Total Tokens <img src="${tokenIcon}" class="metric-icon" alt="Token" /></div><div class="metric-value">${m.totalCrests ?? 'N/A'}</div></div>`;

    // --- Total Diamonds Spent (Display HEURISTIC value) ---
    html += `<div class="metric-card">
                 <div class="metric-label">Total Spent <img src="${diamondIcon}" class="metric-icon" alt="Diamond" /></div>
                 <div class="metric-value">${m.heuristicTotalDiamondsSpent?.toFixed(0) ?? 'N/A'}</div> <div class="metric-note">Diamonds (Adj.)</div> </div>`;
    // --- End Total Spent ---

    // Cost Efficiency (Uses efficiency calculated with heuristic spend in computeMetrics)
    let costEfficiencyText = "N/A";
    if (m.costEfficiency === Infinity) { costEfficiencyText = "∞ 💎/Token"; }
    else if (m.costEfficiency === 0) { costEfficiencyText = "0.00 💎/Token"; } // Explicitly show 0 if calculated
    else if (m.costEfficiency !== null && m.costEfficiency !== undefined) { costEfficiencyText = m.costEfficiency.toFixed(2) + " 💎/Token"; }
    const costNote = (m.costEfficiency !== null && m.costEfficiency !== Infinity) ? '(Lower is Better)' : (m.costEfficiency === Infinity ? '(No Tokens for Cost)' : '');
    html += `<div class="metric-card${leaderClass(compareFlags.isLeadingCostEfficiency)}"><div class="metric-label">Cost Efficiency <i class="fas fa-coins metric-icon"></i></div><div class="metric-value">${costEfficiencyText}</div><div class="metric-note">${costNote}</div></div>`;

    // Best Draw
    let bestDrawHTML = `<div class="metric-card"><div class="metric-label">Best Draw <img src="${tokenIcon}" class="metric-icon" alt="token" /></div><div class="metric-value">N/A</div></div>`;
    if (m.bestDraw) { bestDrawHTML = `<div class="metric-card${leaderClass(compareFlags.isLeadingBestDraw)}"><div class="metric-label">Best Draw <img src="${tokenIcon}" class="metric-icon" alt="token" /></div><div class="metric-value">${m.bestDraw.crests}</div><div class="metric-note"> ${m.bestDraw.diamond > 0 ? `(${m.bestDraw.diamond}💎)` : "(Free)"} </div></div>`; }
    html += bestDrawHTML;
    // Free Draws
    html += `<div class="metric-card"><div class="metric-label">Free Draws <img src="${dialIcon}" class="metric-icon" alt="Free" /></div><div class="metric-value">${m.totalFree ?? 'N/A'}</div><div class="metric-note">${freePercent.toFixed(1)}%</div></div>`;
    // Diamond Draws
    html += `<div class="metric-card"><div class="metric-label">Diamond Draws <img src="${diamondIcon}" class="metric-icon" alt="diamond" /></div><div class="metric-value">${m.totalDiamondDraws ?? 'N/A'}</div><div class="metric-note">${diamondPercent.toFixed(1)}%</div></div>`;
    // Luck Score
    let luckNote = (m.totalDraws > 0 && m.tokensPerDraw !== undefined) ? `${m.tokensPerDraw.toFixed(2)} <img src="${tokenIcon}" class="metric-icon" alt="Token" style="height: 1em; vertical-align: baseline;"/> /draw` : '';
    html += `<div class="metric-card${leaderClass(compareFlags.isLeadingLuck)}"><div class="metric-label">Luck Score™ <i class="fa-solid fa-clover metric-icon"></i></div><div class="metric-value">${m.luckStatus ?? 'N/A'}</div><div class="metric-note">${luckNote}</div></div>`;

    return html;
} // End buildMetricsHTML

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
    compareContainer.empty(); // Clear previous content

    // --- Filter data for the current event for BOTH users ---
    const allMitkoEntries = localData["Mitko"] || [];
    const allAylinEntries = localData["Aylin"] || [];

    const mitkoEntries = allMitkoEntries.filter(entry => entry.event === currentEventKey);
    const aylinEntries = allAylinEntries.filter(entry => entry.event === currentEventKey);
    // console.log(`Updating compare for ${currentConfig.eventName}: Mitko (${mitkoEntries.length}), Aylin (${aylinEntries.length})`);

    // Compute metrics for filtered data
    let mitkoMetrics = computeMetrics(mitkoEntries);
    let aylinMetrics = computeMetrics(aylinEntries);

    // --- Determine Leaders (using updated computeMetrics results) ---
     const mitkoFlags = {
        isLeadingTotalTokens: mitkoMetrics.totalCrests > aylinMetrics.totalCrests,
        isLeadingBestDraw: (mitkoMetrics.bestDraw?.crests ?? -1) > (aylinMetrics.bestDraw?.crests ?? -1),
        isLeadingCostEfficiency: (() => { // Lower non-null/non-inf is better
            const mEff = mitkoMetrics.costEfficiency; const oEff = aylinMetrics.costEfficiency;
            if (mEff === null && oEff === null) return false; if (mEff === null) return false; if (oEff === null) return true;
            if (mEff === Infinity && oEff === Infinity) return false; if (mEff === Infinity) return false; if (oEff === Infinity) return true;
            return mEff < oEff; // Lower finite value wins
        })(),
         // Lead if luck status is better (Lucky > Average > Unlucky) or if equal status, higher avg tokens breaks tie
        isLeadingLuck: (() => {
              const luckOrder = { "Lucky": 3, "Average": 2, "Unlucky": 1, "N/A": 0 };
              const mitkoLuckVal = luckOrder[mitkoMetrics.luckStatus] || 0;
              const aylinLuckVal = luckOrder[aylinMetrics.luckStatus] || 0;
              if (mitkoLuckVal > aylinLuckVal) return true;
              if (mitkoLuckVal === aylinLuckVal && mitkoMetrics.tokensPerDraw > aylinMetrics.tokensPerDraw) return true;
              return false;
        })()
    };

    const aylinFlags = {
        isLeadingTotalTokens: aylinMetrics.totalCrests > mitkoMetrics.totalCrests,
        isLeadingBestDraw: (aylinMetrics.bestDraw?.crests ?? -1) > (mitkoMetrics.bestDraw?.crests ?? -1),
        isLeadingCostEfficiency: (() => {
             const mEff = aylinMetrics.costEfficiency; const oEff = mitkoMetrics.costEfficiency;
             if (mEff === null && oEff === null) return false; if (mEff === null) return false; if (oEff === null) return true;
             if (mEff === Infinity && oEff === Infinity) return false; if (mEff === Infinity) return false; if (oEff === Infinity) return true;
             return mEff < oEff; // Lower finite value wins
        })(),
        isLeadingLuck: (() => {
              const luckOrder = { "Lucky": 3, "Average": 2, "Unlucky": 1, "N/A": 0 };
              const mitkoLuckVal = luckOrder[mitkoMetrics.luckStatus] || 0;
              const aylinLuckVal = luckOrder[aylinMetrics.luckStatus] || 0;
              if (aylinLuckVal > mitkoLuckVal) return true;
              if (aylinLuckVal === mitkoLuckVal && aylinMetrics.tokensPerDraw > mitkoMetrics.tokensPerDraw) return true;
              return false;
        })()
    };

    // --- Generate Compare Page HTML Structure (Use getAsset for icons) ---
     compareContainer.html(`
        <h3 class="mt-3 text-light text-center">Compare for ${currentConfig.eventName}</h3>
        <div class="compare-row mt-4">
            <div class="compare-column" id="compare-mitko-col">
                <h5 class="text-light mb-3 d-flex align-items-center justify-content-center flex-column">
                    <img src="${getAsset('mitkoIcon')}" alt="Mitko" class="compare-user-icon mb-2" /> Mitko
                </h5>
                <div class="metrics-grid" id="compare-mitko-grid">
                    </div>
            </div>
            <div class="compare-column" id="compare-aylin-col">
                <h5 class="text-light mb-3 d-flex align-items-center justify-content-center flex-column">
                    <img src="${getAsset('aylinIcon')}" alt="Aylin" class="compare-user-icon mb-2" /> Aylin
                </h5>
                <div class="metrics-grid" id="compare-aylin-grid">
                    </div>
            </div>
        </div>
    `);

    // --- Populate grids using the shared HTML builder ---
    $("#compare-mitko-grid").html(buildMetricsHTML(mitkoMetrics, true, mitkoFlags));
    $("#compare-aylin-grid").html(buildMetricsHTML(aylinMetrics, true, aylinFlags));

} // End updateCompare function

  //===================== DELETE / EDIT ENTRY =====================

 // --- Delete Entry Handler ---
 $(document).on("click", ".delete-entry", function() {
    const id = $(this).data("id");
    // Basic validation: ID exists and is not local (local entries can't be deleted from sheet)
     if (!id || String(id).startsWith('local-')) {
         alert("Cannot delete an entry that hasn't synced or failed sync.");
         return;
     }

    // Use event name in confirmation
    if (confirm(`Delete this entry from ${currentConfig.eventName}? This cannot be undone.`)) {
        $("#loader").removeClass("d-none");
        // Send ID, User, and Event Key to backend
        $.post(url_tracker, {
              action: "delete",
              id: id,
              User: currentUser
              // event: currentEventKey // <-- Add if your backend 'delete' action needs the event key
           })
            .done(function(response) {
                // console.log("Delete response:", response);
                 if (response && response.result === 'deleted') {
                      alert("Entry deleted successfully.");
                      // Refetch data to update UI (removes the entry)
                      fetchRemoteData(() => {
                          updateHistory(); updateStats(); updateCompare();
                          $("#loader").addClass("d-none");
                      });
                 } else {
                       // Handle cases where backend couldn't find/delete
                       alert(`Delete failed: ${response.error || 'Entry not found or server error.'}`);
                       $("#loader").addClass("d-none");
                 }
            })
            .fail(function(jqXHR, textStatus, errorThrown) {
                console.error("Delete AJAX Error:", textStatus, errorThrown);
                alert("Delete failed. Could not reach server.");
                $("#loader").addClass("d-none");
            });
    }
}); // End delete-entry click

// --- Edit Entry Handler ---
$(document).on("click", ".edit-entry", function() {
    const id = $(this).data("id");
     // Basic validation: ID exists and is not local
     if (!id || String(id).startsWith('local-')) {
         alert("Cannot edit an entry that hasn't synced or failed sync.");
         return;
     }

    // Find the entry in localData (ensure it's for the current event)
    let entry = (localData[currentUser] || []).find(e => String(e.id) === String(id) && e.event === currentEventKey);
    if (!entry) {
        // If not found, it might be from a different event or already deleted/refreshed
        alert(`Entry data not found locally for ${currentConfig.eventName}. Please refresh if the entry exists.`);
        return;
    }

    // Prompt for new values
    const nDStr = prompt(`Edit Diamonds (current: ${entry.diamond}):`, entry.diamond);
    if (nDStr === null) return; // User cancelled Diamond prompt
    const nCStr = prompt(`Edit Tokens (current: ${entry.crests}):`, entry.crests);
    if (nCStr === null) return; // User cancelled Crests prompt

    // Validate input
    const nD = parseInt(nDStr); const nC = parseInt(nCStr);
    if (isNaN(nD) || nD < 0 || isNaN(nC) || nC < 0) {
        alert("Invalid input. Diamonds and Tokens must be non-negative numbers.");
        return;
    }

    // Check if values actually changed
    if (nD === entry.diamond && nC === entry.crests) {
        alert("No changes detected.");
        return;
    }

    // Use event name in confirmation
    if (confirm(`Confirm Edit for ${currentConfig.eventName} entry: ${nD}💎 -> ${nC} Tokens?`)) {
        $("#loader").removeClass("d-none");
        // Send ID, User, new values, and Event Key to backend
        $.post(url_tracker, {
                action: "edit",
                id: entry.id, // Use the found entry's ID
                diamond: nD,
                crests: nC,
                user: currentUser // Send user in case backend logic needs it
                // event: currentEventKey // <-- Add if your backend 'edit' action needs the event key
            })
            .done(function(res) {
                // console.log("Edit response:", res);
                 if (res && res.result === 'edited') {
                      alert("Entry edited successfully.");
                      // Refetch data to update UI with edited values
                      fetchRemoteData(() => {
                          updateHistory(); updateStats(); updateCompare();
                          $("#loader").addClass("d-none");
                      });
                 } else {
                      alert(`Edit failed: ${res.error || 'Entry not found or server error.'}`);
                      $("#loader").addClass("d-none");
                 }
            })
            .fail(function(jqXHR, textStatus, errorThrown) {
                console.error("Edit AJAX Error:", textStatus, errorThrown);
                alert("Edit failed. Could not reach server.");
                $("#loader").addClass("d-none");
            });
    }
}); // End edit-entry click

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
        // Show main app (which should be initialized by now)
        $("#main-app").hide().removeClass("d-none").fadeIn(300);
    });
 });

 $("#hide-summary-today").click(function() {
    const todayStr = getTodayDateString();
    localStorage.setItem('hideDailySummaryUntil', todayStr); // Store today's date string
    // console.log("Hiding daily summary until end of day:", todayStr);
    // Fade out summary and show main app
    $("#daily-summary-screen").fadeOut(300, function() {
        $(this).addClass("d-none");
        $("#main-app").hide().removeClass("d-none").fadeIn(300);
    });
 });

 // --- Calculate Today's Draws and Discount Status ---
 // Needs to filter allUserData by currentEventKey
 function calculateTodaysDrawsAndDiscount(allUserData) { // allUserData = { Mitko: [...], Aylin: [...] }
    const todayStart = getStartOfDayTimestamp(new Date());
    const todayEnd = getEndOfDayTimestamp(new Date());
    let mitkoCount = 0;
    let aylinCount = 0;
    let mitkoDiscountCrests = null; // Use null to indicate not found/done
    let aylinDiscountCrests = null;

    // --- Filter Mitko's data for current event AND today ---
    const mitkoAllEventEntries = allUserData.Mitko || [];
    const mitkoCurrentEventEntries = mitkoAllEventEntries.filter(entry => entry.event === currentEventKey);
    const mitkoTodayEntries = mitkoCurrentEventEntries
            .filter(entry => entry.timestamp >= todayStart && entry.timestamp <= todayEnd)
            .sort((a, b) => a.timestamp - b.timestamp); // Sort oldest first to find *first* discount easily

    mitkoCount = mitkoTodayEntries.length; // Total count for today for this event

    // Find the first 25 diamond draw for today for this event
    const mitkoFirstDiscountDraw = mitkoTodayEntries.find(entry => entry.diamond === 25);
    if (mitkoFirstDiscountDraw) {
        mitkoDiscountCrests = mitkoFirstDiscountDraw.crests; // Store the crests value
    }

    // --- Filter Aylin's data for current event AND today ---
    const aylinAllEventEntries = allUserData.Aylin || [];
    const aylinCurrentEventEntries = aylinAllEventEntries.filter(entry => entry.event === currentEventKey);
    const aylinTodayEntries = aylinCurrentEventEntries
            .filter(entry => entry.timestamp >= todayStart && entry.timestamp <= todayEnd)
            .sort((a, b) => a.timestamp - b.timestamp); // Sort oldest first

    aylinCount = aylinTodayEntries.length; // Total count for today for this event

    // Find the first 25 diamond draw for today for this event
    const aylinFirstDiscountDraw = aylinTodayEntries.find(entry => entry.diamond === 25);
    if (aylinFirstDiscountDraw) {
        aylinDiscountCrests = aylinFirstDiscountDraw.crests; // Store the crests value
    }

    return {
        mitkoTotal: mitkoCount,
        aylinTotal: aylinCount,
        mitkoDiscountCrests: mitkoDiscountCrests,
        aylinDiscountCrests: aylinDiscountCrests
    };
 } // End calculateTodaysDrawsAndDiscount

 // --- Final Initializations & Event Selector Setup Call ---

 // Modify the sidebar click handler to also set up the event selector
 // when the settings tab is activated.
 $("#sidebar .nav-link").off('click').on('click', function(e) { // Use .off().on() to avoid duplicate listeners
    e.preventDefault();
    let tabId = $(this).data("tab");

    $("#sidebar .nav-link").removeClass('active');
    $(this).addClass('active');

    $(".tab-content").addClass("d-none");
    $("#tab-" + tabId).removeClass("d-none").hide().fadeIn(150);

    localStorage.setItem(LAST_ACTIVE_TAB_KEY, tabId);

    $("#sidebar").removeClass("open");
    $("#overlay").stop().fadeOut(300);

    // Refresh tab content / Setup specific tab UI
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
        case 'settings':
            // *** Call setupEventSelector when settings tab is shown ***
            setupEventSelector();
            break;
    }
});

// Initial draw of the ring if slider context exists (might be redundant if initUser handles it)
// if (ctx) { drawRing(crestValue); }


// Make sure initUser is called if a user is already selected on page load
if(currentUser) {
  initUser(currentUser);
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
    // console.log("Wrapped Stats:", stats); // Good for debugging

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