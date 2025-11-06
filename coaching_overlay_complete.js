// Coaching Overlay Complete - Full Integration
// This creates a complete draggable overlay with full coaching functionality

(function(){

let coachingOverlay = null;
let currentEngine = null;
let currentQuestion = null;
let overlayTranscript = [];
let overlayListenersBound = false;

// Debug helper (toggle with window.__COACH_DEBUG__ = true)
function debugLog() {
    if (window && window.__COACH_DEBUG__) {
        try { console.log.apply(console, arguments); } catch (_) {}
    }
}

// Build CSV in same format as dialog save
function saveOverlayDialogCSV(contentElement) {
    try {
        const entries = Array.isArray(overlayTranscript) ? overlayTranscript : [];
        if (entries.length === 0) {
            alert('Ingen dialog at gemme! Start en dialog først.');
            return;
        }

        const now = new Date();
        const timestamp = now.toISOString();
        const defaultFileName = 'Dialog_' + now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0');

        // Participants
        const coachName = 'Coach';
        const coachColor = '#667eea';
        const coachPose = 'tænke';
        // Get coach flipped state from pendingCoachFlipped, default to false
        const coachMirror = window.pendingCoachFlipped === true;
        const emptyStikord = ['', '', '', '', '', ''];

        const clientName = (window.loadedExternalData && window.loadedExternalData.You) ? window.loadedExternalData.You : 'Klient';
        const clientColor = window.popupClientColor || '#f093fb';
        let clientPoseName = '';
        try {
            let poseLib = window.poseLibrary;
            if (!poseLib && typeof poseLibrary !== 'undefined') poseLib = poseLibrary;
            let val = window.pendingClientPose;
            if (typeof val === 'string') {
                clientPoseName = val;
            } else if (typeof val === 'number' && poseLib && poseLib[val] && poseLib[val].name) {
                clientPoseName = poseLib[val].name;
            }
        } catch(_) {}
        // Get client flipped state from pendingClientFlipped, default to false
        const clientMirror = window.pendingClientFlipped === true;

        const csvData = [];
        csvData.push(['#metadata']);
        csvData.push(['timestamp', timestamp]);
        csvData.push(['']);
        csvData.push(['#cirkler']);
        csvData.push(['navn', 'farve', 'pose', 'spejl', 'stikord1', 'stikord2', 'stikord3', 'stikord4', 'stikord5', 'stikord6']);
        // Order: Coach first, then Client (consistent two rows)
        csvData.push([coachName, coachColor, coachPose, coachMirror, ...emptyStikord]);
        csvData.push([clientName, clientColor, clientPoseName, clientMirror, ...emptyStikord]);
        csvData.push(['']);
        csvData.push(['#dialog']);
        csvData.push(['speaker', 'message', 'side', 'timestamp']);
        entries.forEach(e => {
            csvData.push([e.speaker, e.message, e.side, e.timestamp || '']);
        });

        const csvContent = csvData.map(row => row.map(field => {
            const fieldStr = (field == null) ? '' : String(field);
            if (fieldStr.includes(',') || fieldStr.includes('"') || fieldStr.includes('\n') || fieldStr.includes('\r')) {
                return '"' + fieldStr.replace(/"/g, '""') + '"';
            }
            return fieldStr;
        }).join(',')).join('\r\n');

        let fileName = defaultFileName;
        try {
            const promptResult = prompt('Indtast filnavn (uden .csv):', defaultFileName);
            if (promptResult === null) return;
            fileName = (promptResult && promptResult.trim()) ? promptResult.trim() : defaultFileName;
        } catch(_) {}

        const BOM = '\uFEFF';
        const csvWithBOM = BOM + csvContent;
        const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName + '.csv';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    } catch (e) {
        console.log('Error saving dialog CSV from overlay:', e);
    }
}

function copyOverlayDialog() {
    try {
        const entries = Array.isArray(overlayTranscript) ? overlayTranscript : [];
        if (entries.length === 0) {
            alert('Ingen dialog at kopiere!');
            return;
        }
        const dialogText = entries.map(e => `${e.speaker}: ${e.message}`).join('\n\n');
        const doCopy = (text) => {
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(text).then(() => {
                    // ok
                }).catch(() => { fallbackCopyText(text); });
            } else {
                fallbackCopyText(text);
            }
        };
        const fallbackCopyText = (text) => {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand('copy'); } catch(_) {}
            document.body.removeChild(ta);
        };
        doCopy(dialogText);
    } catch (e) {
        console.log('Error copying dialog from overlay:', e);
    }
}

// Add CSS for the overlay system - scoped to overlay only
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    
    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.8);
        }
        to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
        }
    }
`;
document.head.appendChild(style);

/**
 * Open coaching overlay with data source
 */
function openCoachingOverlay(dataSource = 'myCoachingProject') {
    // Close existing overlay if open
    if (coachingOverlay) {
        closeCoachingOverlay();
    }
    
    // Create overlay container
    const overlay = document.createElement('div');
    overlay.id = 'coachingOverlay';
    overlay.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 85%;
        max-width: 750px;
        height: 80vh;
        background: white;
        border-radius: 15px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        z-index: 10000;
        display: flex;
        flex-direction: column;
        animation: slideIn 0.3s ease;
        overflow: visible;
        will-change: transform;
    `;
    
    // Create header
    const header = document.createElement('div');
    header.className = 'overlay-header';
    header.style.cssText = `
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 15px 20px;
        cursor: move;
        user-select: none;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-radius: 15px 15px 0 0;
        position: relative;
        z-index: 2;
    `;
    
    // Create header content
    const headerTitle = document.createElement('h3');
    headerTitle.style.cssText = `
        margin: 0;
        font-size: 1.2em;
        display: flex;
        align-items: center;
        gap: 8px;
    `;
    headerTitle.innerHTML = 'Reflektion';
    
    const closeBtn = document.createElement('button');
    closeBtn.style.cssText = `
        background: rgba(255,255,255,0.2);
        border: 2px solid white;
        color: white;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        cursor: pointer;
        font-size: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
    `;
    closeBtn.innerHTML = '✕';
    closeBtn.addEventListener('click', closeCoachingOverlay);
    
    header.appendChild(headerTitle);
    header.appendChild(closeBtn);
    
    // Create content area
    const content = document.createElement('div');
    content.className = 'overlay-content';
    content.style.cssText = `
        flex: 1;
        padding: 20px;
        position: relative;
        z-index: 2;
        background: white;
        min-height: 400px;
        overflow: visible;
    `;
    
    // Add to DOM
    overlay.appendChild(header);
    overlay.appendChild(content);
    document.body.appendChild(overlay);
    
    // Make draggable
    makeDraggable(overlay, header);
    
    // Create coaching content (poseLibrary is already loaded by compare_01.html)
    createCoachingContent(content, dataSource);
    
    // Store reference
    coachingOverlay = {
        overlay: overlay,
        header: header,
        content: content
    };
    
    // ESC key to close
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && coachingOverlay) {
            closeCoachingOverlay();
        }
    });
}

/**
 * Close coaching overlay
 */
function closeCoachingOverlay() {
    if (coachingOverlay) {
        // Dispatch custom event before closing so pages can save data if needed
        const closeEvent = new CustomEvent('coachingOverlayClosing', {
            detail: {
                engine: currentEngine
            }
        });
        window.dispatchEvent(closeEvent);
        
        coachingOverlay.overlay.remove();
        coachingOverlay = null;
        currentEngine = null;
        currentQuestion = null;
        window.coachingActive = false;
        debugLog('Coaching overlay closed');
    }
}

/**
 * Open coaching overlay from file (for compatibility with compare_01.html)
 */
async function openCoachingOverlayFromFile(filename) {
    debugLog('openCoachingOverlayFromFile called with:', filename);
    await openCoachingOverlay(filename);
}

/**
 * Create coaching content
 */
async function createCoachingContent(contentElement, dataSource) {
    try {
        // Load the original coaching HTML content
        const response = await fetch('coaching_overlay.html');
        if (!response.ok) {
            throw new Error(`Could not load coaching_overlay.html: ${response.statusText}`);
        }
        
        const html = await response.text();
        
        // Extract only the body content
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const bodyContent = doc.body.innerHTML;
        
        // Extract and add styles to overlay only
        const styles = doc.head.getElementsByTagName('style');
        // IMPORTANT: Do not append styles to light DOM; we will inject them into the shadowRoot only
        // for (let style of styles) {
        //     const existingStyle = contentElement.querySelector(`style[data-coaching-overlay]`);
        //     if (!existingStyle) {
        //         const newStyle = style.cloneNode(true);
        //         newStyle.setAttribute('data-coaching-overlay', 'true');
        //         contentElement.appendChild(newStyle);
        //     }
        // }
        
        // Scripts are handled by the main page, no need to inject them
        
        // Render inside Shadow DOM to isolate from host page CSS
        const shadowRoot = contentElement.shadowRoot || contentElement.attachShadow({ mode: 'open' });
        // Inject styles into shadow
        const shadowStyleContainer = document.createElement('div');
        for (let styleEl of styles) {
            const cloned = styleEl.cloneNode(true);
            shadowStyleContainer.appendChild(cloned);
        }
        // Set content and prepend styles
        shadowRoot.innerHTML = '';
        shadowRoot.appendChild(shadowStyleContainer);
        const contentWrapper = document.createElement('div');
        contentWrapper.innerHTML = bodyContent;
        shadowRoot.appendChild(contentWrapper);

        // Constrain dialog popup height inside shadow root
        const dialogMaxHeightStyle = document.createElement('style');
        dialogMaxHeightStyle.textContent = `
            .dialog-popup {
                max-height: 100%;
            }
            #transcriptContent {
                max-height: 371px;
                overflow-y: auto;
            }
        `;
        shadowRoot.appendChild(dialogMaxHeightStyle);
        // Ensure client bubble grows like coach (no internal scroll)
        const bubbleGrowStyle = document.createElement('style');
        bubbleGrowStyle.textContent = `
            #rightBubble { max-height: none !important; overflow: visible !important; }
            #rightTextarea { overflow: hidden !important; resize: none !important; }
        `;
        shadowRoot.appendChild(bubbleGrowStyle);
        
        // Hide client figure immediately to avoid wrong color
        const clientCircle = shadowRoot.querySelector('#clientCircle');
        if (clientCircle) {
            clientCircle.style.opacity = '0';
            clientCircle.style.visibility = 'hidden';
            debugLog('Hidden client figure immediately');
        }
        
        // Ensure consistent CSS variables across host pages (keeps positions identical)
        const dialogPopup = shadowRoot.querySelector('.dialog-popup');
        if (dialogPopup) {
            dialogPopup.style.setProperty('--left-figure-offset-x', '-90px');
            dialogPopup.style.setProperty('--left-figure-offset-y', '-20px');
            dialogPopup.style.setProperty('--right-figure-offset-x', '90px');
            dialogPopup.style.setProperty('--right-figure-offset-y', '-20px');
            dialogPopup.style.setProperty('--left-bubble-left', '120px');
            dialogPopup.style.setProperty('--left-bubble-offset-y', '-20px');
            dialogPopup.style.setProperty('--right-bubble-right', '120px');
            dialogPopup.style.setProperty('--right-bubble-offset-y', '-20px');
            dialogPopup.style.setProperty('--controls-margin-top', '75px');
        }
        
        // Ensure participants section can overlap header where needed
        const overlayParticipantsSection = shadowRoot.querySelector('.overlay-participants-section');
        if (overlayParticipantsSection) {
            overlayParticipantsSection.style.zIndex = '10002';
            overlayParticipantsSection.style.position = 'relative';
            // Position is controlled via CSS variables above
            overlayParticipantsSection.style.top = '';
        }
        
        // Ensure controls remain interactive above figures
        const controlsBar = shadowRoot.querySelector('.controls');
        if (controlsBar) {
            controlsBar.style.zIndex = '10003';
            controlsBar.style.position = 'relative';
        }
        
        // Ensure placeholder participant divs do not block header drag
        const placeholderParticipants = shadowRoot.querySelectorAll('.overlay-participant');
        placeholderParticipants.forEach(el => {
            el.style.pointerEvents = 'none';
        });

        // Re-enable pointer events on interactive elements (speech bubbles, controls)
        const controls = shadowRoot.querySelector('.controls');
        const leftBubbleEl = shadowRoot.querySelector('#leftBubble');
        const rightBubbleEl = shadowRoot.querySelector('#rightBubble');
        if (leftBubbleEl) leftBubbleEl.style.pointerEvents = 'auto';
        if (rightBubbleEl) rightBubbleEl.style.pointerEvents = 'auto';
        if (controls) controls.style.pointerEvents = 'auto';

        // Auto-resize client textarea so bubble grows with content
        const rightTextarea = shadowRoot.querySelector('#rightTextarea');
        if (rightTextarea) {
            const autoResize = () => {
                rightTextarea.style.height = 'auto';
                rightTextarea.style.height = rightTextarea.scrollHeight + 'px';
            };
            rightTextarea.addEventListener('input', autoResize);
            // Initialize once
            autoResize();
        }
        
        // Ensure pose library is available when not coming from compare_01.html
        await loadPoseLibraryIfMissing();

        // Initialize coaching system
        // Expose shadow root for later updates
        if (window.coachingOverlay) {
            window.coachingOverlay.contentRoot = shadowRoot;
        }
        // From now on, pass shadowRoot as the content element for isolation
        initializeCoachingSystem(shadowRoot, dataSource);
        
    } catch (error) {
        debugLog('Error loading coaching content:', error);
        // Fallback to simple content
        contentElement.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <h2 style="color: #e74c3c; margin-bottom: 20px;">Fejl ved indlæsning</h2>
                <p style="color: #666; margin-bottom: 30px;">Kunne ikke indlæse coaching indhold: ${error.message}</p>
                <button onclick="closeCoachingOverlay()" style="
                    background: #6c757d;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 16px;
                ">Luk Overlay</button>
            </div>
        `;
    }
}

/**
 * Initialize the coaching system
 */
function initializeCoachingSystem(contentElement, dataSource) {
    // Wait for DOM to be ready
    setTimeout(() => {
        try {
            // Set up the data source globally
            window.currentDataSource = dataSource;
            debugLog('Set currentDataSource to:', dataSource);
            
            // Wait for CoachEngine to be available
            waitForCoachEngine(contentElement, dataSource);
            
        } catch (error) {
            debugLog('Error initializing coaching system:', error);
        }
    }, 200);
}

/**
 * Wait for CoachEngine to be available
 */
function waitForCoachEngine(contentElement, dataSource) {
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds max
    
    const checkCoachEngine = async () => {
        attempts++;
        debugLog('Checking for CoachEngine, attempt:', attempts);
        
        if (typeof window.CoachEngine === 'function' || typeof CoachEngine === 'function') {
            debugLog('CoachEngine found! Starting coaching...');
            await startCoachingSession(contentElement, dataSource);
        } else if (attempts >= maxAttempts) {
            debugLog('Timeout waiting for CoachEngine');
            // Show error message
            const transcriptContent = contentElement.querySelector('#transcriptContent');
            if (transcriptContent) {
                transcriptContent.innerHTML = `
                    <div style="text-align: center; padding: 20px; color: #e74c3c;">
                        <h3>Fejl</h3>
                        <p>CoachEngine kunne ikke indlæses</p>
                    </div>
                `;
            }
        } else {
            setTimeout(checkCoachEngine, 100);
        }
    };
    
    checkCoachEngine();
}

/**
 * Start coaching session
 */
async function startCoachingSession(contentElement, dataSource) {
    try {
        // Reset transcript for a fresh session
        overlayTranscript = [];
        // First try to load from localStorage
        let projectData = localStorage.getItem(dataSource);
        
        if (!projectData) {
            debugLog('No project data found in localStorage for:', dataSource);
            debugLog('Available localStorage keys:', Object.keys(localStorage));
            
            // Try to find the data with a different key
            const possibleKeys = Object.keys(localStorage).filter(key => key.includes('coaching') || key.includes('compare'));
            debugLog('Possible coaching keys:', possibleKeys);
            
            if (possibleKeys.length > 0) {
                const actualKey = possibleKeys[0];
                debugLog('Using key:', actualKey);
                projectData = localStorage.getItem(actualKey);
            }
        }
        
        // If still no data, try to load from file
        if (!projectData) {
            debugLog('Trying to load from file:', dataSource);
            try {
                const response = await fetch(dataSource);
                if (response.ok) {
                    projectData = await response.text();
                    debugLog('Loaded project data from file:', dataSource);
                } else {
                    debugLog('Could not load file:', dataSource);
                }
            } catch (error) {
                debugLog('Error loading file:', error);
            }
        }
        
        // Check if comparisonData exists in localStorage
        const comparisonData = localStorage.getItem('comparisonData');
        if (!comparisonData) {
            debugLog('No comparisonData found in localStorage - coaching may not work correctly');
        } else {
            debugLog('Found comparisonData in localStorage:', JSON.parse(comparisonData));
        }
        
        if (!projectData) {
            // Show error message
            const transcriptContent = contentElement.querySelector('#transcriptContent');
            if (transcriptContent) {
                transcriptContent.innerHTML = `
                    <div style="text-align: center; padding: 20px; color: #e74c3c;">
                        <h3>Fejl</h3>
                        <p>Ingen coaching data fundet</p>
                        <p>Prøv at gemme en session først</p>
                    </div>
                `;
            }
            return;
        }
        
        const project = JSON.parse(projectData);
        debugLog('Loaded project:', project);
        
        // Prepare variables like the original system
        let variables = { ...project.variables };
        
        // Merge external data if it exists in the project
        if (project.variables && project.variables.Data) {
            debugLog('Found Data key in project, loading external data from:', project.variables.Data);
            
            try {
                const externalData = localStorage.getItem(project.variables.Data);
                if (externalData) {
                    const loaded = JSON.parse(externalData);
                    if (loaded && typeof loaded === 'object') {
                        // Merge external data into variables
                        Object.keys(loaded).forEach(key => {
                            variables[key] = loaded[key];
                        });
                        debugLog('Merged external data into variables:', variables);
                        
                        // Merge project.variables with loaded data for UI (project.variables takes precedence for You_pose, You_color, etc.)
                        const uiData = { ...loaded, ...project.variables };
                        
                        // Load external data for UI (colors, poses, names)
                        loadExternalDataForUI(contentElement, uiData);
                    }
                }
            } catch (e) {
                debugLog('Error merging external data:', e);
            }
        } else if (project.variables && (project.variables.You_color || project.variables.You_pose !== undefined || project.variables.Other_pose !== undefined || project.variables.You_pose_flipped !== undefined || project.variables.Other_pose_flipped !== undefined)) {
            // If You_color, You_pose, Other_pose, You_pose_flipped, or Other_pose_flipped are directly in project.variables, use them for UI
            loadExternalDataForUI(contentElement, project.variables);
        }
        
        // Create engine with session and merged variables
        const CoachEngineClass = window.CoachEngine || CoachEngine;
        currentEngine = new CoachEngineClass(project.session, variables);
        
        // Start the coaching session
        currentQuestion = currentEngine.start();
        
        // Set session as active
        window.coachingActive = true;
        
        // Show the first question
        showCoachingQuestion(contentElement, currentQuestion);
        
        // Set up event listeners
        setupCoachingEventListeners(contentElement);
        
        debugLog('Coaching session started, current question:', currentQuestion);
        
    } catch (error) {
        debugLog('Error starting coaching session:', error);
    }
}

/**
 * Load external data for UI (colors, poses, names)
 */
function loadExternalDataForUI(contentElement, loaded) {
    try {
        debugLog('Loading external data for UI:', loaded);
        
        // Update client name if available
        if (loaded.You) {
            const clientName = contentElement.querySelector('#clientName');
            if (clientName) {
                clientName.textContent = loaded.You;
            }
        }
        
        // Update client color if available
        if (loaded.You_color) {
            debugLog('Setting client color to:', loaded.You_color);
            // Store color for later use
            window.popupClientColor = loaded.You_color;
        }
        
        // Apply pose if available
        if (loaded.You_pose !== undefined) {
            debugLog('Setting client pose to:', loaded.You_pose);
            // Store pose for later use when poseLibrary is loaded
            window.pendingClientPose = loaded.You_pose;
        }
        
        // Apply client flipped if available
        if (loaded.You_pose_flipped !== undefined) {
            debugLog('Setting client flipped to:', loaded.You_pose_flipped);
            // Convert string "true"/"false" to boolean
            window.pendingClientFlipped = loaded.You_pose_flipped === true || loaded.You_pose_flipped === "true";
        }
        
        // Apply coach pose if available (Other_pose)
        if (loaded.Other_pose !== undefined) {
            debugLog('Setting coach pose to:', loaded.Other_pose);
            // Store pose for later use when poseLibrary is loaded
            window.pendingCoachPose = loaded.Other_pose;
        }
        
        // Apply coach flipped if available (Other_pose_flipped)
        if (loaded.Other_pose_flipped !== undefined) {
            debugLog('Setting coach flipped to:', loaded.Other_pose_flipped);
            // Convert string "true"/"false" to boolean
            window.pendingCoachFlipped = loaded.Other_pose_flipped === true || loaded.Other_pose_flipped === "true";
        }
        
        // Store loaded data globally for use in coaching engine
        window.loadedExternalData = loaded;
        
        // Update colors BEFORE showing client figure
        updatePopupColors(contentElement);
        debugLog('Updated colors before showing client');
        
        // Wait for poseLibrary to be loaded before applying poses
        setTimeout(() => {
            // Ensure poseLibrary is available globally
            if (typeof poseLibrary !== 'undefined' && !window.poseLibrary) {
                window.poseLibrary = poseLibrary;
                debugLog('Set window.poseLibrary from global poseLibrary');
            }
            waitForPoseLibraryAndApplyPoses();
        }, 100);
        
        // Show client figure after colors are set
        const clientCircle = contentElement.querySelector('#clientCircle');
        if (clientCircle) {
            clientCircle.style.visibility = 'visible';
            clientCircle.style.opacity = '1';
            clientCircle.style.transition = 'opacity 0.5s ease-in-out';
            debugLog('Showed client figure with correct colors');
        }
        
        // Apply client pose if pending
        if (window.pendingClientPose !== undefined && window.pendingClientPose !== null) {
            applyPendingPose();
            debugLog('Applied client pose after colors are set');
        }
        
    } catch (e) {
        debugLog('Error loading external data for UI:', e);
    }
}

/**
 * Update popup colors (speech bubbles and figures)
 */
function updatePopupColors(contentElement) {
    try {
        const coachColor = '#667eea'; // Fixed coach color
        const clientColor = window.popupClientColor || '#f093fb'; // Default client color
        
        debugLog('updatePopupColors - coachColor:', coachColor, 'clientColor:', clientColor);
        debugLog('window.popupClientColor:', window.popupClientColor);
        
        // Calculate light colors
        const coachLightColor = lightenColor(coachColor, 0.6);
        const clientLightColor = lightenColor(clientColor, 0.6);
        
        debugLog('Calculated light colors - coach:', coachLightColor, 'client:', clientLightColor);
        
        // Update speech bubble colors and ensure proper z-index
        const leftBubble = contentElement.querySelector('#leftBubble');
        const rightBubble = contentElement.querySelector('#rightBubble');
        
        if (leftBubble) {
            leftBubble.style.backgroundColor = coachLightColor;
            leftBubble.style.zIndex = '10002';
        }
        if (rightBubble) {
            rightBubble.style.backgroundColor = clientLightColor;
            rightBubble.style.zIndex = '10002';
        }
        
        // Update coach figure colors and ensure proper positioning
        const coachCircle = contentElement.querySelector('#coachCircle');
        if (coachCircle) {
            const coachHead = coachCircle.querySelector('.head');
            const coachTorso = coachCircle.querySelector('.participant-torso');
            const coachArmParts = coachCircle.querySelectorAll('.arm_geo_left, .arm_geo_right, .albue_geo_left, .albue_geo_right');
            const coachLegParts = coachCircle.querySelectorAll('.laar_geo_left, .laar_geo_right, .skinneben_geo_left, .skinneben_geo_right');
            
            if (coachHead) coachHead.style.background = coachColor;
            if (coachTorso) coachTorso.style.background = coachColor;
            
            // Arme og ben får mørkere farve (15% mørkere)
            const coachDarkerColor = darkenColor(coachColor, 0.85);
            coachArmParts.forEach(part => part.style.background = coachDarkerColor);
            coachLegParts.forEach(part => part.style.background = coachDarkerColor);
            
            // Ensure proper z-index
            coachCircle.style.zIndex = '10';
        }
        
        // Update client figure colors and ensure proper positioning
        const clientCircle = contentElement.querySelector('#clientCircle');
        if (clientCircle) {
            const head = clientCircle.querySelector('.head');
            const torso = clientCircle.querySelector('.participant-torso');
            const armParts = clientCircle.querySelectorAll('.arm_geo_left, .arm_geo_right, .albue_geo_left, .albue_geo_right');
            const legParts = clientCircle.querySelectorAll('.laar_geo_left, .laar_geo_right, .skinneben_geo_left, .skinneben_geo_right');
            
            if (head) head.style.background = clientColor;
            if (torso) torso.style.background = clientColor;
            
            // Arme og ben får mørkere farve (15% mørkere)
            const darkerColor = darkenColor(clientColor, 0.85);
            armParts.forEach(part => part.style.background = darkerColor);
            legParts.forEach(part => part.style.background = darkerColor);
            
            // Ensure proper z-index
            clientCircle.style.zIndex = '10';
        }
        
        // Update speech bubble triangle colors with dynamic CSS inside the same root (shadow)
        updateSpeechBubbleTriangles(contentElement, coachLightColor, clientLightColor);
        
        debugLog('Updated popup colors - coach:', coachColor, 'client:', clientColor);
        
    } catch (e) {
        debugLog('Error updating popup colors:', e);
    }
}

/**
 * Update speech bubble triangle colors with dynamic CSS
 */
function updateSpeechBubbleTriangles(rootEl, coachLightColor, clientLightColor) {
    try {
        // Prefer shadow root (rootEl) for style scoping
        const styleHost = (rootEl && typeof rootEl.querySelector === 'function') ? rootEl : document.getElementById('coachingOverlay');
        if (styleHost) {
            const existingStyle = styleHost.querySelector('#speech-bubble-triangles-style');
            if (existingStyle && existingStyle.parentNode) existingStyle.parentNode.removeChild(existingStyle);

            // Create new dynamic style within the style host
            const style = document.createElement('style');
            style.id = 'speech-bubble-triangles-style';
            style.textContent = `
                .speech-bubble.left::after { 
                    border-color: transparent ${coachLightColor} transparent transparent !important; 
                }
                .speech-bubble.right::after { 
                    border-color: transparent transparent transparent ${clientLightColor} !important; 
                }
            `;
            styleHost.appendChild(style);
        }
        
        debugLog('Updated speech bubble triangle colors - coach:', coachLightColor, 'client:', clientLightColor);
        
    } catch (e) {
        debugLog('Error updating speech bubble triangle colors:', e);
    }
}

/**
 * Apply pose to figure (matching original coaching_overlay.html structure)
 */
function applyPose(side, poseIndex) {
    debugLog('applyPose called with:', { side, poseIndex });
    
    // Try to find circle within shadow root first, then fallback to light DOM
    let circle = null;
    const root = (coachingOverlay && coachingOverlay.content && coachingOverlay.content.shadowRoot)
        ? coachingOverlay.content.shadowRoot
        : null;
    if (root) {
        circle = root.querySelector('#' + side + 'Circle');
    }
    // Only search within overlay, not on main page
    if (!circle) {
        const overlay = document.getElementById('coachingOverlay');
        if (overlay) circle = overlay.querySelector('#' + side + 'Circle');
    }
    
    if (!circle) {
        debugLog('No circle found for side:', side);
        debugLog('Available elements with Circle:', document.querySelectorAll('#coachingOverlay [id*="Circle"]'));
        debugLog('Available elements in overlay:', document.querySelectorAll('#coachingOverlay [id*="Circle"]'));
        return;
    }
    
    debugLog('Found circle for', side, ':', circle);
    
    // Check if pose library is loaded (use global poseLibrary from compare_01.html)
    let poseLib = window.poseLibrary;
    if (!poseLib && typeof poseLibrary !== 'undefined') {
        poseLib = poseLibrary;
        window.poseLibrary = poseLibrary; // Set it globally for future use
    }
    
    if (!poseLib || poseLib.length === 0) {
        debugLog('Pose library not loaded yet, skipping pose application for', side, poseIndex);
        debugLog('Available poseLibrary:', typeof poseLibrary, poseLibrary);
        debugLog('Available window.poseLibrary:', typeof window.poseLibrary, window.poseLibrary);
        return;
    }
    
    // Handle string pose names by finding the index
    if (typeof poseIndex === 'string') {
        debugLog('Looking for pose:', poseIndex);
        debugLog('Available poses:', poseLib.map(p => p.name));
        const foundIndex = poseLib.findIndex(p => p && p.name === poseIndex);
        if (foundIndex !== -1) {
            poseIndex = foundIndex;
            debugLog('Found pose at index:', poseIndex);
        } else {
            debugLog('Pose not found:', poseIndex);
            debugLog('Available poses:', poseLib.map(p => p.name));
            resetPose(side);
            return;
        }
    }
    
    // Map empty to standard index if available
    if (poseIndex === '') {
        const standardIndex = poseLib.findIndex(p => p && p.name === 'standard');
        if (standardIndex !== -1) {
            poseIndex = standardIndex;
        } else {
            resetPose(side);
            return;
        }
    }
    
    // Add smooth transitions to all animated elements (matching original)
    const animatedElements = circle.querySelectorAll(
        '.skulder_translate_left, .skulder_rotate_left, .albue_rotate_left, ' +
        '.skulder_translate_right, .skulder_rotate_right, .albue_rotate_right, ' +
        '.hofte_translate_left, .hofte_rotate_left, .knae_rotate_left, ' +
        '.hofte_translate_right, .hofte_rotate_right, .knae_rotate_right'
    );
    
    animatedElements.forEach(element => {
        element.style.transition = 'transform 0.8s cubic-bezier(0.25, 0.1, 0.25, 1)';
    });
    
    const pose = poseLib[poseIndex];
    debugLog('Found pose at index', poseIndex, ':', pose);
    if (!pose) {
        debugLog('No pose found at index:', poseIndex, 'Available poses:', poseLib.map(p => p.name));
        return;
    }
    
    let poseData = pose.pose;
    debugLog('Applying pose data:', poseData);
    
    // Apply transforms to figure parts (matching original structure exactly)
    const skulderLeft = circle.querySelector('.skulder_translate_left');
    const skulderRight = circle.querySelector('.skulder_translate_right');
    const hofteLeft = circle.querySelector('.hofte_translate_left');
    const hofteRight = circle.querySelector('.hofte_translate_right');
    
    if (skulderLeft) {
        skulderLeft.style.transform = `translate(${poseData.translate_x_left || 0}px, ${poseData.translate_y_left || 0}px)`;
    }
    if (skulderRight) {
        skulderRight.style.transform = `translate(${poseData.translate_x || 0}px, ${poseData.translate_y || 0}px)`;
    }
    if (hofteLeft) {
        hofteLeft.style.transform = `translate(${poseData.translate_x_left_leg || 0}px, ${poseData.translate_y_left_leg || 0}px)`;
    }
    if (hofteRight) {
        hofteRight.style.transform = `translate(${poseData.translate_x_right_leg || 0}px, ${poseData.translate_y_right_leg || 0}px)`;
    }
    
    // Apply rotations (matching original structure exactly)
    const skulderRotLeft = circle.querySelector('.skulder_rotate_left');
    const skulderRotRight = circle.querySelector('.skulder_rotate_right');
    const albueRotLeft = circle.querySelector('.albue_rotate_left');
    const albueRotRight = circle.querySelector('.albue_rotate_right');
    const hofteRotLeft = circle.querySelector('.hofte_rotate_left');
    const hofteRotRight = circle.querySelector('.hofte_rotate_right');
    const knaeRotLeft = circle.querySelector('.knae_rotate_left');
    const knaeRotRight = circle.querySelector('.knae_rotate_right');
    
    if (skulderRotLeft) {
        skulderRotLeft.style.transform = `rotate(${poseData.skulder_rot_left || 0}deg)`;
    }
    if (skulderRotRight) {
        skulderRotRight.style.transform = `rotate(${poseData.skulder_rot || 0}deg)`;
    }
    if (albueRotLeft) {
        albueRotLeft.style.transform = `rotate(${poseData.albue_rot_left || 0}deg)`;
    }
    if (albueRotRight) {
        albueRotRight.style.transform = `rotate(${poseData.albue_rot || 0}deg)`;
    }
    if (hofteRotLeft) {
        hofteRotLeft.style.transform = `rotate(${poseData.hofte_rot_left || 0}deg)`;
    }
    if (hofteRotRight) {
        hofteRotRight.style.transform = `rotate(${poseData.hofte_rot_right || 0}deg)`;
    }
    if (knaeRotLeft) {
        knaeRotLeft.style.transform = `rotate(${poseData.knae_rot_left || 0}deg)`;
    }
    if (knaeRotRight) {
        knaeRotRight.style.transform = `rotate(${poseData.knae_rot_right || 0}deg)`;
    }
    
    // Handle arm layering
    if (poseData.left_arm_front) {
        skulderLeft?.classList.add('front-arm');
    } else {
        skulderLeft?.classList.remove('front-arm');
    }
    
    if (poseData.right_arm_front) {
        skulderRight?.classList.add('front-arm');
    } else {
        skulderRight?.classList.remove('front-arm');
    }
    
    // Store pose state on DOM element
    const participant = circle.parentElement;
    if (participant) {
        participant.setAttribute('data-pose', poseIndex);
    }
    
    // Apply flipped/mirror if needed
    applyFlipped(side, circle);
}

/**
 * Apply flipped/mirror transform to figure
 */
function applyFlipped(side, circle) {
    let shouldFlip = false;
    
    if (side === 'client' && window.pendingClientFlipped !== undefined) {
        shouldFlip = window.pendingClientFlipped;
    } else if (side === 'coach' && window.pendingCoachFlipped !== undefined) {
        shouldFlip = window.pendingCoachFlipped;
    }
    
    // Store original transform on first call if not already stored
    if (!circle.dataset.originalTransform) {
        // Get the original transform from inline style or CSS
        const inlineTransform = circle.style.transform;
        if (inlineTransform && inlineTransform !== 'none') {
            circle.dataset.originalTransform = inlineTransform;
        } else {
            // Get from computed style (will have CSS variables resolved)
            const computedStyle = window.getComputedStyle(circle);
            const computedTransform = computedStyle.transform;
            // If it's a matrix, construct from CSS variables instead
            if (computedTransform && computedTransform !== 'none' && !computedTransform.includes('matrix')) {
                circle.dataset.originalTransform = computedTransform;
            } else {
                // Get from CSS variables
                const root = circle.getRootNode();
                const dialogPopup = root instanceof ShadowRoot ? 
                    (root.host ? root.host.closest('.dialog-popup') : root.querySelector('.dialog-popup')) : 
                    document.querySelector('.dialog-popup');
                
                if (dialogPopup) {
                    const style = window.getComputedStyle(dialogPopup);
                    if (side === 'coach') {
                        const offsetX = style.getPropertyValue('--left-figure-offset-x').trim() || '-90px';
                        const offsetY = style.getPropertyValue('--left-figure-offset-y').trim() || '-20px';
                        circle.dataset.originalTransform = `translate(${offsetX}, ${offsetY})`;
                    } else {
                        const offsetX = style.getPropertyValue('--right-figure-offset-x').trim() || '90px';
                        const offsetY = style.getPropertyValue('--right-figure-offset-y').trim() || '-20px';
                        circle.dataset.originalTransform = `translate(${offsetX}, ${offsetY})`;
                    }
                } else {
                    // Last resort: use default values
                    if (side === 'coach') {
                        circle.dataset.originalTransform = 'translate(-90px, -20px)';
                    } else {
                        circle.dataset.originalTransform = 'translate(90px, -20px)';
                    }
                }
            }
        }
    }
    
    // Use stored original transform as base
    const baseTransform = circle.dataset.originalTransform || '';
    
    // Apply flip on top of base transform
    if (shouldFlip) {
        // Remove any existing scaleX first
        const cleanTransform = baseTransform.replace(/\s*scaleX\([^)]+\)/g, '').trim();
        circle.style.transform = cleanTransform ? `${cleanTransform} scaleX(-1)` : 'scaleX(-1)';
    } else {
        // Just use base transform without scaleX
        const cleanTransform = baseTransform.replace(/\s*scaleX\([^)]+\)/g, '').trim();
        circle.style.transform = cleanTransform || 'none';
    }
    
    // Counter-flip the head element so text doesn't flip
    const head = circle.querySelector('.head');
    if (head) {
        // Store original head transform on first call if not already stored
        if (!head.dataset.originalTransform) {
            const headInlineTransform = head.style.transform || '';
            if (headInlineTransform && headInlineTransform !== 'none') {
                // Remove any existing scaleX from original
                head.dataset.originalTransform = headInlineTransform.replace(/\s*scaleX\([^)]+\)/g, '').trim();
            } else {
                // Get from computed style
                const computedStyle = window.getComputedStyle(head);
                const computedTransform = computedStyle.transform;
                if (computedTransform && computedTransform !== 'none') {
                    // Extract translateX if it's a matrix, or use as-is
                    const translateXMatch = computedTransform.match(/translateX\([^)]+\)/);
                    if (translateXMatch) {
                        head.dataset.originalTransform = translateXMatch[0];
                    } else {
                        // Default to translateX(-50%) which is common for centered heads
                        head.dataset.originalTransform = 'translateX(-50%)';
                    }
                } else {
                    // Default to translateX(-50%) which is common for centered heads
                    head.dataset.originalTransform = 'translateX(-50%)';
                }
            }
        }
        
        // Use stored original head transform as base
        const headBaseTransform = head.dataset.originalTransform || '';
        
        // Remove any existing scaleX from head
        const cleanHeadTransform = headBaseTransform.replace(/\s*scaleX\([^)]+\)/g, '').trim();
        
        // Counter-flip head when parent is flipped
        if (shouldFlip) {
            head.style.transform = cleanHeadTransform ? `${cleanHeadTransform} scaleX(-1)` : 'scaleX(-1)';
        } else {
            head.style.transform = cleanHeadTransform || 'none';
        }
    }
    
    debugLog('Applied flipped to', side, ':', shouldFlip, 'base transform:', baseTransform, 'final:', circle.style.transform);
}

// Make applyPose globally available for debugging
window.applyPose = applyPose;

// Make poseLibrary globally available for debugging
if (typeof poseLibrary !== 'undefined') {
    window.poseLibrary = poseLibrary;
}

// Make waitForPoseLibraryAndApplyPoses globally available for debugging
window.waitForPoseLibraryAndApplyPoses = waitForPoseLibraryAndApplyPoses;

/**
 * Reset pose to default (matching original structure)
 */
function resetPose(side) {
    let circle = null;
    const root = (coachingOverlay && coachingOverlay.content && coachingOverlay.content.shadowRoot)
        ? coachingOverlay.content.shadowRoot
        : null;
    if (root) circle = root.querySelector('#' + side + 'Circle');
    // Only search within overlay, not on main page
    if (!circle) {
        const overlay = document.getElementById('coachingOverlay');
        if (overlay) circle = overlay.querySelector('#' + side + 'Circle');
    }
    if (!circle) return;
    
    const animatedElements = circle.querySelectorAll(
        '.skulder_translate_left, .skulder_rotate_left, .albue_rotate_left, ' +
        '.skulder_translate_right, .skulder_rotate_right, .albue_rotate_right, ' +
        '.hofte_translate_left, .hofte_rotate_left, .knae_rotate_left, ' +
        '.hofte_translate_right, .hofte_rotate_right, .knae_rotate_right'
    );
    
    animatedElements.forEach(element => {
        element.style.transform = '';
        element.style.transition = 'transform 0.8s cubic-bezier(0.25, 0.1, 0.25, 1)';
    });
    
    // Reset arm layering
    const skulderLeft = circle.querySelector('.skulder_translate_left');
    const skulderRight = circle.querySelector('.skulder_translate_right');
    skulderLeft?.classList.remove('front-arm');
    skulderRight?.classList.remove('front-arm');
}

/**
 * Lighten a color by a factor
 */
function lightenColor(color, factor = 0.6) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    
    const newR = Math.round(r + (255 - r) * factor);
    const newG = Math.round(g + (255 - g) * factor);
    const newB = Math.round(b + (255 - b) * factor);
    
    return `rgb(${newR}, ${newG}, ${newB})`;
}

/**
 * Darken a color by a factor
 */
function darkenColor(color, factor) {
    // Convert hex to RGB
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Darken
    const newR = Math.round(r * factor);
    const newG = Math.round(g * factor);
    const newB = Math.round(b * factor);
    
    // Convert back to hex
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

/**
 * Wait for poseLibrary to be loaded and then apply poses
 */
function waitForPoseLibraryAndApplyPoses() {
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds max
    
    const checkPoseLibrary = () => {
        attempts++;
        debugLog('Checking for poseLibrary, attempt:', attempts);
        
        // Check both window.poseLibrary and global poseLibrary
        let poseLib = window.poseLibrary;
        if (!poseLib && typeof poseLibrary !== 'undefined') {
            poseLib = poseLibrary;
            window.poseLibrary = poseLibrary; // Set it globally for future use
            debugLog('Found global poseLibrary and set it globally');
        }
        
        if (poseLib && poseLib.length > 0) {
            debugLog('poseLibrary loaded! Applying initial poses...');
            debugLog('Available poses:', poseLib.map(p => p.name));
            
            // Set initial coach pose - use Other_pose if available, otherwise default to "tænke" (index 2)
            if (window.pendingCoachPose !== undefined && window.pendingCoachPose !== null) {
                applyPose('coach', window.pendingCoachPose);
                debugLog('Set coach to Other_pose:', window.pendingCoachPose);
            } else {
                applyPose('coach', 2);
                debugLog('Set coach to tænke pose (index 2)');
            }
            
            // Apply client pose if pending (but don't hide client again)
            if (window.pendingClientPose !== undefined && window.pendingClientPose !== null) {
                applyPose('client', window.pendingClientPose);
                debugLog('Applied pending client pose');
            }
            
            // Apply flipped states after poses are applied
            const coachCircle = document.querySelector('#coachingOverlay #coachCircle') || 
                              (coachingOverlay && coachingOverlay.content && coachingOverlay.content.shadowRoot && 
                               coachingOverlay.content.shadowRoot.querySelector('#coachCircle'));
            if (coachCircle && window.pendingCoachFlipped !== undefined) {
                applyFlipped('coach', coachCircle);
            }
            
            const clientCircle = document.querySelector('#coachingOverlay #clientCircle') || 
                               (coachingOverlay && coachingOverlay.content && coachingOverlay.content.shadowRoot && 
                                coachingOverlay.content.shadowRoot.querySelector('#clientCircle'));
            if (clientCircle && window.pendingClientFlipped !== undefined) {
                applyFlipped('client', clientCircle);
            }
            
        } else if (attempts >= maxAttempts) {
            debugLog('Timeout waiting for poseLibrary');
        } else {
            setTimeout(checkPoseLibrary, 100);
        }
    };
    
    checkPoseLibrary();
}

/**
 * Load pose library if it's missing (from Standard_new_poses.json)
 */
async function loadPoseLibraryIfMissing() {
    try {
        if (window.poseLibrary && Array.isArray(window.poseLibrary) && window.poseLibrary.length > 0) return;
        // Try global variable
        if (typeof poseLibrary !== 'undefined' && poseLibrary && poseLibrary.length > 0) {
            window.poseLibrary = poseLibrary;
            return;
        }
        // Fetch from JSON file in workspace
        const resp = await fetch('Standard_new_poses.json');
        if (resp.ok) {
            const data = await resp.json();
            if (Array.isArray(data)) {
                window.poseLibrary = data;
                debugLog('Loaded poseLibrary from Standard_new_poses.json');
            }
        } else {
            debugLog('Could not load Standard_new_poses.json:', resp.status);
        }
    } catch (e) {
        debugLog('Error loading pose library:', e);
    }
}

/**
 * Wait for poseLibrary and apply coach pose
 */
function waitForPoseLibraryAndApplyCoachPose(poseName) {
    let attempts = 0;
    const maxAttempts = 10; // 1 second max
    
    const checkPoseLibrary = () => {
        attempts++;
        debugLog('Checking for poseLibrary for coach pose, attempt:', attempts);
        
        let poseLib = window.poseLibrary;
        if (!poseLib && typeof poseLibrary !== 'undefined') {
            poseLib = poseLibrary;
            window.poseLibrary = poseLibrary;
        }
        if (poseLib && poseLib.length > 0) {
            debugLog('poseLibrary loaded! Applying coach pose:', poseName);
            
            // Convert pose name to index
            let poseIndex = poseName;
            if (typeof poseName === 'string') {
                const foundIndex = poseLib.findIndex(p => p && p.name === poseName);
                if (foundIndex !== -1) {
                    poseIndex = foundIndex;
                } else {
                    debugLog('Pose not found:', poseName);
                    return;
                }
            }
            
            applyPose('coach', poseIndex);
            debugLog('Coach transitioned to', poseName, 'pose (index', poseIndex, ')');
            
            // Re-apply flipped state after pose is applied
            const coachCircle = document.querySelector('#coachingOverlay #coachCircle') || 
                              (coachingOverlay && coachingOverlay.content && coachingOverlay.content.shadowRoot && 
                               coachingOverlay.content.shadowRoot.querySelector('#coachCircle'));
            if (coachCircle && window.pendingCoachFlipped !== undefined) {
                applyFlipped('coach', coachCircle);
            }
            
        } else if (attempts >= maxAttempts) {
            debugLog('Timeout waiting for poseLibrary for coach pose');
        } else {
            setTimeout(checkPoseLibrary, 100);
        }
    };
    
    checkPoseLibrary();
}

/**
 * Wait for poseLibrary and apply client pose
 */
function waitForPoseLibraryAndApplyClientPose(poseIndex) {
    let attempts = 0;
    const maxAttempts = 10; // 1 second max
    
    const checkPoseLibrary = () => {
        attempts++;
        debugLog('Checking for poseLibrary for client pose, attempt:', attempts);
        
        let poseLib = window.poseLibrary;
        if (!poseLib && typeof poseLibrary !== 'undefined') {
            poseLib = poseLibrary;
            window.poseLibrary = poseLibrary;
        }
        if (poseLib && poseLib.length > 0) {
            debugLog('poseLibrary loaded! Applying client pose:', poseIndex);
            // Ensure standard (0) maps to an existing pose, fallback to 0
            let finalIndex = poseIndex;
            if (typeof finalIndex === 'number') {
                if (finalIndex < 0 || finalIndex >= poseLib.length || !poseLib[finalIndex]) {
                    finalIndex = 0;
                }
            }
            applyPose('client', finalIndex);
            debugLog('Applied client pose:', poseIndex);
            
            // Re-apply flipped state after pose is applied
            const clientCircle = document.querySelector('#coachingOverlay #clientCircle') || 
                               (coachingOverlay && coachingOverlay.content && coachingOverlay.content.shadowRoot && 
                                coachingOverlay.content.shadowRoot.querySelector('#clientCircle'));
            if (clientCircle && window.pendingClientFlipped !== undefined) {
                applyFlipped('client', clientCircle);
            }
            
        } else if (attempts >= maxAttempts) {
            debugLog('Timeout waiting for poseLibrary for client pose');
        } else {
            setTimeout(checkPoseLibrary, 100);
        }
    };
    
    checkPoseLibrary();
}

/**
 * Apply pending client pose
 */
function applyPendingPose() {
    if (window.pendingClientPose === undefined || window.pendingClientPose === null) return;
    
    try {
        let poseIndex = window.pendingClientPose;
        if (typeof window.pendingClientPose === 'string') {
            // Try to find pose by name in poseLibrary
            if (window.poseLibrary) {
                const foundIndex = window.poseLibrary.findIndex(p => p && p.name === window.pendingClientPose);
                if (foundIndex !== -1) {
                    poseIndex = foundIndex;
                } else {
                    poseIndex = 0; // standard pose
                }
            }
        }
        // If numeric but invalid, coerce to 0
        if (typeof poseIndex === 'number') {
            if (!window.poseLibrary || !Array.isArray(window.poseLibrary) || poseIndex < 0 || poseIndex >= window.poseLibrary.length) {
                poseIndex = 0;
            }
        }
        
        // Apply pose if poseLibrary is loaded
        waitForPoseLibraryAndApplyClientPose(poseIndex);
        
        // Clear pending pose
        window.pendingClientPose = null;
        
    } catch (e) {
        debugLog('Error applying pending pose:', e);
    }
}

/**
 * Show coaching question
 */
function showCoachingQuestion(contentElement, question) {
    debugLog('Showing coaching question:', question);
    
    if (!question) {
        debugLog('No current question');
        return;
    }
    
    // Always show coach bubble with question
    const leftBubble = contentElement.querySelector('#leftBubble');
    if (leftBubble) {
        // Get current transform from computed style or use default
        const computed = window.getComputedStyle(leftBubble);
        const computedTransform = computed.transform;
        let transformBase = 'translate(calc(var(--left-bubble-shift-x, 0px)), -50%)';
        
        // Extract translate part from computed transform if it exists
        if (computedTransform && computedTransform !== 'none' && computedTransform.includes('translate')) {
            const match = computedTransform.match(/(translate\([^)]+\))/);
            if (match) {
                transformBase = match[1];
            }
        }
        
        // Ensure transition is set (same as dialog)
        leftBubble.style.transition = 'all 0.35s cubic-bezier(0.4, 1.3, 0.7, 1)';
        
        // Start animation state: small and invisible
        leftBubble.style.opacity = '0';
        leftBubble.style.transform = transformBase + ' scale(0.85)';
        leftBubble.style.display = 'block';
        
        // Animate to full size after a short delay (same pattern as dialog)
        setTimeout(() => {
            leftBubble.style.transform = transformBase.replace(/\s*scale\([^)]+\)/g, '') + ' scale(1)';
            leftBubble.style.opacity = '1';
        }, 10);
        
        // Force reflow to trigger animation
        leftBubble.offsetHeight;
    }
    
    // Show coach question in coach bubble (clean text without placeholders)
    const coachMessage = contentElement.querySelector('#coachMessage');
    if (coachMessage) {
        const cleanText = question.text.replace(/<<[^>]+>>/g, '');
        coachMessage.innerHTML = cleanText.replace(/\n/g, '<br>');
    }
    
    // Add to transcript
    addToTranscript(contentElement, 'coach', question.text.replace(/<<[^>]+>>/g, ''));
    
    // Animate coach when speaking - transition from slapper to tænke
    waitForPoseLibraryAndApplyCoachPose('tænke');
    
    // Show client input area if not done and session is active
    if (!question.done && window.coachingActive !== false) {
        debugLog('Question not done, showing client input area');
        
        // Show client bubble for input with animation, but after a short delay (after coach bubble appears)
        const rightBubble = contentElement.querySelector('#rightBubble');
        if (rightBubble) {
            // Wait 200ms before showing client bubble (so coach appears first)
            setTimeout(() => {
                // Get current transform from computed style or use default
                const computed = window.getComputedStyle(rightBubble);
                const computedTransform = computed.transform;
                let transformBase = 'translateY(-50%)';
                
                // Extract translate part from computed transform if it exists
                if (computedTransform && computedTransform !== 'none' && computedTransform.includes('translate')) {
                    const match = computedTransform.match(/(translateY\([^)]+\))/);
                    if (match) {
                        transformBase = match[1];
                    }
                }
                
                // Ensure transition is set (same as dialog)
                rightBubble.style.transition = 'all 0.35s cubic-bezier(0.4, 1.3, 0.7, 1)';
                
                // Start animation state: small and invisible
                rightBubble.style.opacity = '0';
                rightBubble.style.transform = transformBase + ' scale(0.85)';
                rightBubble.style.display = 'block';
                
                // Animate to full size after a short delay (same pattern as dialog)
                setTimeout(() => {
                    rightBubble.style.transform = transformBase.replace(/\s*scale\([^)]+\)/g, '') + ' scale(1)';
                    rightBubble.style.opacity = '1';
                }, 10);
                
                    // Force reflow to trigger animation
                    rightBubble.offsetHeight;
                    
                    // Handle different question types after bubble is shown
                    if (question.mmm) {
                        // Show single Mmmm button
                        showMmmButton(contentElement);
                    } else if (question.type === 'choice' && question.choices && question.input_type !== 'slider') {
                        // Show choice buttons
                        showChoiceQuestion(contentElement, question);
                    } else if (question.type === 'slider' || 
                               (question.type === 'choice' && question.input_type === 'slider')) {
                        // Show slider
                        showSliderQuestion(contentElement, question);
                    } else {
                        // Regular text input
                        const textarea = contentElement.querySelector('#rightTextarea');
                        if (textarea) {
                            textarea.style.display = 'block';
                            textarea.focus();
                        }
                    }
            }, 200);
        }
    } else if (question.done || window.coachingActive === false) {
        // Hide client input area when session is done
        const rightBubble = contentElement.querySelector('#rightBubble');
        if (rightBubble) {
            rightBubble.style.display = 'none';
        }
    }
}

/**
 * Show a single Mmmm button for <<m>> marker
 */
function showMmmButton(contentElement) {
    // Hide textarea
    const textarea = contentElement.querySelector('#rightTextarea');
    if (textarea) {
        textarea.style.display = 'none';
    }
    
    const rightBubble = contentElement.querySelector('#rightBubble');
    if (!rightBubble) return;
    
    // Clean up any existing dynamic containers
    const oldButtons = rightBubble.querySelector('.choice-buttons');
    if (oldButtons) oldButtons.remove();
    const oldSlider = rightBubble.querySelector('.slider-container');
    if (oldSlider) oldSlider.remove();
    const oldMmm = rightBubble.querySelector('.mmm-container');
    if (oldMmm) oldMmm.remove();
    
    const container = document.createElement('div');
    container.className = 'mmm-container';
    
    const btn = document.createElement('button');
    btn.className = 'choice-btn mmm-btn';
    btn.textContent = 'Mmm..';
    // Compact styling similar to other buttons, slightly smaller
    btn.style.padding = '6px 12px';
    btn.style.borderRadius = '8px';
    btn.style.border = 'none';
    btn.style.background = '#667eea';
    btn.style.color = '#ffffff';
    btn.style.fontFamily = 'Arial, sans-serif';
    btn.style.fontWeight = '500';
    btn.style.fontSize = '14px';
    btn.style.cursor = 'pointer';
    btn.style.boxShadow = '0 1px 2px rgba(0,0,0,0.06)';
    btn.style.transition = 'transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease';
    btn.style.marginTop = '6px';
    btn.onmouseenter = () => {
        btn.style.boxShadow = '0 2px 6px rgba(0,0,0,0.18)';
        btn.style.transform = 'translateY(-1px)';
        btn.style.filter = 'brightness(1.05)';
    };
    btn.onmouseleave = () => {
        btn.style.boxShadow = '0 1px 2px rgba(0,0,0,0.06)';
        btn.style.transform = 'none';
        btn.style.filter = 'none';
    };
    btn.addEventListener('click', () => {
        // Remove self before progressing
        const cleanup = rightBubble.querySelector('.mmm-container');
        if (cleanup) cleanup.remove();
        sendResponse('Mmmm');
    });
    
    container.appendChild(btn);
    rightBubble.appendChild(container);
}

/**
 * Show choice question with buttons
 */
function showChoiceQuestion(contentElement, question) {
    // Hide textarea
    const textarea = contentElement.querySelector('#rightTextarea');
    if (textarea) {
        textarea.style.display = 'none';
    }
    
    const rightBubble = contentElement.querySelector('#rightBubble');
    if (!rightBubble || !question.choices) return;
    
    // Remove any previous dynamic containers only (preserve textarea and static structure)
    const oldButtons = rightBubble.querySelector('.choice-buttons');
    if (oldButtons) oldButtons.remove();
    const oldSlider = rightBubble.querySelector('.slider-container');
    if (oldSlider) oldSlider.remove();
    
    // Build buttons without inline handlers
    const wrapper = document.createElement('div');
    wrapper.className = 'choice-buttons';
    // Layout similar to Mmm container but supports multiple buttons
    wrapper.style.display = 'flex';
    wrapper.style.flexWrap = 'wrap';
    wrapper.style.gap = '8px';
    wrapper.style.marginTop = '6px';
    
    question.choices.forEach(choice => {
        const btn = document.createElement('button');
        btn.className = 'choice-btn';
        btn.textContent = choice;
        // Apply same visual style as Mmm button
        btn.style.padding = '6px 12px';
        btn.style.borderRadius = '8px';
        btn.style.border = 'none';
        btn.style.background = '#667eea';
        btn.style.color = '#ffffff';
        btn.style.fontFamily = 'Arial, sans-serif';
        btn.style.fontWeight = '500';
        btn.style.fontSize = '14px';
        btn.style.cursor = 'pointer';
        btn.style.boxShadow = '0 1px 2px rgba(0,0,0,0.06)';
        btn.style.transition = 'transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease';
        btn.onmouseenter = () => {
            btn.style.boxShadow = '0 2px 6px rgba(0,0,0,0.18)';
            btn.style.transform = 'translateY(-1px)';
            btn.style.filter = 'brightness(1.05)';
        };
        btn.onmouseleave = () => {
            btn.style.boxShadow = '0 1px 2px rgba(0,0,0,0.06)';
            btn.style.transform = 'none';
            btn.style.filter = 'none';
        };
        btn.addEventListener('click', () => {
            try {
                if (question && question.variableName) {
                    currentEngine.blackboard[question.variableName] = choice;
                }
            } catch (_) {}
            // Clean up dynamic UI before sending response
            const cleanupButtons = rightBubble.querySelector('.choice-buttons');
            if (cleanupButtons) cleanupButtons.remove();
            sendResponse(choice);
        });
        wrapper.appendChild(btn);
    });
    
    rightBubble.appendChild(wrapper);
}

/**
 * Show slider question
 */
function showSliderQuestion(contentElement, question) {
    // Hide textarea
    const textarea = contentElement.querySelector('#rightTextarea');
    if (textarea) {
        textarea.style.display = 'none';
    }
    
    const rightBubble = contentElement.querySelector('#rightBubble');
    if (!rightBubble) return;
    
    // Remove any previous dynamic containers only (preserve textarea and static structure)
    const oldButtons = rightBubble.querySelector('.choice-buttons');
    if (oldButtons) oldButtons.remove();
    const oldSlider = rightBubble.querySelector('.slider-container');
    if (oldSlider) oldSlider.remove();
    
    // Build slider UI programmatisk, uden globale inline-handlers
    const container = document.createElement('div');
    container.className = 'slider-container';
    
    const min = question.min || 0;
    const max = question.max || 100;
    const value = question.value || Math.round((min + max) / 2);
    const step = question.step || 1;
    const labels = question.labels || null;
    
    // Labels - show them above the slider
    if (labels && labels.length >= 2) {
        const leftLabel = currentEngine ? currentEngine.replaceVars(labels[0]) : labels[0];
        const rightLabel = currentEngine ? currentEngine.replaceVars(labels[1]) : labels[1];
        
        const labelsDiv = document.createElement('div');
        labelsDiv.style.display = 'flex';
        labelsDiv.style.justifyContent = 'space-between';
        labelsDiv.style.fontSize = '12px';
        labelsDiv.style.color = '#666';
        labelsDiv.style.marginBottom = '10px';
        labelsDiv.innerHTML = `<span>${leftLabel}</span><span>${rightLabel}</span>`;
        container.appendChild(labelsDiv);
    }
    
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(min);
    slider.max = String(max);
    slider.step = String(step);
    slider.value = String(value);
    slider.className = 'slider';
    slider.id = 'coachingSlider';
    slider.style.width = '100%';
    slider.style.marginBottom = '10px';
    
    const valueDiv = document.createElement('div');
    valueDiv.className = 'slider-value';
    valueDiv.id = 'sliderValue';
    valueDiv.textContent = String(value);
    valueDiv.style.textAlign = 'center';
    valueDiv.style.fontWeight = 'bold';
    valueDiv.style.fontSize = '18px';
    valueDiv.style.marginBottom = '10px';
    
    const okBtn = document.createElement('button');
    okBtn.textContent = 'OK';
    okBtn.className = 'choice-btn';
    // Apply same visual style as other buttons (Mmm and choice buttons)
    okBtn.style.padding = '6px 12px';
    okBtn.style.borderRadius = '8px';
    okBtn.style.border = 'none';
    okBtn.style.background = '#667eea';
    okBtn.style.color = '#ffffff';
    okBtn.style.fontFamily = 'Arial, sans-serif';
    okBtn.style.fontWeight = '500';
    okBtn.style.fontSize = '14px';
    okBtn.style.cursor = 'pointer';
    okBtn.style.boxShadow = '0 1px 2px rgba(0,0,0,0.06)';
    okBtn.style.transition = 'transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease';
    okBtn.style.marginTop = '6px';
    okBtn.onmouseenter = () => {
        okBtn.style.boxShadow = '0 2px 6px rgba(0,0,0,0.18)';
        okBtn.style.transform = 'translateY(-1px)';
        okBtn.style.filter = 'brightness(1.05)';
    };
    okBtn.onmouseleave = () => {
        okBtn.style.boxShadow = '0 1px 2px rgba(0,0,0,0.06)';
        okBtn.style.transform = 'none';
        okBtn.style.filter = 'none';
    };
    okBtn.addEventListener('click', () => {
        const valNum = Number(slider.value);
        try {
            if (question && question.variableName) {
                currentEngine.blackboard[question.variableName] = valNum;
            }
        } catch (_) {}
        // Clean up dynamic slider UI before sending response
        const cleanupSlider = rightBubble.querySelector('.slider-container');
        if (cleanupSlider) cleanupSlider.remove();
        sendResponse(valNum);
    });
    
    slider.addEventListener('input', () => {
        valueDiv.textContent = slider.value;
    });
    
    container.appendChild(slider);
    container.appendChild(valueDiv);
    container.appendChild(okBtn);
    rightBubble.appendChild(container);
}

/**
 * Select choice and send response
 */
function selectChoice(choice) {
    if (currentEngine && currentQuestion) {
        sendResponse(choice);
    }
}

/**
 * Update slider value display
 */
function updateSliderValue(value) {
    const overlay = document.getElementById('coachingOverlay');
    const sliderValue = overlay ? overlay.querySelector('#sliderValue') : null;
    if (sliderValue) {
        sliderValue.textContent = value;
    }
}

/**
 * Submit slider value
 */
function submitSliderValue() {
    const overlay = document.getElementById('coachingOverlay');
    const slider = overlay ? overlay.querySelector('#coachingSlider') : null;
    if (slider && currentEngine && currentQuestion) {
        sendResponse(slider.value);
    }
}

/**
 * Set up event listeners for coaching
 */
function setupCoachingEventListeners(contentElement) {
    // Prevent multiple bindings across restarts
    if (overlayListenersBound) return;
    // Start coaching button
    const startBtn = contentElement.querySelector('#startCoachingBtn');
    if (startBtn) {
        // Rename to "Start forfra"
        startBtn.textContent = 'Start forfra';
        // Ensure it's active and styled with hover
        startBtn.disabled = false;
        startBtn.style.padding = '6px 12px';
        startBtn.style.borderRadius = '8px';
        startBtn.style.border = 'none';
        startBtn.style.background = '#0ea5e9';
        startBtn.style.color = '#ffffff';
        startBtn.style.fontFamily = 'Arial, sans-serif';
        startBtn.style.fontWeight = '500';
        startBtn.style.fontSize = '14px';
        startBtn.style.cursor = 'pointer';
        startBtn.style.boxShadow = '0 1px 2px rgba(0,0,0,0.06)';
        startBtn.style.transition = 'transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease';
        startBtn.onmouseenter = () => {
            startBtn.style.boxShadow = '0 2px 6px rgba(0,0,0,0.18)';
            startBtn.style.transform = 'translateY(-1px)';
            startBtn.style.filter = 'brightness(1.05)';
        };
        startBtn.onmouseleave = () => {
            startBtn.style.boxShadow = '0 1px 2px rgba(0,0,0,0.06)';
            startBtn.style.transform = 'none';
            startBtn.style.filter = 'none';
        };
        startBtn.addEventListener('click', () => {
            debugLog('Restart coaching button clicked');
            restartCoaching(contentElement);
        });
    }
    
    // Remove any legacy permanent Mmmm button if present
    const mmmBtn = contentElement.querySelector('#mmmBtn');
    if (mmmBtn) {
        mmmBtn.remove();
    }
    
    // Save button -> save CSV compatible with dialog
    const saveBtn = contentElement.querySelector('#saveBtn');
    if (saveBtn) {
       saveBtn.textContent = 'Gem session';
       // Ensure always enabled/active
       saveBtn.disabled = false;
       saveBtn.style.opacity = '';
       saveBtn.style.pointerEvents = 'auto';
       // Style and hover
       saveBtn.style.padding = '6px 12px';
       saveBtn.style.borderRadius = '8px';
       saveBtn.style.border = 'none';
       saveBtn.style.background = '#8b5cf6';
       saveBtn.style.color = '#ffffff';
       saveBtn.style.fontFamily = 'Arial, sans-serif';
       saveBtn.style.fontWeight = '500';
       saveBtn.style.fontSize = '14px';
       saveBtn.style.cursor = 'pointer';
       saveBtn.style.boxShadow = '0 1px 2px rgba(0,0,0,0.06)';
       saveBtn.style.transition = 'transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease';
       saveBtn.onmouseenter = () => {
           saveBtn.style.boxShadow = '0 2px 6px rgba(0,0,0,0.18)';
           saveBtn.style.transform = 'translateY(-1px)';
           saveBtn.style.filter = 'brightness(1.05)';
       };
       saveBtn.onmouseleave = () => {
           saveBtn.style.boxShadow = '0 1px 2px rgba(0,0,0,0.06)';
           saveBtn.style.transform = 'none';
           saveBtn.style.filter = 'none';
       };
       saveBtn.addEventListener('click', () => {
           saveOverlayDialogCSV(contentElement);
       });
    }

    // Add "Kopier dialog" button for clipboard export
    const controls = contentElement.querySelector('.controls');
    if (controls && !contentElement.querySelector('#copyOverlayBtn')) {
        const copyBtn = document.createElement('button');
        copyBtn.id = 'copyOverlayBtn';
        copyBtn.textContent = 'Kopier dialog';
        // Visual style aligned with other small buttons, but fresh color
        copyBtn.style.padding = '6px 12px';
        copyBtn.style.borderRadius = '8px';
        copyBtn.style.border = 'none';
        copyBtn.style.background = '#22c55e'; // fresh green
        copyBtn.style.color = '#ffffff';
        copyBtn.style.fontFamily = 'Arial, sans-serif';
        copyBtn.style.fontWeight = '500';
        copyBtn.style.fontSize = '14px';
        copyBtn.style.cursor = 'pointer';
        copyBtn.style.boxShadow = '0 1px 2px rgba(0,0,0,0.06)';
        copyBtn.style.transition = 'transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease';
        copyBtn.style.marginLeft = '8px';
        copyBtn.onmouseenter = () => {
            copyBtn.style.boxShadow = '0 2px 6px rgba(0,0,0,0.18)';
            copyBtn.style.transform = 'translateY(-1px)';
            copyBtn.style.filter = 'brightness(1.05)';
        };
        copyBtn.onmouseleave = () => {
            copyBtn.style.boxShadow = '0 1px 2px rgba(0,0,0,0.06)';
            copyBtn.style.transform = 'none';
            copyBtn.style.filter = 'none';
        };
        copyBtn.addEventListener('click', () => {
            copyOverlayDialog();
        });
        controls.appendChild(copyBtn);
    }
    
    // Textarea for responses
    const textarea = contentElement.querySelector('#rightTextarea');
    if (textarea) {
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                const response = textarea.value.trim();
                if (response) {
                    sendResponse(response);
                    textarea.value = '';
                }
            }
        });
    }
    overlayListenersBound = true;
}

/**
 * Send response to coaching engine
 */
function sendResponse(response) {
    if (!currentEngine || !currentQuestion) return;
    
    debugLog('Sending response:', response);
    
    // Save response to blackboard if this is a save type question
    if (currentQuestion.type === 'save' && currentQuestion.saveAs) {
        currentEngine.blackboard[currentQuestion.saveAs] = response;
        debugLog('Saved response to blackboard:', currentQuestion.saveAs, '=', response);
    }
    
    // Add to transcript (prefer shadow root if available)
    const rootEl = (window.coachingOverlay && window.coachingOverlay.contentRoot) ? window.coachingOverlay.contentRoot : coachingOverlay.content;
    addToTranscript(rootEl, 'user', response);

    // Reset client textarea height back to default after sending
    try {
        const rt = rootEl.querySelector('#rightTextarea');
        if (rt) {
            rt.style.height = '';
        }
    } catch (_) {}
    
    // Process response
    currentQuestion = currentEngine.answer(response);
    
    if (currentQuestion.done) {
        // Session finished
        const rootEl3 = (window.coachingOverlay && window.coachingOverlay.contentRoot) ? window.coachingOverlay.contentRoot : coachingOverlay.content;
        addToTranscript(rootEl3, 'coach', currentQuestion.text);
        
        // Show coach's final message in speech bubble
        const coachMessage = rootEl3.querySelector('#coachMessage');
        if (coachMessage) {
            const cleanText = currentQuestion.text.replace(/<<[^>]+>>/g, '');
            coachMessage.innerHTML = cleanText.replace(/\n/g, '<br>');
        }
        
        // Hide client input area
        const rightBubble = rootEl3.querySelector('#rightBubble');
        if (rightBubble) {
            rightBubble.style.display = 'none';
        }
        
        // Set session as inactive
        window.coachingActive = false;
        
        debugLog('Coaching session finished');
    } else {
        // Show next question after a short pause
        const rootEl2 = (window.coachingOverlay && window.coachingOverlay.contentRoot) ? window.coachingOverlay.contentRoot : coachingOverlay.content;
        
        // Hide both coach and client bubbles during pause
        const leftBubble = rootEl2.querySelector('#leftBubble');
        const rightBubble = rootEl2.querySelector('#rightBubble');
        if (leftBubble) {
            leftBubble.style.display = 'none';
        }
        if (rightBubble) {
            rightBubble.style.display = 'none';
        }
        
        // Wait 500ms before showing next question (shorter pause)
        setTimeout(() => {
            showCoachingQuestion(rootEl2, currentQuestion);
            // Ensure textarea starts from standard size for new input
            try {
                const rt2 = rootEl2.querySelector('#rightTextarea');
                if (rt2) {
                    rt2.style.height = '';
                }
            } catch (_) {}
        }, 500);
    }
}

/**
 * Restart coaching with same data source and settings
 */
function restartCoaching(contentElement) {
    try {
        // Clear transcript
        const transcriptContent = contentElement.querySelector('#transcriptContent');
        if (transcriptContent) {
            transcriptContent.innerHTML = '<div class="empty" style="color:#999; text-align:center; padding:8px;">Ingen beskeder endnu…</div>';
        }
        // Reset overlay transcript store
        overlayTranscript = [];

        // Reset bubbles
        const leftBubble = contentElement.querySelector('#leftBubble');
        const rightBubble = contentElement.querySelector('#rightBubble');
        if (leftBubble) leftBubble.style.display = 'none';
        if (rightBubble) rightBubble.style.display = 'none';

        // Clean up any dynamic UI containers in client bubble
        if (rightBubble) {
            const choiceButtons = rightBubble.querySelector('.choice-buttons');
            const sliderContainer = rightBubble.querySelector('.slider-container');
            const mmmContainer = rightBubble.querySelector('.mmm-container');
            if (choiceButtons) choiceButtons.remove();
            if (sliderContainer) sliderContainer.remove();
            if (mmmContainer) mmmContainer.remove();
        }

        // Reset client input
        const textarea = contentElement.querySelector('#rightTextarea');
        if (textarea) {
            textarea.value = '';
            textarea.style.display = 'block';
        }

        // Reset state
        currentEngine = null;
        currentQuestion = null;
        window.coachingActive = false;

        // Re-apply colors and poses from previously loaded external data
        if (window.loadedExternalData) {
            loadExternalDataForUI(contentElement, window.loadedExternalData);
        }

        // Restart engine with same data source
        const dataSource = window.currentDataSource || 'coaching_templates/compare_coaching.json';
        startCoachingSession(contentElement, dataSource);
    } catch (e) {
        debugLog('Error restarting coaching:', e);
    }
}

/**
 * Add message to transcript
 */
function addToTranscript(contentElement, type, text) {
    const transcriptContent = contentElement.querySelector('#transcriptContent');
    if (!transcriptContent) return;
    
    // Clear empty message if present
    const empty = transcriptContent.querySelector('.empty');
    if (empty) {
        empty.remove();
    }
    
    // Create message element
    const messageDiv = document.createElement('div');
    messageDiv.className = type === 'coach' ? 'message-left' : 'message-right';
    
    // Use dynamic colors - align with dialog system brightness
    const coachColor = '#667eea'; // Fixed coach color
    const clientColor = window.popupClientColor || '#f093fb'; // Default client color
    const transcriptCoachColor = lightenColor(coachColor, 0.7);
    const transcriptClientColor = lightenColor(clientColor, 0.7);
    
    messageDiv.style.cssText = `
        margin-bottom: 12px;
        padding: 10px 12px;
        border-radius: 8px;
        max-width: 80%;
        background: ${type === 'coach' ? transcriptCoachColor : transcriptClientColor};
    `;
    
    if (type === 'coach') {
        messageDiv.style.marginRight = 'auto';
    } else {
        messageDiv.style.marginLeft = 'auto';
    }
    
    const speakerDiv = document.createElement('div');
    speakerDiv.className = 'speaker';
    speakerDiv.style.cssText = `
        font-weight: 600;
        font-size: 12px;
        color: #666;
        margin-bottom: 4px;
    `;
    
    // Use client name from comparisonData or default
    const clientName = window.loadedExternalData?.You || 'Klient';
    speakerDiv.textContent = type === 'coach' ? 'Coach' : clientName;
    
    const messageTextDiv = document.createElement('div');
    messageTextDiv.className = 'message-text';
    messageTextDiv.style.cssText = `
        font-size: 14px;
        line-height: 1.4;
        white-space: pre-wrap;
    `;
    messageTextDiv.textContent = text;
    
    // Make client messages editable (not coach messages)
    if (type === 'user') {
        messageTextDiv.contentEditable = true;
        messageTextDiv.style.cursor = 'text';
        messageTextDiv.style.outline = 'none';
        messageTextDiv.style.borderRadius = '4px';
        messageTextDiv.style.padding = '4px';
        messageTextDiv.style.transition = 'background-color 0.2s ease';
        
        // Add hover effect
        messageTextDiv.addEventListener('mouseenter', function() {
            this.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
        });
        messageTextDiv.addEventListener('mouseleave', function() {
            this.style.backgroundColor = 'transparent';
        });
    }
    
    const timestampDiv = document.createElement('div');
    timestampDiv.style.cssText = `
        font-size: 11px;
        color: #999;
        margin-top: 4px;
    `;
    timestampDiv.textContent = new Date().toLocaleTimeString('da-DK', { 
        hour: '2-digit', 
        minute: '2-digit'
    });
    
    messageDiv.appendChild(speakerDiv);
    messageDiv.appendChild(messageTextDiv);
    messageDiv.appendChild(timestampDiv);
    
    transcriptContent.appendChild(messageDiv);
    // Track transcript entries for export
    try {
        const speakerLabel = (type === 'coach') ? 'Coach' : (window.loadedExternalData?.You || 'Klient');
        const side = (type === 'coach') ? 'left' : 'right';
        overlayTranscript.push({ speaker: speakerLabel, message: text, side, timestamp: new Date().toISOString() });
    } catch (_) {}
    
    // Always scroll to newest message
    requestAnimationFrame(() => {
        messageDiv.scrollIntoView({ behavior: 'smooth', block: 'end' });
    });
}

/**
 * Save session
 */
function saveSession() {
    // Deprecated: kept for compatibility but not used. CSV export implemented in saveOverlayDialogCSV.
}

/**
 * Implement simple drag
 */
function makeDraggable(element, handle) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    let isDragging = false;
    
    handle.onmousedown = dragMouseDown;
    
    function dragMouseDown(e) {
        if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
            return;
        }
        
        e.preventDefault();
        isDragging = true;
        
        // Get current position and convert to absolute positioning
        const rect = element.getBoundingClientRect();
        element.style.left = rect.left + 'px';
        element.style.top = rect.top + 'px';
        element.style.transform = 'none';
        
        pos3 = e.clientX;
        pos4 = e.clientY;
        
        element.style.cursor = 'grabbing';
        element.style.transition = 'none';
        
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }
    
    function elementDrag(e) {
        if (!isDragging) return;
        e.preventDefault();
        
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        
        element.style.top = (element.offsetTop - pos2) + "px";
        element.style.left = (element.offsetLeft - pos1) + "px";
        element.style.transform = "none";
    }
    
    function closeDragElement() {
        isDragging = false;
        element.style.cursor = '';
        element.style.transition = '';
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

/**
 * Close coaching overlay
 */
function closeCoachingOverlay() {
    if (coachingOverlay) {
        // Dispatch custom event before closing so pages can save data if needed
        const closeEvent = new CustomEvent('coachingOverlayClosing', {
            detail: {
                engine: currentEngine
            }
        });
        window.dispatchEvent(closeEvent);
        
        if (coachingOverlay.overlay && coachingOverlay.overlay.parentNode) {
            coachingOverlay.overlay.parentNode.removeChild(coachingOverlay.overlay);
        }
        document.body.style.overflow = '';
        coachingOverlay = null;
        currentEngine = null;
        currentQuestion = null;
        overlayListenersBound = false;
    }
}

// Export functions for global use
window.openCoachingOverlay = openCoachingOverlay;
window.closeCoachingOverlay = closeCoachingOverlay;
window.openCoachingOverlayFromStorage = openCoachingOverlay;
window.openCoachingOverlayFromURL = openCoachingOverlay;
window.openCoachingOverlayFromFile = openCoachingOverlay;

debugLog('Complete coaching overlay system loaded');

})();
