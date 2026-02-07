// Background script for LexiSwap AI

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "simplify_word") {
        handleSimplification(request, sendResponse);
        return true; // Will respond asynchronously
    }
});

async function handleSimplification(request, sendResponse) {
    const { word, context, level, mode } = request; // Added mode

    try {
        const response = await fetch('http://localhost:8000/simplify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: word,
                context: context,
                simplicity_level: level,
                mode: mode || 'simplify' // Default to simplify
            })
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.statusText}`);
        }

        const data = await response.json();
        sendResponse({ success: true, data: data });

    } catch (error) {
        console.error('LexiSwap API Error:', error);
        sendResponse({ success: false, error: error.message });
    }
}
