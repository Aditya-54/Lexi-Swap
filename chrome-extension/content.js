// LexiSwap AI Content Script

console.log("LexiSwap: Content script loaded (Manual Mode)");

let currentTooltip = null;

// Listen for user interactions
document.addEventListener('mouseup', handleTextSelection);
document.addEventListener('dblclick', handleDoubleClick);

// --- Double Click Logic (Swap/Revert) ---
async function handleDoubleClick(event) {
    const target = event.target;

    // 1. Revert Logic (if already simplified)
    if (target.classList.contains('lexiswap-simplified')) {
        event.preventDefault(); // Try to prevent default selection if possible context
        revertToOriginal(target);
        return;
    }

    // 2. Swap Logic (on normal text)
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    if (!selectedText || selectedText.split(' ').length > 3) return;

    // Check if we are inside a simplified word (edge case)
    if (selection.anchorNode.parentElement.classList.contains('lexiswap-simplified')) return;

    // Avoid accidental triggering? User wants "careful" action.
    // We will proceed with swap, but ensure it's reversible.

    const range = selection.getRangeAt(0);
    const span = document.createElement('span');
    span.textContent = selectedText;
    span.className = 'lexiswap-word lexi-swap-processing'; // Temporary class
    span.dataset.original = selectedText;

    range.deleteContents();
    range.insertNode(span);

    selection.removeAllRanges();

    await performSwap(span, selectedText);
}

// --- Selection Logic (Tooltip with Options) ---
function handleTextSelection(event) {
    // Give a small delay to allow dblclick to fire first if that was the intent
    setTimeout(() => {
        if (event.target.classList.contains('lexiswap-simplified')) return; // handled by dblclick
        if (event.target.closest('.lexiswap-tooltip-ui')) return; // clicked inside tooltip

        const selection = window.getSelection();
        const selectedText = selection.toString().trim();

        if (!selectedText || selectedText.split(' ').length > 3) {
            removeTooltip();
            return;
        }

        // Show Options Tooltip
        showOptionsTooltip(event.clientX, event.clientY, selectedText, selection);
    }, 100);
}


// --- Core Actions ---

async function performSwap(spanElement, word) {
    spanElement.classList.add('lexiswap-loading');

    const context = spanElement.parentElement.textContent.substring(0, 200);
    const level = await getSimplicityLevel();
    const mode = 'simplify';
    const cacheKey = `${word}_simplify_${level}`;

    const cachedResult = await getFromCache(cacheKey);

    if (cachedResult) {
        applyMagicSwap(spanElement, cachedResult.simplified);
        return;
    }

    chrome.runtime.sendMessage({
        action: "simplify_word",
        word: word,
        context: context,
        level: level,
        mode: mode
    }, (response) => {
        if (chrome.runtime.lastError || !response || !response.success) {
            console.error("LexiSwap Error:", chrome.runtime.lastError);
            revertToOriginal(spanElement); // Fail gracefully
            return;
        }

        saveToCache(cacheKey, response.data);

        if (response.data.simplified.toLowerCase() === word.toLowerCase()) {
            // No simplification found
            revertToOriginal(spanElement);
        } else {
            applyMagicSwap(spanElement, response.data.simplified);
        }
    });
}

async function performDefine(word, x, y) {
    // Show loading in a separate tooltip or update existing
    showTooltip(x, y, "Defining...", false, true);

    const context = document.body.innerText.substring(0, 200); // approximate context
    const level = await getSimplicityLevel();
    const mode = 'define';
    const cacheKey = `${word}_define`;

    const cachedResult = await getFromCache(cacheKey);

    if (cachedResult) {
        showTooltip(x, y, cachedResult.simplified); // "simplified" holds the definition result
        return;
    }

    chrome.runtime.sendMessage({
        action: "simplify_word",
        word: word,
        context: context,
        level: level,
        mode: mode
    }, (response) => {
        if (chrome.runtime.lastError || !response || !response.success) {
            showTooltip(x, y, "Error getting definition.");
            return;
        }
        saveToCache(cacheKey, response.data);
        showTooltip(x, y, response.data.simplified);
    });
}

function revertToOriginal(element) {
    const original = element.dataset.original;
    if (!original) {
        // Fallback if data attribute missing
        element.replaceWith(document.createTextNode(element.textContent));
        return;
    }
    const textNode = document.createTextNode(original);
    element.parentNode.replaceChild(textNode, element);
}

function applyMagicSwap(element, newWord) {
    element.classList.remove('lexiswap-loading');
    element.style.transition = "all 0.3s ease";
    element.style.opacity = "0";
    element.style.transform = "scale(0.8)";
    element.style.filter = "blur(2px)";

    setTimeout(() => {
        element.textContent = newWord;
        element.style.opacity = "";
        element.style.transform = "";
        element.style.filter = "";
        element.classList.add('lexiswap-simplified');
        setTimeout(() => element.removeAttribute('style'), 50);
    }, 300);
}


// --- UI Components ---

function showOptionsTooltip(x, y, word, selection) {
    removeTooltip();

    const host = document.createElement('div');
    host.className = 'lexiswap-tooltip-ui';
    host.style.position = 'absolute';
    host.style.left = `${x + window.scrollX}px`;
    host.style.top = `${y + 20 + window.scrollY}px`;
    host.style.zIndex = '2147483647';
    host.id = 'lexi-swap-host';

    const shadow = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = `
        .container { 
            background: #fff; 
            border: 1px solid #ccc; 
            box-shadow: 0 4px 12px rgba(0,0,0,0.15); 
            border-radius: 6px; 
            display: flex; 
            overflow: hidden;
            font-family: sans-serif;
            font-size: 13px;
        }
        button {
            background: none;
            border: none;
            padding: 8px 12px;
            cursor: pointer;
            border-right: 1px solid #eee;
            transition: background 0.2s;
            color: #333;
        }
        button:last-child { border-right: none; }
        button:hover { background: #f5f5f5; color: #000; }
        .swap-btn { font-weight: 600; color: #2E7D32; }
        .def-btn { color: #1565C0; }
    `;

    const container = document.createElement('div');
    container.className = 'container';

    // Swap Button
    const swapBtn = document.createElement('button');
    swapBtn.textContent = 'Swap ⚡';
    swapBtn.className = 'swap-btn';
    swapBtn.onclick = () => {
        removeTooltip();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const span = document.createElement('span');
            span.textContent = word;
            span.className = 'lexiswap-word';
            span.dataset.original = word;
            range.deleteContents();
            range.insertNode(span);
            selection.removeAllRanges();
            performSwap(span, word);
        }
    };

    // Define Button
    const defineBtn = document.createElement('button');
    defineBtn.textContent = 'Meaning 📖';
    defineBtn.className = 'def-btn';
    defineBtn.onclick = () => {
        removeTooltip();
        performDefine(word, x, y);
    };

    container.appendChild(swapBtn);
    container.appendChild(defineBtn);
    shadow.appendChild(style);
    shadow.appendChild(container);
    document.body.appendChild(host);
    currentTooltip = host;

    document.addEventListener('mousedown', handleClickOutside);
}


function showTooltip(x, y, text, isCached = false, isLoading = false) {
    removeTooltip();
    const host = document.createElement('div');
    host.className = 'lexiswap-tooltip-ui';
    host.style.position = 'absolute';
    host.style.left = `${x + window.scrollX}px`;
    host.style.top = `${y + 20 + window.scrollY}px`;
    host.style.zIndex = '2147483647';
    host.id = 'lexi-swap-host';

    const shadow = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = `
        .tooltip { 
            background: #333; 
            color: #fff; 
            padding: 8px 12px; 
            border-radius: 6px; 
            font-size: 13px; 
            font-family: sans-serif; 
            max-width: 250px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        }
        .loading { font-style: italic; color: #ccc; }
    `;
    const div = document.createElement('div');
    div.className = `tooltip ${isLoading ? 'loading' : ''}`;
    div.textContent = text;

    shadow.appendChild(style);
    shadow.appendChild(div);
    document.body.appendChild(host);

    currentTooltip = host;
    document.addEventListener('mousedown', handleClickOutside);
}


function getSimplicityLevel() {
    return new Promise((resolve) => {
        if (!chrome.storage) { resolve('intermediate'); return; }
        chrome.storage.local.get(['lexiSwapLevel'], (result) => resolve(result.lexiSwapLevel || 'intermediate'));
    });
}

function getFromCache(key) {
    return new Promise((resolve) => chrome.storage.local.get([key], r => resolve(r[key])));
}

function saveToCache(key, data) {
    let obj = {}; obj[key] = data; chrome.storage.local.set(obj);
}

function removeTooltip() {
    if (currentTooltip) {
        currentTooltip.remove();
        currentTooltip = null;
        document.removeEventListener('mousedown', handleClickOutside);
    }
}

function handleClickOutside(e) {
    if (currentTooltip && !currentTooltip.contains(e.target)) removeTooltip();
}
