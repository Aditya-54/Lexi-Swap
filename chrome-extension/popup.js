document.addEventListener('DOMContentLoaded', () => {
    const simplicityLevelSelect = document.getElementById('simplicityLevel');
    const saveBtn = document.getElementById('saveBtn');
    const statusDiv = document.getElementById('status');

    // Load saved settings
    chrome.storage.local.get(['lexiSwapLevel'], (result) => {
        if (result.lexiSwapLevel) {
            simplicityLevelSelect.value = result.lexiSwapLevel;
        }
    });

    saveBtn.addEventListener('click', () => {
        const level = simplicityLevelSelect.value;
        chrome.storage.local.set({ lexiSwapLevel: level }, () => {
            statusDiv.textContent = 'Settings saved!';
            statusDiv.classList.add('success');
            setTimeout(() => {
                statusDiv.classList.remove('success');
                statusDiv.textContent = '';
            }, 2000);
        });
    });
});
