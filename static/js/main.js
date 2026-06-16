document.addEventListener('DOMContentLoaded', () => {
    // App State
    let state = {
        updates: [],
        filteredUpdates: [],
        selectedUpdate: null,
        activeCategory: 'all',
        searchQuery: ''
    };

    // DOM Elements
    const refreshBtn = document.getElementById('refreshBtn');
    const refreshIcon = document.getElementById('refreshIcon');
    const exportCsvBtn = document.getElementById('exportCsvBtn');
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const themeIcon = document.getElementById('themeIcon');
    const timelineContainer = document.getElementById('timelineContainer');
    const emptyState = document.getElementById('emptyState');
    const resetFiltersBtn = document.getElementById('resetFiltersBtn');
    const searchInput = document.getElementById('searchInput');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    const filterTags = document.getElementById('filterTags');
    
    // Stats elements
    const statFeatures = document.getElementById('statFeatures');
    const statIssues = document.getElementById('statIssues');
    const statChanges = document.getElementById('statChanges');
    const statTotal = document.getElementById('statTotal');

    // Drawer elements
    const tweetDrawer = document.getElementById('tweetDrawer');
    const drawerOverlay = document.getElementById('drawerOverlay');
    const closeDrawerBtn = document.getElementById('closeDrawerBtn');
    const previewBadge = document.getElementById('previewBadge');
    const previewDate = document.getElementById('previewDate');
    const previewContent = document.getElementById('previewContent');
    const tweetTextarea = document.getElementById('tweetTextarea');
    const progressCircle = document.getElementById('progressCircle');
    const charCountLabel = document.getElementById('charCountLabel');
    const charWarning = document.getElementById('charWarning');
    const tweetSubmitBtn = document.getElementById('tweetSubmitBtn');
    const copyTweetBtn = document.getElementById('copyTweetBtn');
    const copyIcon = document.getElementById('copyIcon');

    // Toast element
    const toast = document.getElementById('toast');

    // SVG Progress circle constants
    const circleRadius = 14;
    const circleCircumference = 2 * Math.PI * circleRadius;
    progressCircle.style.strokeDasharray = `${circleCircumference} ${circleCircumference}`;
    progressCircle.style.strokeDashoffset = circleCircumference;

    // Fetch Release Notes on load
    fetchReleaseNotes();

    // Event Listeners
    refreshBtn.addEventListener('click', fetchReleaseNotes);
    exportCsvBtn.addEventListener('click', exportToCsv);

    // Initialize Theme State
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        themeIcon.setAttribute('data-lucide', 'moon');
    } else {
        document.body.classList.remove('light-theme');
        themeIcon.setAttribute('data-lucide', 'sun');
    }

    themeToggleBtn.addEventListener('click', () => {
        const isLight = document.body.classList.toggle('light-theme');
        if (isLight) {
            localStorage.setItem('theme', 'light');
            themeIcon.setAttribute('data-lucide', 'moon');
            showToast("Theme changed to Light Mode");
        } else {
            localStorage.setItem('theme', 'dark');
            themeIcon.setAttribute('data-lucide', 'sun');
            showToast("Theme changed to Dark Mode");
        }
        lucide.createIcons();
    });
    
    searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value.trim().toLowerCase();
        if (state.searchQuery) {
            clearSearchBtn.style.display = 'flex';
        } else {
            clearSearchBtn.style.display = 'none';
        }
        applyFilters();
    });

    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        state.searchQuery = '';
        clearSearchBtn.style.display = 'none';
        applyFilters();
        searchInput.focus();
    });

    filterTags.addEventListener('click', (e) => {
        if (e.target.classList.contains('filter-tag')) {
            // Remove active class from all tags
            filterTags.querySelectorAll('.filter-tag').forEach(tag => {
                tag.classList.remove('active');
            });
            // Add active class to clicked tag
            e.target.classList.add('active');
            
            state.activeCategory = e.target.dataset.category;
            applyFilters();
        }
    });

    resetFiltersBtn.addEventListener('click', () => {
        searchInput.value = '';
        state.searchQuery = '';
        clearSearchBtn.style.display = 'none';
        
        filterTags.querySelectorAll('.filter-tag').forEach(tag => {
            if (tag.dataset.category === 'all') {
                tag.classList.add('active');
            } else {
                tag.classList.remove('active');
            }
        });
        
        state.activeCategory = 'all';
        applyFilters();
    });

    // Drawer Handlers
    closeDrawerBtn.addEventListener('click', closeDrawer);
    drawerOverlay.addEventListener('click', closeDrawer);

    // Live character count on textarea input
    tweetTextarea.addEventListener('input', () => {
        updateCharacterCount(tweetTextarea.value);
    });

    // Tweet submit handler
    tweetSubmitBtn.addEventListener('click', () => {
        const tweetText = tweetTextarea.value;
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
        window.open(twitterUrl, '_blank', 'width=600,height=400');
    });

    // Copy draft handler
    copyTweetBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(tweetTextarea.value).then(() => {
            showToast("Draft copied to clipboard!");
            
            // Swap icon temporarily
            copyIcon.setAttribute('data-lucide', 'check');
            lucide.createIcons();
            setTimeout(() => {
                copyIcon.setAttribute('data-lucide', 'copy');
                lucide.createIcons();
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            showToast("Failed to copy text", true);
        });
    });

    // --- Helper Functions ---

    // Fetch feed from backend API
    function fetchReleaseNotes() {
        // Start spinning icon
        refreshIcon.classList.add('spinning');
        refreshBtn.disabled = true;
        exportCsvBtn.disabled = true;
        exportCsvBtn.style.opacity = 0.5;
        
        // Show skeleton loading structure
        renderSkeleton();

        fetch('/api/feed')
            .then(res => res.json())
            .then(data => {
                refreshIcon.classList.remove('spinning');
                refreshBtn.disabled = false;
                
                if (data.status === 'success') {
                    state.updates = data.updates;
                    exportCsvBtn.disabled = false;
                    exportCsvBtn.style.opacity = 1;
                    calculateStats();
                    applyFilters();
                } else {
                    console.error('API Error: ', data.message);
                    renderError(data.message);
                }
            })
            .catch(err => {
                refreshIcon.classList.remove('spinning');
                refreshBtn.disabled = false;
                exportCsvBtn.disabled = true;
                exportCsvBtn.style.opacity = 0.5;
                console.error('Fetch Error: ', err);
                renderError(err.message || 'Failed to fetch release notes from server.');
            });
    }

    // Calculate statistics
    function calculateStats() {
        let features = 0;
        let issuesAndBreaking = 0;
        let changesAndMisc = 0;

        state.updates.forEach(up => {
            const cat = up.category.toLowerCase();
            if (cat === 'feature') {
                features++;
            } else if (cat === 'issue' || cat === 'breaking') {
                issuesAndBreaking++;
            } else {
                changesAndMisc++;
            }
        });

        statFeatures.textContent = features;
        statIssues.textContent = issuesAndBreaking;
        statChanges.textContent = changesAndMisc;
        statTotal.textContent = state.updates.length;
    }

    // Apply Search Query and Category Filter
    function applyFilters() {
        state.filteredUpdates = state.updates.filter(up => {
            // Category check
            let matchesCategory = true;
            if (state.activeCategory !== 'all') {
                if (state.activeCategory === 'Issue') {
                    // Match issues or breaking for issues tag
                    matchesCategory = up.category === 'Issue' || up.category === 'Breaking';
                } else {
                    matchesCategory = up.category === state.activeCategory;
                }
            }

            // Search query check (search in category, date, and description content)
            let matchesSearch = true;
            if (state.searchQuery) {
                const text = (up.category + ' ' + up.date + ' ' + up.body_text).toLowerCase();
                matchesSearch = text.includes(state.searchQuery);
            }

            return matchesCategory && matchesSearch;
        });

        renderUpdates();
    }

    // Render updates grouped by Date
    function renderUpdates() {
        timelineContainer.innerHTML = '';
        
        if (state.filteredUpdates.length === 0) {
            emptyState.style.display = 'flex';
            exportCsvBtn.disabled = true;
            exportCsvBtn.style.opacity = 0.5;
            return;
        }

        emptyState.style.display = 'none';
        exportCsvBtn.disabled = false;
        exportCsvBtn.style.opacity = 1;

        // Group updates by date
        const groups = {};
        state.filteredUpdates.forEach(up => {
            if (!groups[up.date]) {
                groups[up.date] = [];
            }
            groups[up.date].push(up);
        });

        // Loop over dates
        for (const date in groups) {
            const dateGroup = document.createElement('div');
            dateGroup.className = 'date-group';

            // Group header
            const dateHeader = document.createElement('div');
            dateHeader.className = 'date-header';
            dateHeader.innerHTML = `
                <div class="date-dot"></div>
                <h4 class="date-title">${date}</h4>
            `;
            dateGroup.appendChild(dateHeader);

            // Group updates container
            const updatesContainer = document.createElement('div');
            updatesContainer.className = 'date-group-updates';

            groups[date].forEach(up => {
                const card = document.createElement('div');
                card.className = 'update-card';
                if (state.selectedUpdate && state.selectedUpdate.id === up.id) {
                    card.classList.add('selected');
                }

                // Color theme based on category
                const badgeClass = getBadgeClass(up.category);

                card.innerHTML = `
                    <div class="update-card-header">
                        <span class="badge ${badgeClass}">${up.category}</span>
                    </div>
                    <div class="update-card-body">
                        ${up.body_html}
                    </div>
                    <div class="update-card-footer">
                        <button class="btn-icon-only btn-tweet-sm" title="Tweet about this update" data-id="${up.id}">
                            <i data-lucide="twitter"></i>
                        </button>
                        <button class="btn-icon-only btn-copy-sm" title="Copy raw update details" data-id="${up.id}">
                            <i data-lucide="copy"></i>
                        </button>
                    </div>
                `;

                // Event listener to open drawer when clicking card
                card.addEventListener('click', (e) => {
                    // Ignore clicks on footer buttons
                    if (e.target.closest('.update-card-footer')) {
                        return;
                    }
                    selectUpdate(up);
                });

                // Attach direct action listeners
                const tweetBtn = card.querySelector('.btn-tweet-sm');
                tweetBtn.addEventListener('click', () => {
                    selectUpdate(up);
                    openDrawer();
                });

                const copyBtn = card.querySelector('.btn-copy-sm');
                copyBtn.addEventListener('click', () => {
                    const cleanText = `BigQuery Update (${up.date}): [${up.category}] ${up.body_text}\n\nDetails: ${up.link}`;
                    navigator.clipboard.writeText(cleanText).then(() => {
                        showToast("Release note text copied!");
                        
                        // Swap icon temporarily
                        const icon = copyBtn.querySelector('i');
                        icon.setAttribute('data-lucide', 'check');
                        copyBtn.style.color = 'var(--color-feature)';
                        copyBtn.style.borderColor = 'var(--color-feature)';
                        lucide.createIcons();
                        
                        setTimeout(() => {
                            icon.setAttribute('data-lucide', 'copy');
                            copyBtn.style.color = '';
                            copyBtn.style.borderColor = '';
                            lucide.createIcons();
                        }, 2000);
                    }).catch(err => {
                        console.error('Copy failed: ', err);
                        showToast("Failed to copy text", true);
                    });
                });

                updatesContainer.appendChild(card);
            });

            dateGroup.appendChild(updatesContainer);
            timelineContainer.appendChild(dateGroup);
        }

        // Initialize icons
        lucide.createIcons();
    }

    // Return badge theme class names
    function getBadgeClass(category) {
        const cat = category.toLowerCase();
        if (cat === 'feature') return 'badge-feature';
        if (cat === 'issue') return 'badge-issue';
        if (cat === 'breaking') return 'badge-breaking';
        if (cat === 'change') return 'badge-change';
        if (cat === 'announcement') return 'badge-announcement';
        return 'badge-general';
    }

    // Select specific update to tweet
    function selectUpdate(update) {
        state.selectedUpdate = update;
        
        // Add visual selected border
        document.querySelectorAll('.update-card').forEach(card => {
            card.classList.remove('selected');
        });
        
        // Find and highlight current card
        const cards = timelineContainer.querySelectorAll('.update-card');
        state.filteredUpdates.forEach((up, index) => {
            if (up.id === update.id) {
                // Find matching card DOM
                const cardDom = Array.from(cards).find(c => c.innerHTML.includes(`data-id="${update.id}"`));
                if (cardDom) {
                    cardDom.classList.add('selected');
                }
            }
        });

        // Populate drawer details
        previewBadge.className = `badge ${getBadgeClass(update.category)}`;
        previewBadge.textContent = update.category;
        previewDate.textContent = update.date;
        previewContent.innerHTML = update.body_html;

        // Auto-generate tweet draft
        const draftText = generateTweetDraft(update);
        tweetTextarea.value = draftText;
        updateCharacterCount(draftText);

        openDrawer();
    }

    // Open/Close sliding drawer
    function openDrawer() {
        tweetDrawer.classList.add('open');
        drawerOverlay.classList.add('active');
    }

    function closeDrawer() {
        tweetDrawer.classList.remove('open');
        drawerOverlay.classList.remove('active');
        state.selectedUpdate = null;
        
        // Clear selected class from cards
        document.querySelectorAll('.update-card').forEach(card => {
            card.classList.remove('selected');
        });
    }

    // Format draft tweet
    function generateTweetDraft(update) {
        const prefix = `🚀 BigQuery Update (${update.date}):\n[${update.category}] `;
        const suffix = `\n\nRead more: ${update.link}\n#BigQuery #GoogleCloud`;
        
        // Calculate remaining space in tweet
        // URL counts as exactly 23 chars
        const dummyLink = "x".repeat(23);
        const suffixForCount = `\n\nRead more: ${dummyLink}\n#BigQuery #GoogleCloud`;
        
        const baseLength = prefix.length + suffixForCount.length;
        const maxDescriptionLength = 280 - baseLength;
        
        let desc = update.body_text;
        if (desc.length > maxDescriptionLength) {
            desc = desc.substring(0, maxDescriptionLength - 3) + "...";
        }
        
        return `${prefix}${desc}${suffix}`;
    }

    // Count characters accurately (accounting for Twitter's 23-char URL policy)
    function getTwitterLength(text) {
        // Simple URL matcher (http or https)
        const urlRegex = /https?:\/\/[^\s]+/g;
        const dummyLink = "x".repeat(23);
        const textWithDummyUrls = text.replace(urlRegex, dummyLink);
        return textWithDummyUrls.length;
    }

    // Update progress circle and labels for character count
    function updateCharacterCount(text) {
        const count = getTwitterLength(text);
        const remaining = 280 - count;
        
        charCountLabel.textContent = remaining;
        
        if (remaining < 0) {
            charCountLabel.style.color = 'var(--color-breaking)';
            charWarning.style.display = 'flex';
            tweetSubmitBtn.disabled = true;
            tweetSubmitBtn.style.opacity = 0.5;
            tweetSubmitBtn.style.cursor = 'not-allowed';
            
            // Set circle to full red
            progressCircle.style.stroke = 'var(--color-breaking)';
            setProgress(100);
        } else {
            charCountLabel.style.color = 'var(--text-secondary)';
            charWarning.style.display = 'none';
            tweetSubmitBtn.disabled = false;
            tweetSubmitBtn.style.opacity = 1;
            tweetSubmitBtn.style.cursor = 'pointer';
            
            // Set circle progress color and percent
            const percentage = (count / 280) * 100;
            if (remaining <= 30) {
                progressCircle.style.stroke = 'var(--color-issue)'; // Warning yellow/orange
            } else {
                progressCircle.style.stroke = 'var(--primary)'; // Normal indigo
            }
            setProgress(percentage);
        }
    }

    // Set progress SVG ring
    function setProgress(percent) {
        const offset = circleCircumference - (Math.min(percent, 100) / 100) * circleCircumference;
        progressCircle.style.strokeDashoffset = offset;
    }

    // Render shimmer skeleton loading state
    function renderSkeleton() {
        timelineContainer.innerHTML = `
            <div class="skeleton-timeline">
                <div class="skeleton-group">
                    <div class="skeleton-header"></div>
                    <div class="skeleton-card"></div>
                    <div class="skeleton-card"></div>
                </div>
                <div class="skeleton-group">
                    <div class="skeleton-header"></div>
                    <div class="skeleton-card"></div>
                </div>
            </div>
        `;
    }

    // Render API error message
    function renderError(message) {
        timelineContainer.innerHTML = `
            <div class="empty-state">
                <i data-lucide="alert-octagon" style="color: var(--color-breaking); width:64px; height:64px; margin-bottom:20px;"></i>
                <h3>Failed to Load Release Notes</h3>
                <p>${message}</p>
                <button onclick="window.location.reload()" class="btn btn-secondary">Retry Page Load</button>
            </div>
        `;
        lucide.createIcons();
    }

    // Export currently filtered updates to CSV
    function exportToCsv() {
        if (state.filteredUpdates.length === 0) {
            showToast("No updates to export", true);
            return;
        }

        // CSV headers
        let csvContent = "";
        
        // Define header row
        const headers = ["Date", "Category", "Description", "Source Link"];
        
        // Helper to format values for CSV (escaping quotes and wrapping in quotes)
        const formatValue = (val) => {
            if (val === null || val === undefined) return '""';
            let formatted = val.toString().replace(/"/g, '""');
            return `"${formatted}"`;
        };

        const rows = [headers.map(formatValue).join(",")];

        state.filteredUpdates.forEach(up => {
            const row = [
                up.date,
                up.category,
                up.body_text,
                up.link
            ];
            rows.push(row.map(formatValue).join(","));
        });

        const csvString = rows.join("\n");
        
        // Create download link
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        
        // Get current date for filename
        const today = new Date().toISOString().slice(0, 10);
        
        link.setAttribute("href", url);
        link.setAttribute("download", `bigquery_release_notes_${today}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showToast("CSV Exported successfully!");
    }

    // Toast popup notification helper
    function showToast(message, isError = false) {
        toast.querySelector('.toast-message').textContent = message;
        const icon = toast.querySelector('.toast-icon');
        if (isError) {
            icon.setAttribute('data-lucide', 'alert-circle');
            icon.style.color = 'var(--color-breaking)';
        } else {
            icon.setAttribute('data-lucide', 'check-circle');
            icon.style.color = 'var(--color-feature)';
        }
        
        lucide.createIcons();
        
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
});
