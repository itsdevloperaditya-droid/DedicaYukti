window.addEventListener('error', function(e) {
    console.error("🛑 Global JS Error:", e.error);
    if (typeof showToast === "function") {
        // showToast("A technical error occurred. Please refresh.", "error");
    }
});

console.log("🚀 DedicaYukti Script Loading...");

// Production API URL for Render
const API_URL = 'https://dedicayukti-be.onrender.com/api';
const RAZORPAY_KEY_ID = 'rzp_live_SJWx8xpXBRPVsI';

let currentUser = null;
try {
    const savedUser = localStorage.getItem('user');
    if (savedUser && savedUser !== "undefined") {
        currentUser = JSON.parse(savedUser);
    }
} catch (e) {
    console.error("❌ Error parsing user from localStorage:", e);
}
let activeCourseData = null;
let currentAdminSubject = 'physics';
let tempChapters = { physics: [], chemistry: [], maths: [] };
let editingChapterIndex = null;

document.addEventListener('DOMContentLoaded', () => {
    console.log("📑 DOMContentLoaded: Initializing App...");
    
    // 1. Fetch Courses (High Priority)
    try { fetchCourses(); } catch(e) { console.error("Error in fetchCourses init:", e); }
    
    // 2. Auth & Navigation
    try { updateAuthUI(); } catch(e) { console.error("Error in updateAuthUI init:", e); }
    try { initModal(); } catch(e) { console.error("Error in initModal init:", e); }
    
    // 3. UI Enhancements
    try { initHeroAnimation(); } catch(e) { console.error("Error in initHeroAnimation init:", e); }
    try { initFloatingThemeToggle(); } catch(e) { console.error("Error in initFloatingThemeToggle init:", e); }
    try { initHapticFeedback(); } catch(e) { console.error("Error in initHapticFeedback init:", e); }
    
    // 4. Forms & Admin
    try { initContactForm(); } catch(e) { console.error("Error in initContactForm init:", e); }
    try { initProfilePhotoUpload(); } catch(e) { console.error("Error in initProfilePhotoUpload init:", e); }
    try { initAdminFacultyPhoto(); } catch(e) { console.error("Error in initAdminFacultyPhoto init:", e); }
    
    // Mobile Menu
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768) {
            const navWrapper = document.getElementById('nav-links-wrapper');
            const hamburger = document.getElementById('hamburger-menu');
            if (navWrapper && navWrapper.classList.contains('active')) {
                navWrapper.classList.remove('active');
                const icon = hamburger.querySelector('i');
                if (icon) {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            }
        }
    });
});

/**
 * Hero Section Text Animation
 */
function initHeroAnimation() {
    const heroTitle = document.querySelector('.hero h1');
    const heroPara = document.querySelector('.hero p');
    
    if (!heroTitle || !heroPara) return;

    const phrases = [
        "Welcome to DedicaYukti",
        "For JEE & NEET",
        "Smart Learning",
        "Daily Growth",
        "Exam Ready"
    ];
    
    let phraseIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let typingSpeed = 70; // Faster typing

    // 1. Initial Paragraph Slide-up
    setTimeout(() => {
        heroPara.classList.add('reveal-active');
        
        // 2. Start the typewriter loop after paragraph animation starts
        setTimeout(typeLoop, 500);
    }, 200);

    function typeLoop() {
        const currentPhrase = phrases[phraseIndex];
        
        if (isDeleting) {
            heroTitle.textContent = currentPhrase.substring(0, charIndex - 1);
            charIndex--;
            typingSpeed = 30; // Faster deleting
        } else {
            heroTitle.textContent = currentPhrase.substring(0, charIndex + 1);
            charIndex++;
            typingSpeed = 70; // Snappy typing
        }

        // Handle phrase completion
        if (!isDeleting && charIndex === currentPhrase.length) {
            isDeleting = true;
            typingSpeed = 1500; // Shorter pause at the end
        } else if (isDeleting && charIndex === 0) {
            isDeleting = false;
            phraseIndex = (phraseIndex + 1) % phrases.length;
            typingSpeed = 200; // Quick transition to next phrase
        }

        setTimeout(typeLoop, typingSpeed);
    }
}

/**
 * Navbar Theme Toggle Function
 */
function initFloatingThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = document.querySelector('.theme-icon');
    
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        if (themeIcon) themeIcon.textContent = '☀️';
    }
    
    // Toggle theme on button click
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            document.body.classList.toggle('dark-mode');
            
            // Update button icon
            if (document.body.classList.contains('dark-mode')) {
                if (themeIcon) themeIcon.textContent = '☀️';
                localStorage.setItem('theme', 'dark');
            } else {
                if (themeIcon) themeIcon.textContent = '🌙';
                localStorage.setItem('theme', 'light');
            }
            
            // Add animation effect
            this.style.transform = 'scale(0.9)';
            setTimeout(() => {
                this.style.transform = 'scale(1)';
            }, 150);
        });
    }
}

let activeCoupon = null;

/**
 * COUPON LOGIC (Admin & User)
 */
async function createCoupon() {
    const codeEl = document.getElementById('new-coupon-code');
    const discountEl = document.getElementById('new-coupon-discount');
    
    if (!codeEl || !discountEl) return;

    const code = codeEl.value.trim();
    const discountPercentage = discountEl.value.trim();

    if (!code || !discountPercentage) return showToast('Fill all fields', 'error');

    try {
        const res = await fetch(`${API_URL}/admin/coupons`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: code.toUpperCase(), discountPercentage })
        });
        
        const data = await res.json();
        
        if (res.ok) {
            showToast('Coupon Created Successfully!', 'success');
            codeEl.value = '';
            discountEl.value = '';
            loadCoupons();
        } else {
            showToast(data.error || 'Failed to create', 'error');
        }
    } catch (err) { 
        console.error('Coupon creation error:', err);
        showToast('Server connection error', 'error'); 
    }
}

async function loadCoupons() {
    const list = document.getElementById('admin-coupons-list');
    try {
        const res = await fetch(`${API_URL}/admin/coupons`);
        const coupons = await res.json();
        list.innerHTML = coupons.map(c => `
            <div class="coupon-item">
                <div><strong>${c.code}</strong> - ${c.discountPercentage}% OFF</div>
                <button onclick="deleteCoupon('${c._id}')" class="action-btn delete-chapter-btn"><i class="fas fa-trash"></i></button>
            </div>
        `).join('') || '<p class="fetching-msg">No active coupons.</p>';
    } catch (err) {}
}

async function deleteCoupon(id) {
    if (!confirm('Delete this coupon?')) return;
    try {
        await fetch(`${API_URL}/admin/coupons/${id}`, { method: 'DELETE' });
        loadCoupons();
    } catch (err) {}
}

async function applyCoupon() {
    const code = document.getElementById('coupon-input').value.trim();
    const msgEl = document.getElementById('coupon-message');
    
    if (!code) return;

    try {
        const res = await fetch(`${API_URL}/validate-coupon`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code })
        });
        const data = await res.json();

        if (res.ok) {
            // First, reset UI to base price before applying any coupon (fix for multiple clicks)
            const currentCourseId = document.getElementById('details-course-id')?.value || activeCourseData?._id;
            if (currentCourseId) {
                // We use a small internal function or just re-fetch the base price
                // But a simpler way is to store the base price when opening the modal
            }
            
            activeCoupon = { code, discount: data.discountPercentage };
            msgEl.innerText = `✅ Coupon Applied! ${data.discountPercentage}% Discount Added.`;
            msgEl.className = 'coupon-msg success';
            
            // Trigger Confetti Celebration!
            triggerCelebration();

            // Reset UI price to base price first, then apply coupon
            resetPriceAndApplyCoupon(data.discountPercentage);
        } else {
            activeCoupon = null;
            msgEl.innerText = `❌ ${data.error || 'Invalid Coupon'}`;
            msgEl.className = 'coupon-msg error';
            // Reset price to original
            showCourseDetails(document.getElementById('edit-course-id').value, true);
        }
    } catch (err) {
        showToast('Error validating coupon', 'error');
    }
}

function resetPriceAndApplyCoupon(discountPercent) {
    if (!activeCourseData) return;
    
    const priceEl = document.getElementById('details-current-price');
    const originalPrice = Number(activeCourseData.price);
    const discountedPrice = Number(activeCourseData.discountedPrice);
    
    // Determine the base price (either original or already discounted price from dashboard)
    let basePrice = (discountedPrice > 0 && discountedPrice < originalPrice) ? discountedPrice : originalPrice;
    
    // Always apply the coupon discount to the BASE price, not the current UI price
    let newVal = Math.round(basePrice * (1 - (discountPercent / 100)));
    
    priceEl.innerText = `₹${newVal}`;
    priceEl.classList.add('is-discounted');
    
    // Optional: add animation to show price change
    priceEl.style.transform = 'scale(1.1)';
    setTimeout(() => { priceEl.style.transform = 'scale(1)'; }, 200);
}

/**
 * COURSE DETAILS MODAL LOGIC
 */
async function showCourseDetails(courseId, isResetPriceOnly = false) {
    if (!isResetPriceOnly) {
        showGlobalLoader('Loading Batch Details...');
        activeCoupon = null;
        if (document.getElementById('coupon-input')) document.getElementById('coupon-input').value = '';
        if (document.getElementById('coupon-message')) document.getElementById('coupon-message').innerText = '';
    }
    
    const modal = document.getElementById('course-details-modal');
    if (!modal) return;

    try {
        const userId = currentUser ? currentUser.userId : null;
        const res = await fetch(`${API_URL}/course-details?courseId=${courseId}&userId=${userId}`);
        const course = await res.json();

        if (res.ok) {
            // Save current course data for price reset logic
            activeCourseData = course;
            
            // Fill details
            document.getElementById('details-category').innerText = course.category || 'General';
            document.getElementById('details-title').innerText = course.title;
            document.getElementById('details-description').innerText = course.description;

            // Set Modal Thumbnail
            const modalThumb = document.getElementById('details-thumbnail');
            if (modalThumb) {
                modalThumb.src = 'default-thumb.jpeg';
            }
            
            // Features
            const featuresList = document.getElementById('details-features-list');
            featuresList.innerHTML = (course.features && course.features.length > 0) 
                ? course.features.map(f => `<li><i class="fas fa-check-circle"></i> ${f}</li>`).join('')
                : `
                    <li><i class="fas fa-check-circle"></i> Full Syllabus Coverage</li>
                    <li><i class="fas fa-check-circle"></i> Live Interactive Classes</li>
                    <li><i class="fas fa-check-circle"></i> Expert Doubt Sessions</li>
                    <li><i class="fas fa-check-circle"></i> PDF Study Materials</li>
                `;

            // Faculty
            document.getElementById('details-faculty-name').innerText = course.faculty?.name || 'Expert Faculty';
            document.getElementById('details-faculty-bio').innerText = course.faculty?.bio || 'Experienced educator for Science & Competitive exams.';
            if (course.faculty?.photo) {
                document.getElementById('details-faculty-img').src = course.faculty.photo;
            } else {
                document.getElementById('details-faculty-img').src = 'https://via.placeholder.com/80';
            }

            // Price
            const originalPrice = Number(course.price);
            const discountedPrice = Number(course.discountedPrice);
            const hasDiscount = discountedPrice > 0 && discountedPrice < originalPrice;
            const displayPrice = hasDiscount ? discountedPrice : originalPrice;
            
            document.getElementById('details-current-price').innerText = `₹${displayPrice}`;
            if (hasDiscount) {
                document.getElementById('details-original-price').innerText = `₹${originalPrice}`;
                document.getElementById('details-original-price').style.display = 'inline';
                const percent = Math.round(((originalPrice - discountedPrice) / originalPrice) * 100);
                document.getElementById('details-discount-tag').innerText = `${percent}% OFF`;
                document.getElementById('details-discount-tag').style.display = 'inline-block';
            } else {
                document.getElementById('details-original-price').style.display = 'none';
                document.getElementById('details-discount-tag').style.display = 'none';
            }

            // Action Button (Enroll vs View)
            const actionContainer = document.getElementById('details-action-container');
            if (course.hasPurchased) {
                actionContainer.innerHTML = `
                    <button class="dashboard-btn-large" onclick="closeDetailsModal(); showCourseContent('${course._id}')">
                        <i class="fas fa-play-circle"></i> View Batch Content
                    </button>
                `;
            } else {
                actionContainer.innerHTML = `
                    <button class="enroll-btn-large" onclick="openOrderSummary()">
                        <i class="fas fa-shopping-cart"></i> Enroll in Batch Now
                    </button>
                `;
            }

            // Hide Navbar Actions & Bottom Nav when details are open
            const navRight = document.querySelector('.nav-right-actions');
            const bottomNav = document.querySelector('.bottom-nav');
            if (navRight) navRight.classList.add('hidden');
            if (bottomNav) bottomNav.classList.add('hidden');

            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
            hideGlobalLoader();
        }
    } catch (err) {
        showToast('Error loading details', 'error');
        hideGlobalLoader();
    }
}

function closeDetailsModal() {
    document.getElementById('course-details-modal').style.display = 'none';
    document.body.style.overflow = '';
    
    // Show Navbar Actions & Bottom Nav again if we are on home page
    const navRight = document.querySelector('.nav-right-actions');
    const bottomNav = document.querySelector('.bottom-nav');
    const heroVisible = !document.getElementById('hero-section').classList.contains('hidden');
    if (navRight && heroVisible) navRight.classList.remove('hidden');
    if (bottomNav && heroVisible) bottomNav.classList.remove('hidden');
}

/**
 * Navigation logic
 */
function showSection(sectionId) {
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => {
        section.classList.add('hidden');
    });

    const targetSection = document.getElementById(`${sectionId}-section`);
    if (targetSection) {
        targetSection.classList.remove('hidden');
    }

    // Handle Bottom Nav Active State
    const bottomNavItems = document.querySelectorAll('.bottom-nav-item');
    bottomNavItems.forEach(item => {
        const isCurrent = item.getAttribute('onclick').includes(`'${sectionId}'`);
        item.classList.toggle('active', isCurrent);
    });

    // Handle Navbar Actions visibility (Theme Toggle + Auth)
    const navRight = document.querySelector('.nav-right-actions');
    if (navRight) {
        if (sectionId === 'home') {
            navRight.classList.remove('hidden');
        } else {
            navRight.classList.add('hidden');
        }
    }

    // Special logic for each section
    if (sectionId === 'home') {
        document.getElementById('hero-section').classList.remove('hidden');
        fetchCourses();
    } else {
        document.getElementById('hero-section').classList.add('hidden');
    }

    if (sectionId === 'more') {
        showMoreSubSection('main'); // Always show the main menu first
    }

    if (sectionId === 'profile') {
        fetchUserProfile();
    } else if (sectionId === 'batches') {
        fetchMyBatches();
    }
}

/**
 * ACCOUNT DELETION WORKFLOW
 */
function openDeleteModal() {
    document.getElementById('delete-account-modal').style.display = 'flex';
    document.getElementById('delete-pass-1').value = '';
    document.getElementById('delete-pass-2').value = '';
}

function closeDeleteModal() {
    document.getElementById('delete-account-modal').style.display = 'none';
}

async function processAccountDeletion() {
    if (!currentUser) return;

    const pass1 = document.getElementById('delete-pass-1').value;
    const pass2 = document.getElementById('delete-pass-2').value;

    if (!pass1 || !pass2) {
        return showToast('Please fill both password fields', 'error');
    }

    if (pass1 !== pass2) {
        return showToast('Passwords do not match', 'error');
    }

    if (!confirm('FINAL WARNING: This action CANNOT be undone. All your purchased batches and data will be lost forever. Do you really want to proceed?')) {
        return;
    }

    try {
        const res = await fetch(`${API_URL}/delete-account`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser.userId, password: pass1 })
        });

        const data = await res.json();

        if (res.ok) {
            showToast('Account Deleted successfully.', 'success');
            // Cleanup and redirect
            localStorage.removeItem(`profile_${currentUser.userId}`);
            localStorage.removeItem('user');
            setTimeout(() => {
                location.reload();
            }, 2000);
        } else {
            showToast(data.error || 'Deletion failed. Check password.', 'error');
        }
    } catch (err) {
        console.error('Delete error:', err);
        showToast('Server connection error. Please try again.', 'error');
    }
}

/**
 * MORE SECTION SUB-NAVIGATION
 */
function showMoreSubSection(subId) {
    const mainList = document.getElementById('more-menu-list');
    const subContents = document.querySelectorAll('.more-sub-content');
    
    // Hide everything
    mainList.classList.add('hidden');
    subContents.forEach(c => c.classList.add('hidden'));
    
    if (subId === 'main') {
        mainList.classList.remove('hidden');
    } else {
        const target = document.getElementById(`sub-${subId}`);
        if (target) target.classList.remove('hidden');
    }
}

/**
 * --- ADMIN FUNCTIONS ---
 */
let isAdmin = false;

function openAdminLogin() {
    const modal = document.getElementById('admin-login-modal');
    if (modal) {
        modal.style.display = 'flex';
        // Clear old inputs for privacy
        document.getElementById('admin-user').value = '';
        document.getElementById('admin-pass').value = '';
    }
}

function closeAdminLogin() {
    document.getElementById('admin-login-modal').style.display = 'none';
}

// Admin Login Handler
document.getElementById('admin-login-form').onsubmit = async (e) => {
    e.preventDefault();
    const username = document.getElementById('admin-user').value;
    const password = document.getElementById('admin-pass').value;
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerText;
    submitBtn.innerText = 'Checking...';
    submitBtn.disabled = true;

    try {
        const res = await fetch(`${API_URL}/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (data.success) {
            isAdmin = true;
            closeAdminLogin();
            showSection('admin');
            switchAdminDashboardTab('courses'); // Default to courses
            showToast('Welcome Admin!', 'success');
        } else {
            showToast(data.error || 'Login Failed', 'error');
        }
    } catch (err) {
        showToast('Connection failed. Try again.', 'error');
    } finally {
        submitBtn.innerText = originalText;
        submitBtn.disabled = false;
    }
};

// Add Course Handler
const addCourseForm = document.getElementById('add-course-form');
if (addCourseForm) {
    addCourseForm.onsubmit = async (e) => {
        e.preventDefault();
        const title = document.getElementById('new-course-title').value;
        const description = document.getElementById('new-course-desc').value;
        const category = document.getElementById('new-course-cat').value;
        const price = document.getElementById('new-course-price').value;
        const discountedPrice = document.getElementById('new-course-discount').value;

        try {
            const res = await fetch(`${API_URL}/courses`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, description, category, price, discountedPrice })
            });
            const data = await res.json();
            if (res.ok) {
                showToast('Course Created Successfully!', 'success');
                addCourseForm.reset();
                loadAdminDashboard();
            } else {
                showToast(data.error || 'Failed to create course', 'error');
            }
        } catch (err) {
            showToast('Server Error', 'error');
        }
    };
}

function switchAdminDashboardTab(tabId) {
    // Buttons
    document.querySelectorAll('.admin-nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.innerText.toLowerCase().includes(tabId));
    });
    
    // Panels
    document.querySelectorAll('.admin-dashboard-panel').forEach(panel => {
        panel.style.display = panel.id.includes(tabId) ? 'block' : 'none';
    });

    if (tabId === 'users') {
        loadAllRegisteredUsers();
    } else if (tabId === 'courses') {
        loadAdminDashboard();
    }
}

async function loadAllRegisteredUsers() {
    const list = document.getElementById('all-users-list');
    list.innerHTML = '<div class="loader">Fetching users...</div>';

    try {
        const res = await fetch(`${API_URL}/admin/all-users`);
        const users = await res.json();

        if (users.length === 0) {
            list.innerHTML = '<p class="fetching-msg">No registered users yet.</p>';
            return;
        }

        list.innerHTML = users.map(user => {
            const displayName = user.name || 'Guest User';
            const email = user.email;
            const photo = (user.photoUrl && user.photoUrl.trim() !== '') 
                ? user.photoUrl 
                : `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random&size=100`;

            return `
                <div class="admin-user-row" onclick="showAdminUserDetails('${user._id}')" style="cursor:pointer;">
                    <img src="${photo}" class="admin-user-avatar" alt="${displayName}">
                    <div class="admin-user-info">
                        <strong>${displayName}</strong>
                        <small>${email}</small>
                    </div>
                    <div class="admin-user-date" style="font-size:0.75rem; color:#999; text-align:right;">
                        <i class="fas fa-chevron-right" style="margin-left:10px; color:#ddd;"></i>
                    </div>
                </div>
            `;
        }).join('');
    } catch (err) {
        list.innerHTML = '<p class="fetching-msg" style="color:red;">Failed to load user list.</p>';
    }
}

async function showAdminUserDetails(userId) {
    try {
        const res = await fetch(`${API_URL}/admin/user-details/${userId}`);
        const user = await res.json();

        if (res.ok) {
            const displayName = user.name || 'Guest User';
            document.getElementById('admin-view-user-name').innerText = displayName;
            document.getElementById('admin-view-user-email').innerText = user.email;
            document.getElementById('admin-view-user-joined').innerText = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A';
            
            // Fixed Count Logic: Use the length of the resolved purchasedBatches array
            const batchCount = user.purchasedBatches ? user.purchasedBatches.length : 0;
            document.getElementById('admin-view-user-count').innerText = `${batchCount} ${batchCount === 1 ? 'Batch' : 'Batches'}`;
            
            const photo = (user.photoUrl && user.photoUrl.trim() !== '') 
                ? user.photoUrl 
                : `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random&size=150`;
            document.getElementById('admin-view-user-img').src = photo;

            // Render Batches
            const batchContainer = document.getElementById('admin-view-user-batches');
            if (user.purchasedBatches && user.purchasedBatches.length > 0) {
                batchContainer.innerHTML = user.purchasedBatches.map(b => {
                    const price = b.discountedPrice || b.price;
                    return `
                        <div style="background:var(--bg-primary); padding:12px 15px; border-radius:12px; border:1px solid var(--border-light); display:flex; justify-content:space-between; align-items:center;">
                            <div style="text-align: left;">
                                <span style="font-size:0.75rem; color:var(--accent); font-weight:700; text-transform:uppercase;">${b.category || 'Course'}</span>
                                <div style="font-weight:700; font-size:0.95rem; color:var(--text-primary);">${b.title}</div>
                            </div>
                            <div style="font-weight:800; color:var(--success);">₹${price}</div>
                        </div>
                    `;
                }).join('');
            } else {
                batchContainer.innerHTML = '<p style="color:#999; font-style:italic; text-align:center; padding:20px;">No batches purchased yet.</p>';
            }

            document.getElementById('admin-user-details-modal').style.display = 'flex';
        }
    } catch (err) {
        console.error('User Details Error:', err);
        showToast('Failed to load student details', 'error');
    }
}

function adminLogout() {
    isAdmin = false;
    showSection('home');
    showToast('Logged out', 'info');
}

// Load Admin Dashboard
async function loadAdminDashboard(retryCount = 0) {
    showGlobalLoader('Opening Admin Dashboard...');
    const list = document.getElementById('admin-course-list');
    list.innerHTML = '<div class="loader">Loading Dashboard...</div>';
    
    try {
        const statsRes = await fetch(`${API_URL}/admin/stats`);
        const stats = await statsRes.json();
        const res = await fetch(`${API_URL}/courses`);
        const courses = await res.json();
        
        updateAdminStats(stats.totalCourses, stats.totalUsers, stats.totalPotentialRevenue);

        list.innerHTML = '';
        if(!Array.isArray(courses) || courses.length === 0) {
            list.innerHTML = '<p style="text-align:center; padding:20px; color:#666;">No courses found.</p>';
            return;
        }

        courses.forEach(course => {
            const item = document.createElement('div');
            item.style.cssText = 'padding:15px; border-bottom:1px solid #eee; background:#f9f9f9; border-radius:10px; margin-bottom:12px;';
            item.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <strong style="color: #333;">${course.title}</strong>
                        <div style="font-size:0.8rem; color:#666;">Category: ${course.category}</div>
                    </div>
                    <div style="display:flex; gap:8px;">
                        <button onclick="openFullCourseManager('${course._id}', '${encodeURIComponent(course.title)}')" class="auth-btn" style="background:linear-gradient(135deg, #6366f1, #a855f7); color:white; border:none; padding: 5px 15px; font-size:0.8rem; border-radius:8px;">Manage</button>
                        <button onclick="deleteCourse('${course._id}')" class="auth-btn logout-btn" style="padding: 5px 10px; font-size:0.8rem; border-radius:8px;"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
            `;
            list.appendChild(item);
        });
        hideGlobalLoader();
    } catch (err) {
        console.error(err);
        hideGlobalLoader();
    }
}

function updateAdminStats(totalCourses, totalUsers, totalPotentialRevenue) {
    const courseEl = document.getElementById('stat-total-courses');
    const userEl = document.getElementById('stat-total-users');
    const revenueEl = document.getElementById('stat-total-revenue');
    if (courseEl) courseEl.textContent = totalCourses || 0;
    if (userEl) userEl.textContent = totalUsers || 0;
    if (revenueEl) revenueEl.textContent = '₹' + (totalPotentialRevenue || 0);
}

async function deleteCourse(courseId) {
    if (!confirm('Are you sure?')) return;
    try {
        const res = await fetch(`${API_URL}/courses/delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ courseId })
        });
        loadAdminDashboard();
        showToast('Deleted');
    } catch (err) { showToast('Error'); }
}

/**
 * --- UNIFIED COURSE MANAGER (ADMIN) ---
 */
async function openFullCourseManager(courseId, title) {
    document.getElementById('edit-course-title').innerText = decodeURIComponent(title);
    document.getElementById('edit-course-id').value = courseId;
    document.getElementById('display-course-id').innerText = courseId;
    document.getElementById('edit-content-modal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    switchManagerTab('info');
    loadCoupons(); // Load all active coupons

    try {
        const res = await fetch(`${API_URL}/courses`); 
        const courses = await res.json();
        const course = courses.find(c => c._id === courseId);
        
        if(course) {
            document.getElementById('unified-title').value = course.title || '';
            document.getElementById('unified-desc').value = course.description || '';
            document.getElementById('unified-cat').value = course.category || '';
            document.getElementById('unified-price').value = course.price || 0;
            document.getElementById('unified-discount').value = course.discountedPrice || '';

            // Faculty & Features
            document.getElementById('edit-faculty-name').value = course.faculty?.name || '';
            document.getElementById('edit-faculty-bio').value = course.faculty?.bio || '';
            document.getElementById('edit-course-features').value = (course.features || []).join('\n');
            
            // Set Faculty Photo Preview
            const facultyPreview = document.getElementById('edit-faculty-preview');
            if (facultyPreview) {
                facultyPreview.src = course.faculty?.photo || 'https://via.placeholder.com/60';
            }

            // Load Chapters
            tempChapters = course.chapters || { physics: [], chemistry: [], maths: [] };
            
            // Tests
            document.getElementById('edit-physics-tests').value = (course.testLinks?.physics || []).join('\n');
            document.getElementById('edit-chemistry-tests').value = (course.testLinks?.chemistry || []).join('\n');
            document.getElementById('edit-maths-tests').value = (course.testLinks?.maths || []).join('\n');
            document.getElementById('edit-practice-tests').value = (course.testLinks?.practice || []).join('\n');

            switchAdminSubject('physics');
            loadCourseStats(courseId);
        }
    } catch(err) { showToast('Error loading settings', 'error'); }
}

async function saveFacultyFeatures(e) {
    const saveBtn = e ? e.target : document.querySelector('#manager-faculty-section .save-info-btn');
    if (!saveBtn) return;

    const originalText = saveBtn.innerText;
    saveBtn.innerText = '⏳ Saving...';
    saveBtn.disabled = true;

    const courseId = document.getElementById('edit-course-id').value;
    const name = document.getElementById('edit-faculty-name').value;
    const bio = document.getElementById('edit-faculty-bio').value;
    const features = document.getElementById('edit-course-features').value.split('\n').filter(f => f.trim());
    
    // Get photo from preview src (which is a base64 string after upload)
    const photo = document.getElementById('edit-faculty-preview').src;

    // We MUST include basic info too or they might get overwritten with empty values if not loaded
    const title = document.getElementById('unified-title').value;
    const description = document.getElementById('unified-desc').value;
    const category = document.getElementById('unified-cat').value;
    const price = document.getElementById('unified-price').value;
    const discountedPrice = document.getElementById('unified-discount').value;

    try {
        const res = await fetch(`${API_URL}/courses/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                courseId,
                title,
                description,
                category,
                price,
                discountedPrice,
                faculty: { name, photo, bio },
                features
            })
        });
        
        if (res.ok) {
            showToast('Faculty & Features Saved Successfully!', 'success');
            loadAdminDashboard();
        } else {
            const data = await res.json();
            showToast(data.error || 'Update failed', 'error');
        }
    } catch (err) {
        console.error('Save error:', err);
        showToast('Server connection error', 'error');
    } finally {
        saveBtn.innerText = originalText;
        saveBtn.disabled = false;
    }
}

/**
 * CELEBRATION EFFECT (Confetti)
 */
function triggerCelebration() {
    confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#3b82f6', '#8b5cf6', '#10b981', '#ff4d4d', '#ffffff'],
        zIndex: 2000 // Ensure it's above the modal
    });
}

/**
 * HAPTIC FEEDBACK (Mobile Vibration)
 */
function initHapticFeedback() {
    document.addEventListener('click', (e) => {
        // Target buttons, links that look like buttons, or their children
        const target = e.target.closest('button, a, .course-card, .tab-btn');
        if (target && window.navigator && window.navigator.vibrate) {
            // A short, sharp vibration pulse (30-50ms)
            window.navigator.vibrate(40);
        }
    }, { passive: true });
}

/**
 * Handle Admin Faculty Photo Upload
 */
function initAdminFacultyPhoto() {
    const photoInput = document.getElementById('edit-faculty-photo');
    if (photoInput) {
        photoInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    document.getElementById('edit-faculty-preview').src = event.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }
}

function switchManagerTab(tabId) {
    document.querySelectorAll('.manager-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.innerText.toLowerCase().includes(tabId));
    });
    document.querySelectorAll('.manager-panel').forEach(panel => {
        panel.style.display = panel.id.includes(tabId) ? 'block' : 'none';
    });
}

// Unified Info Form Handler (Price & Basic Info)
const unifiedInfoForm = document.getElementById('unified-info-form');
if (unifiedInfoForm) {
    unifiedInfoForm.onsubmit = async (e) => {
        e.preventDefault();
        const courseId = document.getElementById('edit-course-id').value;
        const title = document.getElementById('unified-title').value;
        const description = document.getElementById('unified-desc').value;
        const category = document.getElementById('unified-cat').value;
        const price = document.getElementById('unified-price').value;
        const discountedPrice = document.getElementById('unified-discount').value;

        const saveBtn = unifiedInfoForm.querySelector('button[type="submit"]');
        const originalText = saveBtn.innerText;
        saveBtn.innerText = '⏳ Updating...';
        saveBtn.disabled = true;

        try {
            const res = await fetch(`${API_URL}/courses/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    courseId, 
                    title, 
                    description, 
                    category, 
                    price, 
                    discountedPrice 
                })
            });
            const data = await res.json();
            if (res.ok) {
                showToast('Basic Info & Price Updated!', 'success');
                // Refresh both the dashboard list and the main course grid
                loadAdminDashboard();
                fetchCourses(); 
            } else {
                showToast(data.error || 'Update failed', 'error');
            }
        } catch (err) {
            showToast('Server Error', 'error');
        } finally {
            saveBtn.innerText = originalText;
            saveBtn.disabled = false;
        }
    };
}

function switchAdminSubject(subject) {
    currentAdminSubject = subject;
    document.querySelectorAll('.content-sub-nav .admin-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.innerText.toLowerCase() === subject);
    });
    document.getElementById('current-admin-subject-label').innerText = subject.charAt(0).toUpperCase() + subject.slice(1) + ' Chapters';
    document.getElementById('chapter-manager-area').style.display = 'block';
    document.getElementById('admin-tests-section').style.display = 'none';
    renderAdminChapters();
}

function switchAdminTab(type) {
    const chapterArea = document.getElementById('chapter-manager-area');
    const testsSection = document.getElementById('admin-tests-section');
    const btns = document.querySelectorAll('.content-sub-nav .admin-tab-btn');

    if (type === 'tests') {
        if (chapterArea) chapterArea.style.display = 'none';
        if (testsSection) testsSection.style.display = 'block';
        btns.forEach(btn => btn.classList.toggle('active', btn.innerText.toLowerCase().includes('tests')));
    } else {
        if (chapterArea) chapterArea.style.display = 'block';
        if (testsSection) testsSection.style.display = 'none';
        switchAdminSubject(type);
    }
}

function renderAdminChapters() {
    const list = document.getElementById('chapters-list');
    const chapters = tempChapters[currentAdminSubject] || [];
    
    if (chapters.length === 0) {
        list.innerHTML = '<p style="text-align:center; color:#999; padding:20px;">No chapters added yet.</p>';
        return;
    }

    list.innerHTML = chapters.map((ch, index) => `
        <div class="chapter-admin-card">
            <div class="chapter-info">
                <h4>Chapter ${index + 1}: ${ch.title}</h4>
                <p>${ch.videos?.length || 0} Videos • ${ch.notes?.length || 0} Notes</p>
            </div>
            <div class="chapter-actions">
                <button onclick="editChapter(${index})" class="action-btn edit-chapter-btn"><i class="fas fa-edit"></i></button>
                <button onclick="deleteChapter(${index})" class="action-btn delete-chapter-btn"><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `).join('');
}

function addNewChapter() {
    editingChapterIndex = null;
    document.getElementById('modal-chapter-name').value = '';
    document.getElementById('modal-chapter-videos').value = '';
    document.getElementById('modal-chapter-notes').value = '';
    document.getElementById('modal-chapter-title').innerText = 'Add New Chapter';
    document.getElementById('chapter-content-modal').style.display = 'flex';
}

function editChapter(index) {
    editingChapterIndex = index;
    const ch = tempChapters[currentAdminSubject][index];
    document.getElementById('modal-chapter-name').value = ch.title;
    document.getElementById('modal-chapter-videos').value = (ch.videos || []).join('\n');
    document.getElementById('modal-chapter-notes').value = (ch.notes || []).join('\n');
    document.getElementById('modal-chapter-title').innerText = 'Edit Chapter ' + (index + 1);
    document.getElementById('chapter-content-modal').style.display = 'flex';
}

function applyChapterChanges() {
    const title = document.getElementById('modal-chapter-name').value;
    const videos = document.getElementById('modal-chapter-videos').value.split('\n').filter(l => l.trim());
    const notes = document.getElementById('modal-chapter-notes').value.split('\n').filter(l => l.trim());

    if (!title) return alert('Enter chapter name');

    const chData = { title, videos, notes };

    if (editingChapterIndex !== null) {
        tempChapters[currentAdminSubject][editingChapterIndex] = chData;
    } else {
        tempChapters[currentAdminSubject].push(chData);
    }

    closeChapterModal();
    renderAdminChapters();
}

function deleteChapter(index) {
    if (confirm('Delete this chapter?')) {
        tempChapters[currentAdminSubject].splice(index, 1);
        renderAdminChapters();
    }
}

function closeChapterModal() {
    document.getElementById('chapter-content-modal').style.display = 'none';
}

async function saveCourseContent(e) {
    const courseId = document.getElementById('edit-course-id').value;
    if (!courseId) return showToast('Course ID missing!', 'error');

    // Get the button that was clicked to show loading state
    const saveBtn = e ? e.target : document.querySelector('.full-save-btn');
    if (!saveBtn) return; 

    const originalText = saveBtn.innerText;
    saveBtn.innerText = '⏳ Saving...';
    saveBtn.disabled = true;

    const parse = (id) => {
        const el = document.getElementById(id);
        return el ? el.value.split('\n').map(l => l.trim()).filter(l => l.length > 0) : [];
    };

    const testLinks = {
        physics: parse('edit-physics-tests'),
        chemistry: parse('edit-chemistry-tests'),
        maths: parse('edit-maths-tests'),
        practice: parse('edit-practice-tests')
    };

    try {
        const res = await fetch(`${API_URL}/update-course-content`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                courseId, 
                chapters: tempChapters, 
                testLinks
            })
        });
        
        const data = await res.json();
        
        if (res.ok) {
            showToast('Changes Saved Successfully!', 'success');
        } else {
            showToast(data.error || 'Failed to save', 'error');
        }
    } catch(err) {
        console.error('Save error:', err);
        showToast('Server connection error', 'error');
    } finally {
        saveBtn.innerText = originalText;
        saveBtn.disabled = false;
    }
}

async function loadCourseStats(courseId) {
    const list = document.getElementById('course-user-list');
    try {
        const res = await fetch(`${API_URL}/admin/course-stats?courseId=${courseId}`);
        const data = await res.json();
        document.getElementById('course-total-students').innerText = data.totalEnrolled || 0;
        if (data.users?.length > 0) {
            list.innerHTML = data.users.map(u => `<div class="user-enrollment-item"><div><strong>${u.name}</strong><br><small>${u.email}</small></div></div>`).join('');
        } else list.innerHTML = '<p class="fetching-msg">No students yet.</p>';
    } catch (err) {}
}

/**
 * --- STUDENT DASHBOARD (CHAPTERS) ---
 */
// Modern SVG Icons
const icons = {
    video: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon></svg>`,
    pdf: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>`,
    test: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>`,
    physics: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="7"></circle><path d="M12 9v6M9 12h6"></path></svg>`,
    chemistry: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 2v8M14 2v8M8.5 15c.7-1.2 2.1-2 3.5-2s2.8.8 3.5 2M12 11c-3.3 0-6 2.7-6 6v2c0 1 1 2 2 2h8c1 0 2-1 2-2v-2c0-3.3-2.7-6-6-6Z"></path></svg>`,
    maths: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`
};

/**
 * Courses Logic
 */
async function fetchCourses() {
    console.log("🎬 fetchCourses() starting...");
    const container = document.getElementById('course-container');
    if (!container) return;

    container.innerHTML = `
        <div class="loader">
            <i class="fas fa-satellite-dish fa-spin" style="font-size: 2rem; margin-bottom: 15px; color: var(--accent);"></i>
            <p>Connecting to DedicaYukti Cloud...</p>
            <small style="opacity: 0.6; font-size: 0.7rem;">Target: ${API_URL}</small>
        </div>
    `;

    try {
        // Diagnostic Check
        try {
            const diagController = new AbortController();
            const diagTimeout = setTimeout(() => diagController.abort(), 3000);
            await fetch(`${API_URL}/test`, { signal: diagController.signal });
            console.log("🟢 Backend server is reachable");
            clearTimeout(diagTimeout);
        } catch (e) {
            console.warn("⚠️ Backend reachable check failed");
        }

        // Main Data Fetch
        const coursesPromise = fetch(`${API_URL}/courses`).then(r => {
            if (!r.ok) throw new Error(`Server returned ${r.status}`);
            return r.json();
        });

        let batchesPromise = Promise.resolve([]);
        if (currentUser && currentUser.userId) {
            const batchController = new AbortController();
            const batchTimeout = setTimeout(() => batchController.abort(), 4000);
            batchesPromise = fetch(`${API_URL}/my-batches?userId=${currentUser.userId}`, { signal: batchController.signal })
                .then(r => r.ok ? r.json() : [])
                .catch(() => [])
                .finally(() => clearTimeout(batchTimeout));
        }

        const [courses, batches] = await Promise.all([coursesPromise, batchesPromise]);
        console.log("✅ Courses data received:", courses.length);

        let purchasedCourseIds = [];
        if (Array.isArray(batches)) {
            purchasedCourseIds = batches.map(b => b._id ? b._id.toString() : b.toString());
        }

        container.innerHTML = '';
        if (!courses || !Array.isArray(courses) || courses.length === 0) {
            container.innerHTML = '<p class="loader">No courses available at the moment.</p>';
            return;
        }
        
        courses.forEach(course => {
            const developerEmails = ['its.devloper.aditya@gmail.com', 'ankeshanandart@gmail.com', 'niraj.kumar297@gmail.com'];
            const isDeveloper = currentUser && developerEmails.includes(currentUser.email);
            const isPurchased = course._id && purchasedCourseIds.includes(course._id.toString());
            const hasAccess = isDeveloper || isPurchased;
            
            const originalPrice = Number(course.price) || 0;
            const discountedPrice = Number(course.discountedPrice) || 0;
            const hasDiscount = discountedPrice > 0 && discountedPrice < originalPrice;
            const displayPrice = hasDiscount ? discountedPrice : originalPrice;
            
            let discountPercent = 0;
            if (hasDiscount && originalPrice > 0) {
                discountPercent = Math.round(((originalPrice - discountedPrice) / originalPrice) * 100);
            }

            const card = document.createElement('div');
            card.className = 'course-card';
            card.onclick = () => showCourseDetails(course._id);
            
            card.innerHTML = `
                <div class="course-card-banner animated-placeholder">
                    <div class="placeholder-text-animated">DedicaYukti</div>
                    <div class="banner-overlay-soft"></div>
                </div>
                <div class="course-card-content">
                    <h2 class="course-title-modern">${course.title || 'Untitled Batch'}</h2>
                    <p class="course-desc-modern">${course.description || 'No description available.'}</p>
                    <div class="course-stats-modern">
                        <span><i class="far fa-play-circle"></i> Lectures</span>
                        <span><i class="far fa-star"></i> 4.9</span>
                        <span><i class="far fa-clock"></i> Lifetime</span>
                    </div>
                    <div class="course-footer-modern">
                        <div class="price-section-modern">
                            ${hasDiscount ? `
                                <div class="discount-row-modern" style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                                    <span class="original-price-modern" style="font-size: 0.8rem; color: #94a3b8; text-decoration: line-through;">₹${originalPrice}</span>
                                    <span class="discount-tag-modern">-${discountPercent}%</span>
                                </div>
                            ` : ''}
                            <span class="final-price-modern" style="font-size: 1.5rem; font-weight: 900; color: #3b82f6;">₹${displayPrice}</span>
                        </div>
                        ${hasAccess ? 
                            `<button class="modern-buy-btn access" onclick="event.stopPropagation(); showCourseContent('${course._id}')">Access Now</button>` : 
                            `<button class="modern-buy-btn buy" onclick="event.stopPropagation(); showCourseDetails('${course._id}')">Buy Now</button>`
                        }
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (error) {
        console.error("❌ Fatal fetchCourses error:", error);
        container.innerHTML = `
            <div style="padding: 40px; text-align: center; background: rgba(239, 68, 68, 0.05); border-radius: 20px; border: 1px solid rgba(239, 68, 68, 0.1);">
                <i class="fas fa-wifi" style="font-size: 2.5rem; color: #ef4444; margin-bottom: 15px;"></i>
                <h3 style="color: #ef4444; margin-bottom: 10px;">Connection Error</h3>
                <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 20px;">We couldn't reach the server. Refresh or try again.</p>
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button onclick="fetchCourses()" class="modern-buy-btn buy" style="min-width: 140px;"><i class="fas fa-sync-alt"></i> Retry</button>
                    <button onclick="location.reload()" class="modern-buy-btn access" style="min-width: 140px; background: #64748b !important;"><i class="fas fa-redo"></i> Refresh</button>
                </div>
            </div>
        `;
    }
}

async function showCourseContent(courseId) {
    if (!currentUser) return showToast('Login first', 'error');
    showGlobalLoader('Opening Course Dashboard...');
    try {
        const res = await fetch(`${API_URL}/course-details?courseId=${courseId}&userId=${currentUser.userId}`);
        const course = await res.json();
        activeCourseData = course;

        const dashboardHtml = `
            <div id="course-dashboard" class="course-dashboard-modal">
                <div class="dashboard-content">
                    <div class="dashboard-header">
                        <h2>${course.title}</h2>
                        <button onclick="closeDashboard()" class="close-dashboard"><i class="fas fa-times"></i></button>
                    </div>
                    <div class="dashboard-tabs">
                        <button class="dashboard-tab-btn active" onclick="switchDashboardTab('subject')"><i class="fas fa-book-reader"></i> Lectures</button>
                        <button class="dashboard-tab-btn" onclick="switchDashboardTab('notes')"><i class="fas fa-file-pdf"></i> Notes</button>
                        <button class="dashboard-tab-btn" onclick="switchDashboardTab('tests')"><i class="fas fa-vials"></i> Tests</button>
                    </div>
                    <div class="dashboard-body">
                        <div id="subject-panel" class="tab-panel active">
                            <div class="subject-nav">
                                <button class="subject-btn active" onclick="switchStudentSubject('physics')"><span class="btn-icon">${icons.physics}</span><span>Physics</span></button>
                                <button class="subject-btn" onclick="switchStudentSubject('chemistry')"><span class="btn-icon">${icons.chemistry}</span><span>Chemistry</span></button>
                                <button class="subject-btn" onclick="switchStudentSubject('maths')"><span class="btn-icon">${icons.maths}</span><span>Maths</span></button>
                            </div>
                            <div id="chapters-container" class="content-grid"></div>
                        </div>
                        <div id="notes-panel" class="tab-panel"></div>
                        <div id="tests-panel" class="tab-panel"></div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', dashboardHtml);
        document.body.style.overflow = 'hidden';

        // Hide Navbar Actions & Bottom Nav
        const navRight = document.querySelector('.nav-right-actions');
        const bottomNav = document.querySelector('.bottom-nav');
        if (navRight) navRight.classList.add('hidden');
        if (bottomNav) bottomNav.classList.add('hidden');

        switchStudentSubject('physics');
        hideGlobalLoader();
    } catch(err) {
        hideGlobalLoader();
    }
}

function switchStudentSubject(subject) {
    const container = document.getElementById('chapters-container');
    document.querySelectorAll('#subject-panel .subject-btn').forEach(btn => btn.classList.toggle('active', btn.innerText.toLowerCase().includes(subject)));
    
    const chapters = activeCourseData.chapters?.[subject] || [];
    if (chapters.length === 0) {
        container.innerHTML = `<div class="empty-container"><div class="empty-icon">${icons[subject]}</div><p>No chapters for ${subject} yet.</p></div>`;
        return;
    }

    container.innerHTML = chapters.map((ch, index) => `
        <div class="student-chapter-card" onclick="openChapterContent('${subject}', ${index})">
            <div class="chapter-number">${index + 1}</div>
            <div class="chapter-info">
                <h4>${ch.title}</h4>
                <p>${ch.videos?.length || 0} Lectures • ${ch.notes?.length || 0} Study Material</p>
            </div>
            <div class="card-action"><i class="fas fa-chevron-right"></i></div>
        </div>
    `).join('');
}

function openChapterContent(subject, index) {
    const ch = activeCourseData.chapters[subject][index];
    const container = document.getElementById('chapters-container');
    
    container.innerHTML = `
        <div style="width: 100%;">
            <button class="back-btn" onclick="switchStudentSubject('${subject}')"><i class="fas fa-arrow-left"></i> Back to Chapters</button>
            <h3 style="margin-bottom:15px; font-size: 1.1rem; font-weight: 800; color: var(--text-primary);">${ch.title}</h3>
            
            <div class="dashboard-section">
                <div class="content-grid">
                    ${(ch.videos || []).map((link, i) => {
                        const noteLink = ch.notes && ch.notes[i] ? ch.notes[i] : null;
                        return `
                        <div class="content-card video-card-flex">
                            <a href="${link}" target="_blank" class="card-main-content">
                                <div class="card-icon video-icon" style="background: rgba(59, 130, 246, 0.1); color: var(--accent);">${icons.video}</div>
                                <div class="card-info">
                                    <h4>Part ${i+1}: Video Lecture</h4>
                                    <p>Watch video lessons</p>
                                </div>
                            </a>
                            ${noteLink ? `
                                <a href="${noteLink}" target="_blank" class="card-note-link">
                                    <i class="fas fa-file-download"></i> Download Study Notes
                                </a>
                            ` : ''}
                        </div>
                        `;
                    }).join('') || '<p style="color:#999; font-style:italic; text-align:center; padding:20px;">No lectures available.</p>'}
                    
                    ${(ch.notes || []).slice(ch.videos ? ch.videos.length : 0).map((link, i) => `
                        <a href="${link}" target="_blank" class="content-card">
                            <div class="card-main-content">
                                <div class="card-icon note-icon" style="background: rgba(16, 185, 129, 0.1); color: var(--success);">${icons.pdf}</div>
                                <div class="card-info">
                                    <h4>Additional Note ${i+1}</h4>
                                    <p>Click to download PDF</p>
                                </div>
                            </div>
                        </a>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

// Reuse dashboard switch functions for other tabs if needed
function switchDashboardTab(tabId) {
    // Update button active state
    document.querySelectorAll('.dashboard-tab-btn').forEach(btn => {
        const isMatch = btn.innerText.toLowerCase().includes(tabId) || 
                        (tabId === 'subject' && btn.innerText.toLowerCase().includes('lecture'));
        btn.classList.toggle('active', isMatch);
    });

    // Update panel active state
    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.remove('active');
        if (panel.id.includes(tabId)) {
            panel.classList.add('active');
        }
    });
    
    if (tabId === 'tests') renderTestsTab();
    if (tabId === 'notes') renderNotesTab();
}

function renderTestsTab() {
    const panel = document.getElementById('tests-panel');
    panel.innerHTML = `
        <div class="subject-nav">
            <button class="subject-btn active" onclick="filterTests('physics')"><span class="btn-icon">${icons.physics}</span><span>Physics</span></button>
            <button class="subject-btn" onclick="filterTests('chemistry')"><span class="btn-icon">${icons.chemistry}</span><span>Chemistry</span></button>
            <button class="subject-btn" onclick="filterTests('maths')"><span class="btn-icon">${icons.maths}</span><span>Maths</span></button>
            <button class="subject-btn" onclick="filterTests('practice')"><span class="btn-icon">${icons.test}</span><span>Practice</span></button>
        </div>
        <div id="tests-list-container" class="content-grid"></div>
    `;
    filterTests('physics');
}

function filterTests(subject) {
    const container = document.getElementById('tests-list-container');
    document.querySelectorAll('#tests-panel .subject-btn').forEach(btn => btn.classList.toggle('active', btn.innerText.toLowerCase().includes(subject)));
    const links = activeCourseData.testLinks?.[subject] || [];
    if (links.length === 0) {
        container.innerHTML = `<div class="empty-container" style="grid-column:1/-1;"><div class="empty-icon">${icons.test}</div><p>No tests for ${subject} yet.</p></div>`;
        return;
    }
    container.innerHTML = links.map((link, i) => `
        <a href="${link}" target="_blank" class="content-card test-card">
            <div class="card-icon test-icon">${icons.test}</div>
            <div class="card-info"><h4>${subject.toUpperCase()} Test ${i+1}</h4><p>Assessment Link</p></div>
        </a>
    `).join('');
}

function renderNotesTab() {
    const panel = document.getElementById('notes-panel');
    panel.innerHTML = `
        <div class="subject-nav">
            <button class="subject-btn active" onclick="filterGlobalNotes('physics')"><span class="btn-icon">${icons.physics}</span><span>Physics</span></button>
            <button class="subject-btn" onclick="filterGlobalNotes('chemistry')"><span class="btn-icon">${icons.chemistry}</span><span>Chemistry</span></button>
            <button class="subject-btn" onclick="filterGlobalNotes('maths')"><span class="btn-icon">${icons.maths}</span><span>Maths</span></button>
        </div>
        <div id="global-notes-container" class="content-grid"></div>
    `;
    filterGlobalNotes('physics');
}

function filterGlobalNotes(subject) {
    const container = document.getElementById('global-notes-container');
    document.querySelectorAll('#notes-panel .subject-btn').forEach(btn => btn.classList.toggle('active', btn.innerText.toLowerCase().includes(subject)));
    
    const allChapters = activeCourseData.chapters?.[subject] || [];
    let html = '';
    allChapters.forEach(ch => {
        ch.notes?.forEach((link, i) => {
            html += `
                <a href="${link}" target="_blank" class="content-card note-card">
                    <div class="card-icon note-icon">${icons.pdf}</div>
                    <div class="card-info"><h4>${ch.title} - Note ${i+1}</h4><p>Download PDF</p></div>
                </a>
            `;
        });
    });
    container.innerHTML = html || `<div class="empty-container" style="grid-column:1/-1;"><div class="empty-icon">${icons.pdf}</div><p>No notes for ${subject} yet.</p></div>`;
}

function closeDashboard() {
    const d = document.getElementById('course-dashboard');
    if (d) { 
        d.remove(); 
        document.body.style.overflow = ''; 

        // Show Navbar Actions & Bottom Nav again
        const navRight = document.querySelector('.nav-right-actions');
        const bottomNav = document.querySelector('.bottom-nav');
        
        // Show navigation even if hero is hidden (so user can navigate back)
        if (navRight) navRight.classList.remove('hidden');
        if (bottomNav) bottomNav.classList.remove('hidden');
    }
}

function updateAuthUI() {
    const authControls = document.getElementById('auth-controls');
    const mainNav = document.querySelector('.main-nav');
    if (currentUser) {
        authControls.innerHTML = `<button onclick="logout()" class="auth-btn logout-btn">Logout</button>`;
        mainNav.classList.remove('hidden');
    } else {
        authControls.innerHTML = `<button onclick="openModal()" class="auth-btn">Login / Sign Up</button>`;
        mainNav.classList.add('hidden');
        showSection('home');
    }
}

function openModal() { document.getElementById('auth-modal').style.display = 'flex'; }
function closeModal() { document.getElementById('auth-modal').style.display = 'none'; }
function logout() { 
    if (currentUser) {
        localStorage.removeItem(`profile_${currentUser.userId}`);
    }
    localStorage.removeItem('user'); 
    location.reload(); 
}

function initModal() {
    const authModal = document.getElementById('auth-modal');
    const closeBtn = document.getElementById('close-modal');
    const tabLogin = document.getElementById('tab-login');
    const tabSignup = document.getElementById('tab-signup');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');

    if (closeBtn) {
        closeBtn.onclick = () => {
            authModal.style.display = 'none';
            document.body.style.overflow = 'auto';
        };
    }

    // Close on overlay click
    window.onclick = (e) => {
        if (e.target === authModal) {
            authModal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    };

    if (tabLogin && tabSignup) {
        tabLogin.onclick = () => { 
            tabLogin.classList.add('active'); 
            tabSignup.classList.remove('active'); 
            loginForm.classList.remove('hidden'); 
            signupForm.classList.add('hidden'); 
        };
        tabSignup.onclick = () => { 
            tabSignup.classList.add('active'); 
            tabLogin.classList.remove('active'); 
            signupForm.classList.remove('hidden'); 
            loginForm.classList.add('hidden'); 
        };
    }

    loginForm.onsubmit = async (e) => {
        e.preventDefault();
        showGlobalLoader('Verifying Credentials...');
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        const submitBtn = loginForm.querySelector('.auth-submit-btn-modern');
        const originalText = submitBtn.innerText;
        submitBtn.innerText = 'Logging in...';
        submitBtn.disabled = true;

        try {
            const res = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            if (res.ok && data.userId) {
                currentUser = { userId: data.userId, email };
                localStorage.setItem('user', JSON.stringify(currentUser));
                
                // Trigger Congratulations Burst on Login!
                triggerCelebration();
                showToast('Login Successful!', 'success');

                // Delay reload to show animation
                setTimeout(() => {
                    location.reload();
                }, 1500);
            } else {
                showToast(data.error || 'Login failed', 'error');
            }
        } catch (err) {
            showToast('Server error. Please try again.', 'error');
        } finally {
            submitBtn.innerText = originalText;
            submitBtn.disabled = false;
            hideGlobalLoader();
        }
    };

    signupForm.onsubmit = async (e) => {
        e.preventDefault();
        showGlobalLoader('Creating Your Account...');
        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        try {
            const res = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });
            const data = await res.json();
            if (data.userId) { showToast('Registered! Please login.', 'success'); tabLogin.click(); }
            else showToast(data.error, 'error');
            hideGlobalLoader();
        } catch (err) {
            hideGlobalLoader();
        }
    };
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i><span>${message}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 3000);
}

function fetchUserProfile() {
    if (!currentUser) return;
    
    // First, try to load from local storage for instant UI
    const cachedProfile = JSON.parse(localStorage.getItem(`profile_${currentUser.userId}`));
    if (cachedProfile) {
        updateProfileUI(cachedProfile);
    }

    // Then fetch fresh data from server
    fetch(`${API_URL}/profile?userId=${currentUser.userId}`)
        .then(res => res.json())
        .then(user => {
            if (user) {
                localStorage.setItem(`profile_${currentUser.userId}`, JSON.stringify(user));
                updateProfileUI(user);
            }
        })
        .catch(err => console.error('Error fetching profile:', err));
}

function updateProfileUI(user) {
    const displayName = user.name || currentUser.email.split('@')[0];
    const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=3b82f6&color=fff&size=150`;
    
    const nameEl = document.getElementById('display-name');
    const emailEl = document.getElementById('display-email');
    const imgEl = document.getElementById('profile-img');
    const editNameEl = document.getElementById('edit-name');

    if (nameEl) nameEl.textContent = displayName;
    if (emailEl) emailEl.textContent = user.email;
    
    if (imgEl) {
        // If user has a valid photoUrl, use it. Otherwise use default.
        if (user.photoUrl && user.photoUrl.trim() !== '' && user.photoUrl !== 'https://via.placeholder.com/150') {
            imgEl.src = user.photoUrl;
        } else {
            imgEl.src = defaultAvatar;
        }
    }
    
    if (editNameEl) {
        editNameEl.value = user.name || '';
    }
}

function toggleProfileEdit() {
    const form = document.getElementById('profile-edit-form');
    if (form) {
        form.classList.toggle('hidden');
        
        // Change button text/state
        const btn = document.querySelector('.modern-edit-btn');
        if (btn) {
            btn.innerHTML = form.classList.contains('hidden') 
                ? '<i class="fas fa-user-edit"></i> Edit Profile' 
                : '<i class="fas fa-times"></i> Cancel Edit';
        }
    }
}

async function saveProfile(e) {
    if (!currentUser) return;
    
    const nameEl = document.getElementById('edit-name');
    const imgEl = document.getElementById('profile-img');
    if (!nameEl || !imgEl) return;

    const name = nameEl.value.trim();
    const photoUrl = imgEl.src; 
    
    // Find the button reliably
    const saveBtn = e ? e.currentTarget : document.querySelector('.modern-save-btn');
    if (!saveBtn) return;

    const originalHTML = saveBtn.innerHTML;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    saveBtn.disabled = true;

    try {
        const response = await fetch(`${API_URL}/update-profile`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUser.userId, name, photoUrl })
        });
        
        const data = await response.json();

        if (response.ok) {
            showToast('Profile updated successfully!', 'success');
            
            // Clear local cache so it fetches fresh data
            localStorage.removeItem(`profile_${currentUser.userId}`);
            
            // Force a small delay for better UX feel
            setTimeout(() => {
                fetchUserProfile(); // Refresh UI
                toggleProfileEdit(); // Hide form
            }, 500);
        } else {
            showToast(data.error || 'Failed to update profile', 'error');
        }
    } catch (err) {
        console.error('Save profile error:', err);
        showToast('Error: File may be too large or server timeout.', 'error');
    } finally {
        // ALWAYS reset button state
        saveBtn.innerHTML = originalHTML;
        saveBtn.disabled = false;
    }
}

function initProfilePhotoUpload() {
    const photoInput = document.getElementById('photo-upload');
    if(photoInput) {
        photoInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => { document.getElementById('profile-img').src = event.target.result; };
                reader.readAsDataURL(file);
            }
        });
    }
}

async function fetchMyBatches() {
    if (!currentUser) return;
    const container = document.getElementById('batches-container');
    
    // Header section with premium title and back button
    container.innerHTML = `
        <div class="batches-header">
            <button class="back-btn-modern" onclick="showSection('hero-section')">
                <i class="fas fa-chevron-left"></i>
            </button>
            <div class="batches-title-area">
                <h1>My Batches</h1>
                <p>Welcome back! Let's continue your learning journey.</p>
            </div>
        </div>
        <div class="batches-loader-container">
            <div class="loader-ripple"><div></div><div></div></div>
        </div>
    `;

    try {
        const response = await fetch(`${API_URL}/my-batches?userId=${currentUser.userId}`);
        const batches = await response.json();
        
        container.innerHTML = `
            <div class="batches-header">
                <button class="back-btn-modern" onclick="showSection('hero-section')">
                    <i class="fas fa-chevron-left"></i>
                </button>
                <div class="batches-title-area">
                    <h1>My Batches</h1>
                    <p>You are enrolled in ${batches.length} batch${batches.length !== 1 ? 'es' : ''}</p>
                </div>
            </div>
            <div class="premium-course-grid" id="batches-grid-list"></div>
        `;
        
        const grid = document.getElementById('batches-grid-list');
        if (batches.length === 0) {
            grid.innerHTML = `
                <div class="empty-batches-state">
                    <img src="https://img.icons8.com/bubbles/200/000000/education.png" alt="No batches">
                    <h3>No Batches Found</h3>
                    <p>Explore our courses and start learning today!</p>
                    <button class="explore-btn-large" onclick="showSection('home')">Explore Courses</button>
                </div>
            `;
            return;
        }

        batches.forEach((batch, index) => {
            const card = document.createElement('div');
            card.className = 'premium-batch-card';
            card.style.animationDelay = `${index * 0.1}s`; // Staggered animation
            
            card.innerHTML = `
                <div class="batch-card-banner animated-placeholder">
                    <div class="placeholder-text-animated">DedicaYukti</div>
                </div>
                <div class="batch-badge">Enrolled</div>
                <div class="batch-card-top">
                    <span class="batch-category-tag">${batch.category}</span>
                    <h2>${batch.title}</h2>
                    <p>${batch.description}</p>
                </div>
                <div class="batch-card-middle">
                    <div class="batch-stat">
                        <i class="fas fa-calendar-alt"></i>
                        <span>Validity: Lifetime</span>
                    </div>
                    <div class="batch-stat">
                        <i class="fas fa-check-circle"></i>
                        <span>Active</span>
                    </div>
                </div>
                <div class="batch-card-footer">
                    <button class="study-now-btn" onclick="showCourseContent('${batch._id}')">
                        <span>Study Now</span>
                        <i class="fas fa-arrow-right"></i>
                    </button>
                </div>
            `;
            grid.appendChild(card);
        });
    } catch (error) {
        showToast('Failed to load batches', 'error');
    }
}

function initContactForm() {
    const f = document.getElementById('contact-form');
    if(f) {
        f.onsubmit = async (e) => {
            e.preventDefault();
            showToast('Message sent!', 'success');
            f.reset();
        };
    }
}

async function buyCourse(courseId, courseTitle) {
    if (!currentUser) return (showToast('Login to buy', 'error'), openModal());
    closeDetailsModal(); // Close details view if open
    
    showGlobalLoader('Initializing Secure Payment...');
    const couponCode = activeCoupon ? activeCoupon.code : null;

    try {
        const response = await fetch(`${API_URL}/create-order`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                courseId,
                couponCode
            })
        });
        const orderData = await response.json();
        
        if (!response.ok) {
            return showToast(orderData.error || 'Error creating order', 'error');
        }

        const options = {
            key: RAZORPAY_KEY_ID,
            amount: orderData.amount,
            currency: 'INR',
            name: 'DedicaYukti',
            description: courseTitle + (couponCode ? ` (Applied: ${couponCode})` : ''),
            order_id: orderData.orderId,
            handler: function (res) { verifyPayment(res, courseId); },
            prefill: { 
                name: currentUser.name || '',
                email: currentUser.email,
                contact: currentUser.phone || ''
            },
            notes: {
                course_id: courseId,
                user_id: currentUser.userId,
                source: 'web_mobile'
            },
            theme: { color: '#3b82f6' },
            modal: {
                ondismiss: function() {
                    console.log('Checkout modal closed');
                },
                confirm_close: true,
                escape: false // Prevent accidental closing on mobile back button
            },
            retry: {
                enabled: true,
                max_count: 3
            },
            send_sms_hash: true // Helps with auto-reading OTP on Android
        };
        const rzp = new Razorpay(options);
        rzp.on('payment.failed', function (response){
            showToast('Payment failed: ' + response.error.description, 'error');
        });
        hideGlobalLoader();
        rzp.open();
    } catch (err) {
        showToast('Error creating order', 'error');
        hideGlobalLoader();
    }
}

async function verifyPayment(paymentResponse, courseId) {
    try {
        await fetch(`${API_URL}/payment/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                razorpay_order_id: paymentResponse.razorpay_order_id,
                razorpay_payment_id: paymentResponse.razorpay_payment_id,
                razorpay_signature: paymentResponse.razorpay_signature,
                courseId, userId: currentUser.userId
            })
        });
        
        // Trigger Congratulations Burst on Success!
        triggerCelebration();
        
        showToast('Success!', 'success');
        setTimeout(() => {
            location.reload();
        }, 1500); // Small delay to let the celebration show
    } catch (err) {}
}


/**
 * --- ADMIN: BATCH MANAGEMENT LOGIC ---
 */



/**
 * --- ORDER SUMMARY / BILLING LOGIC ---
 */
function openOrderSummary() {
    if (!activeCourseData) return;
    
    const modal = document.getElementById('order-summary-modal');
    const originalPrice = Number(activeCourseData.price);
    const discountedPrice = Number(activeCourseData.discountedPrice) || originalPrice;
    const itemDiscount = originalPrice - (discountedPrice > 0 ? discountedPrice : originalPrice);
    
    // Fill Billing Details
    document.getElementById('summary-batch-title').innerText = activeCourseData.title;
    document.getElementById('bill-original-price').innerText = `₹${originalPrice}`;
    document.getElementById('bill-item-discount').innerText = `-₹${itemDiscount}`;
    
    // Coupon Logic
    let finalTotal = discountedPrice > 0 ? discountedPrice : originalPrice;
    const couponRow = document.getElementById('bill-coupon-row');
    const couponVal = document.getElementById('bill-coupon-discount');
    
    if (activeCoupon) {
        const couponDiscountAmount = Math.round(finalTotal * (activeCoupon.discount / 100));
        finalTotal -= couponDiscountAmount;
        couponRow.classList.remove('hidden');
        couponVal.innerText = `-₹${couponDiscountAmount}`;
    } else {
        couponRow.classList.add('hidden');
    }
    
    document.getElementById('bill-final-total').innerText = `₹${finalTotal}`;
    
    // Set final button click
    document.getElementById('final-proceed-btn').onclick = () => {
        closeOrderSummary();
        closeDetailsModal();
        buyCourse(activeCourseData._id, activeCourseData.title);
    };

    modal.style.display = 'flex';
}

function closeOrderSummary() {
    const modal = document.getElementById('order-summary-modal');
    if (modal) modal.style.display = 'none';
}



/**
 * --- GLOBAL LOADER HELPERS ---
 */
function showGlobalLoader(text = 'Processing Request...') {
    const loader = document.getElementById('global-loader');
    if (loader) {
        loader.querySelector('p').innerText = text;
        loader.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function hideGlobalLoader() {
    const loader = document.getElementById('global-loader');
    if (loader) {
        loader.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

