// API_URL ko dynamic karo taaki mobile aur PC dono pe chale
const API_URL = window.location.origin + '/api';
const RAZORPAY_KEY_ID = 'rzp_live_SJWx8xpXBRPVsI';

let currentUser = JSON.parse(localStorage.getItem('user')) || null;

document.addEventListener('DOMContentLoaded', () => {
    fetchCourses();
    updateAuthUI();
    initModal();
    initContactForm();
    initProfilePhotoUpload();
    initFloatingThemeToggle();
    
    // Close mobile menu on window resize if open
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768) {
            const navWrapper = document.getElementById('nav-links-wrapper');
            const hamburger = document.getElementById('hamburger-menu');
            if (navWrapper && navWrapper.classList.contains('active')) {
                navWrapper.classList.remove('active');
                const icon = hamburger.querySelector('i');
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        }
    });
});

/**
 * Floating Theme Toggle Function
 */
function initFloatingThemeToggle() {
    const themeToggle = document.getElementById('floating-theme-toggle');
    const themeIcon = document.querySelector('.floating-theme-icon');
    const themeText = document.querySelector('.floating-theme-text');
    
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        if (themeIcon) themeIcon.textContent = '☀️';
        if (themeText) themeText.textContent = 'Light';
    }
    
    // Toggle theme on button click
    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            document.body.classList.toggle('dark-mode');
            
            // Update button icon and text
            if (document.body.classList.contains('dark-mode')) {
                if (themeIcon) themeIcon.textContent = '☀️';
                if (themeText) themeText.textContent = 'Light';
                localStorage.setItem('theme', 'dark');
            } else {
                if (themeIcon) themeIcon.textContent = '🌙';
                if (themeText) themeText.textContent = 'Dark';
                localStorage.setItem('theme', 'light');
            }
            
            // Add animation effect
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = 'scale(1)';
            }, 150);
        });
    }
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

    // Special logic for each section
    if (sectionId === 'home') {
        document.getElementById('hero-section').classList.remove('hidden');
        fetchCourses();
    } else {
        document.getElementById('hero-section').classList.add('hidden');
    }

    if (sectionId === 'profile') {
        fetchUserProfile();
    } else if (sectionId === 'batches') {
        fetchMyBatches();
    }
    
    // Close mobile menu after navigation (for mobile)
    if (window.innerWidth <= 768) {
        const navWrapper = document.getElementById('nav-links-wrapper');
        const hamburger = document.getElementById('hamburger-menu');
        if (navWrapper && navWrapper.classList.contains('active')) {
            navWrapper.classList.remove('active');
            const icon = hamburger.querySelector('i');
            icon.classList.remove('fa-times');
            icon.classList.add('fa-bars');
        }
    }
}

/**
 * --- ADMIN FUNCTIONS ---
 */
let isAdmin = false;

function openAdminLogin() {
    document.getElementById('admin-login-modal').style.display = 'block';
}

function closeAdminLogin() {
    document.getElementById('admin-login-modal').style.display = 'none';
}

// Admin Login Handler
document.getElementById('admin-login-form').onsubmit = async (e) => {
    e.preventDefault();
    const username = document.getElementById('admin-user').value;
    const password = document.getElementById('admin-pass').value;

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
            loadAdminDashboard();
            showToast('Welcome Admin!', 'success');
        } else {
            showToast('Login Failed: ' + data.error, 'error');
        }
    } catch (err) {
        showToast('Server Error', 'error');
    }
};

function adminLogout() {
    isAdmin = false;
    showSection('home');
    showToast('Logged out', 'info');
}

// Load Admin Dashboard
async function loadAdminDashboard(retryCount = 0) {
    const list = document.getElementById('admin-course-list');
    list.innerHTML = '<div class="loader">Loading Dashboard...</div>';
    
    try {
        // Fetch Stats first
        const statsRes = await fetch(`${API_URL}/admin/stats`);
        if (!statsRes.ok) throw new Error('Stats API failed');
        const stats = await statsRes.json();
        
        // Fetch Courses
        const res = await fetch(`${API_URL}/courses`);
        if (!res.ok) throw new Error('Courses API failed');
        const courses = await res.json();
        
        console.log('Admin Dashboard Data:', { stats, courses });
        
        // Update Stats UI
        updateAdminStats(stats.totalCourses, stats.totalUsers, stats.totalPotentialRevenue);

        list.innerHTML = '';
        if(!Array.isArray(courses) || courses.length === 0) {
            list.innerHTML = '<p style="text-align:center; padding:20px; color:#666;">No courses found. Create one above!</p>';
            return;
        }

        let calculatedRevenue = 0;
        courses.forEach(course => {
            const hasDiscount = (course.discountedPrice !== undefined && course.discountedPrice !== null && course.discountedPrice !== '') && Number(course.discountedPrice) < Number(course.price);
            const currentPrice = hasDiscount 
                               ? Number(course.discountedPrice) 
                               : Number(course.price);
            calculatedRevenue += currentPrice;

            const item = document.createElement('div');
            item.style.cssText = 'padding:15px; border-bottom:1px solid #eee; background:#f9f9f9; border-radius:10px; margin-bottom:12px; transition:all 0.2s;';
            item.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                    <div style="flex:1; min-width:200px;">
                        <strong style="font-size:1.1rem; color:#333;">${course.title || 'Untitled'}</strong>
                        <div style="font-size:0.85rem; color:#666; margin-top:4px;">
                            <span style="background:#eef2ff; color:#4f46e5; padding:2px 8px; border-radius:12px; margin-right:8px;">${course.category || 'N/A'}</span>
                            Price: ${hasDiscount ? `<span style="text-decoration:line-through; margin-right:5px;">₹${course.price}</span><span style="color:#10b981; font-weight:600;">₹${course.discountedPrice}</span>` : `<span style="font-weight:600;">₹${course.price}</span>`}
                        </div>
                    </div>
                    <div class="display-flex-gap-8" style="display:flex; gap:8px;">
                        <button onclick="openEditInfo('${course._id}')" title="Edit Info" style="background:#10b981; color:white; border:none; width:36px; height:36px; border-radius:8px; cursor:pointer; display:flex; align-items:center; justify-content:center;">
                            <i class="fas fa-info-circle"></i>
                        </button>
                        <button onclick="editCourseContent('${course._id}', '${encodeURIComponent(course.title || '')}')" title="Manage Content" style="background:#3b82f6; color:white; border:none; width:36px; height:36px; border-radius:8px; cursor:pointer; display:flex; align-items:center; justify-content:center;">
                            <i class="fas fa-play-circle"></i>
                        </button>
                        <button onclick="deleteCourse('${course._id}')" title="Delete Course" style="background:#ef4444; color:white; border:none; width:36px; height:36px; border-radius:8px; cursor:pointer; display:flex; align-items:center; justify-content:center;">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
            list.appendChild(item);
        });

        // Update stats again with client-side calculation to ensure accuracy
        updateAdminStats(courses.length, stats.totalUsers, calculatedRevenue);

    } catch (err) {
        console.error('Admin Dashboard Load Error:', err);
        
        // Retry logic: If it fails, try again up to 3 times with a delay
        if (retryCount < 3) {
            console.log(`Retrying dashboard load (${retryCount + 1}/3)...`);
            setTimeout(() => loadAdminDashboard(retryCount + 1), 1500);
            return;
        }
        
        list.innerHTML = `
            <div style="text-align:center; padding:30px; color:#ef4444;">
                <i class="fas fa-exclamation-triangle" style="font-size:2rem; margin-bottom:10px;"></i>
                <p>Failed to load courses. Please refresh or check server status.</p>
                <button onclick="loadAdminDashboard()" style="margin-top:15px; padding:8px 20px; background:#666; color:white; border:none; border-radius:5px; cursor:pointer;">Try Again</button>
            </div>
        `;
    }
}

// Update Admin Stats UI
function updateAdminStats(totalCourses, totalUsers, totalPotentialRevenue) {
    const courseEl = document.getElementById('stat-total-courses');
    const userEl = document.getElementById('stat-total-users');
    const revenueEl = document.getElementById('stat-total-revenue');
    
    if (courseEl) courseEl.textContent = totalCourses || 0;
    if (userEl) userEl.textContent = totalUsers || 0;
    if (revenueEl) {
        // Format revenue with Indian currency style
        const formattedRevenue = new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(totalPotentialRevenue || 0);
        revenueEl.textContent = formattedRevenue;
    }
}

// Delete Course
async function deleteCourse(courseId) {
    if (!confirm('Are you sure you want to delete this course? This cannot be undone.')) return;
    
    try {
        const res = await fetch(`${API_URL}/courses/delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ courseId })
        });
        const data = await res.json();
        if (data.message) {
            showToast('Course Deleted!', 'success');
            loadAdminDashboard();
        } else {
            showToast('Error: ' + data.error, 'error');
        }
    } catch (err) {
        console.error('Delete error:', err);
        showToast('Failed to delete course', 'error');
    }
}

// EDIT BASIC INFO
async function openEditInfo(courseId) {
    try {
        const res = await fetch(`${API_URL}/courses`);
        const courses = await res.json();
        const course = courses.find(c => c._id === courseId);
        if (course) {
            document.getElementById('edit-info-id').value = courseId;
            document.getElementById('edit-info-title').value = course.title;
            document.getElementById('edit-info-desc').value = course.description;
            document.getElementById('edit-info-cat').value = course.category;
            document.getElementById('edit-info-price').value = course.price;
            document.getElementById('edit-info-discount').value = (course.discountedPrice !== undefined && course.discountedPrice !== null) ? course.discountedPrice : '';
            document.getElementById('edit-info-modal').style.display = 'block';
        }
    } catch (err) {
        showToast('Error loading course info', 'error');
    }
}

document.getElementById('edit-info-form').onsubmit = async (e) => {
    e.preventDefault();
    const courseId = document.getElementById('edit-info-id').value;
    const title = document.getElementById('edit-info-title').value;
    const description = document.getElementById('edit-info-desc').value;
    const category = document.getElementById('edit-info-cat').value;
    const price = document.getElementById('edit-info-price').value;
    const discountedPrice = document.getElementById('edit-info-discount').value;

    try {
        const res = await fetch(`${API_URL}/courses/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                courseId, 
                title, 
                description, 
                category, 
                price: Number(price),
                discountedPrice: discountedPrice ? Number(discountedPrice) : null
            })
        });
        const data = await res.json();
        if (data.message) {
            showToast('Info Updated!', 'success');
            document.getElementById('edit-info-modal').style.display = 'none';
            loadAdminDashboard();
        } else {
            showToast('Error: ' + data.error, 'error');
        }
    } catch (err) {
        showToast('Failed to update info', 'error');
    }
};

// Add New Course Handler
document.getElementById('add-course-form').onsubmit = async (e) => {
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
            body: JSON.stringify({ 
                title, 
                description, 
                category, 
                price: Number(price),
                discountedPrice: discountedPrice ? Number(discountedPrice) : null
            })
        });
        const data = await res.json();
        if(data.message) {
            showToast('Course Created!', 'success');
            document.getElementById('add-course-form').reset();
            loadAdminDashboard();
        } else {
            showToast('Error: ' + data.error, 'error');
        }
    } catch(err) {
        showToast('Failed to create course', 'error');
    }
};

// Edit Content Functions
async function editCourseContent(courseId, title) {
    document.getElementById('edit-course-title').innerText = 'Edit: ' + unescape(title);
    document.getElementById('edit-course-id').value = courseId;
    document.getElementById('edit-content-modal').style.display = 'block';

    // Fetch current details to fill textareas
    try {
        // We need a way to get raw links. Since /courses returns everything, we can find it there
        // or re-fetch. Let's re-fetch specific details (simulated by finding in current list or just fetching all)
        const res = await fetch(`${API_URL}/courses`); 
        const courses = await res.json();
        const course = courses.find(c => c._id === courseId);
        
        if(course) {
            document.getElementById('edit-video-links').value = course.videoLinks ? course.videoLinks.join('\n') : '';
            document.getElementById('edit-pdf-links').value = course.pdfLinks ? course.pdfLinks.join('\n') : '';
        }
    } catch(err) {
        console.error(err);
    }
}

async function saveCourseContent() {
    const courseId = document.getElementById('edit-course-id').value;
    const videoText = document.getElementById('edit-video-links').value;
    const pdfText = document.getElementById('edit-pdf-links').value;

    const videoLinks = videoText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const pdfLinks = pdfText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    try {
        const res = await fetch(`${API_URL}/update-course-content`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ courseId, videoLinks, pdfLinks })
        });
        const data = await res.json();
        if(data.message) {
            showToast('Content Updated!', 'success');
            document.getElementById('edit-content-modal').style.display = 'none';
        } else {
            showToast('Error: ' + data.error, 'error');
        }
    } catch(err) {
        showToast('Failed to update content', 'error');
    }
}


/**
 * Authentication & UI Logic
 */
function updateAuthUI() {
    const authControls = document.getElementById('auth-controls');
    const mainNav = document.querySelector('.main-nav');
    
    if (currentUser) {
        authControls.innerHTML = `
            <span class="welcome-text" style="font-size: 0.9rem; color: var(--text-secondary);">
                <i class="fas fa-user-circle" style="color: var(--accent);"></i> 
                <strong>${truncateEmail(currentUser.email)}</strong>
            </span>
            <button onclick="logout()" class="auth-btn logout-btn">
                <i class="fas fa-sign-out-alt"></i> Logout
            </button>
        `;
        mainNav.classList.remove('hidden');
    } else {
        authControls.innerHTML = `
            <button onclick="openModal()" class="auth-btn">
                <i class="fas fa-sign-in-alt"></i> Login / Sign Up
            </button>
        `;
        mainNav.classList.add('hidden');
        showSection('home');
    }
}

// Helper to truncate long emails
function truncateEmail(email) {
    if (!email) return '';
    if (email.length > 20) {
        return email.substring(0, 15) + '...';
    }
    return email;
}

function openModal() {
    document.getElementById('auth-modal').style.display = 'flex';
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
}

function closeModal() {
    document.getElementById('auth-modal').style.display = 'none';
    document.body.style.overflow = ''; // Restore scrolling
}

function logout() {
    localStorage.removeItem('user');
    currentUser = null;
    updateAuthUI();
    location.reload();
}

function initModal() {
    const modal = document.getElementById('auth-modal');
    const closeBtn = document.getElementById('close-modal');
    const tabLogin = document.getElementById('tab-login');
    const tabSignup = document.getElementById('tab-signup');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');

    closeBtn.onclick = closeModal;
    window.onclick = (event) => {
        if (event.target == modal) closeModal();
    };

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

    // Handle Login
    loginForm.onsubmit = async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        try {
            const res = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            if (data.userId) {
                currentUser = { userId: data.userId, email };
                localStorage.setItem('user', JSON.stringify(currentUser));
                closeModal();
                updateAuthUI();
                showToast('Login Successful!', 'success');
            } else {
                showToast('Login Failed: ' + data.error, 'error');
            }
        } catch (err) {
            showToast('Login Error', 'error');
        }
    };

    // Handle Signup
    signupForm.onsubmit = async (e) => {
        e.preventDefault();
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
            if (data.userId) {
                showToast('Account Created! Please login.', 'success');
                tabLogin.click();
            } else {
                showToast('Signup Failed: ' + data.error, 'error');
            }
        } catch (err) {
            showToast('Signup Error', 'error');
        }
    };
}

// Toast notification function
function showToast(message, type = 'info') {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;
    toast.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    
    // Style toast
    toast.style.position = 'fixed';
    toast.style.bottom = '80px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.backgroundColor = type === 'success' ? '#10b981' : '#ef4444';
    toast.style.color = 'white';
    toast.style.padding = '12px 24px';
    toast.style.borderRadius = '50px';
    toast.style.boxShadow = '0 10px 25px rgba(0,0,0,0.2)';
    toast.style.zIndex = '9999';
    toast.style.display = 'flex';
    toast.style.alignItems = 'center';
    toast.style.gap = '10px';
    toast.style.fontWeight = '500';
    toast.style.animation = 'slideUp 0.3s ease';
    
    document.body.appendChild(toast);
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

/**
 * Courses Logic
 */
async function fetchCourses() {
    const container = document.getElementById('course-container');
    try {
        const response = await fetch(`${API_URL}/courses`);
        const courses = await response.json();
        container.innerHTML = '';
        if (!courses || courses.length === 0) {
            container.innerHTML = '<p class="loader">No courses available.</p>';
            return;
        }
        courses.forEach(course => {
            const isDeveloper = currentUser && currentUser.email === 'its.devloper.aditya@gmail.com';
            
            // Calculate if discount exists
            const hasDiscount = (course.discountedPrice !== undefined && course.discountedPrice !== null && course.discountedPrice !== '') && Number(course.discountedPrice) < Number(course.price);
            const displayPrice = hasDiscount ? course.discountedPrice : course.price;

            const card = document.createElement('div');
            card.className = 'course-card';
            card.innerHTML = `
                <span class="course-category">${course.category || 'General'}</span>
                <h2>${course.title}</h2>
                <p>${course.description || ''}</p>
                <div class="course-footer">
                    <div class="price-container" style="display:flex; flex-direction:column;">
                        ${hasDiscount ? 
                            `<span class="original-price" style="text-decoration: line-through; color: #888; font-size: 0.9rem;">₹${course.price}</span>` : 
                            ''
                        }
                        <span class="course-price" style="${hasDiscount ? 'color: #10b981; border: 1px solid #10b981; padding: 2px 6px; border-radius: 4px; background: #ecfdf5;' : ''} font-weight: 700; font-size: 1.2rem;">
                            ₹${displayPrice}
                        </span>
                    </div>
                    ${isDeveloper ? 
                        `<button class="buy-btn" onclick="showCourseContent('${course._id}')">Access Now</button>` : 
                        `<button class="buy-btn" onclick="buyCourse('${course._id}', '${course.title}')">Buy Now</button>`
                    }
                </div>
            `;
            container.appendChild(card);
        });
    } catch (error) {
        container.innerHTML = '<p class="loader" style="color: var(--danger);">Error loading courses.</p>';
    }
}

/**
 * Course Content Display
 */
async function showCourseContent(courseId) {
    if (!currentUser) {
        showToast('Please login first.', 'error');
        return;
    }

    try {
        const res = await fetch(`${API_URL}/course-details?courseId=${courseId}&userId=${currentUser.userId}`);
        const course = await res.json();

        if (course.error) {
            showToast(course.error, 'error');
            return;
        }

        // Create a simple modal/overlay to show links
        const contentHtml = `
            <div id="content-modal" class="modal" style="display:flex; align-items:center; justify-content:center;">
                <div class="modal-content" style="max-width: 600px; width: 90%; border-radius: 12px; padding: 25px; background: white; color: #333; position: relative;">
                    <span onclick="this.parentElement.parentElement.remove()" class="close" style="position: absolute; right: 20px; top: 15px; font-size: 24px; cursor: pointer;">&times;</span>
                    <h2 style="margin-bottom: 15px; color: #0066cc;">${course.title}</h2>
                    <hr style="border: 0; border-top: 1px solid #eee;">
                    <div style="margin-top:20px;">
                        <h3 style="margin-bottom: 10px; font-size: 1.2rem;"><i class="fas fa-video"></i> Video Lectures</h3>
                        ${course.videoLinks && course.videoLinks.length > 0 ? 
                            `<ul style="list-style:none; padding:0;">${course.videoLinks.map(link => `<li style="margin:10px 0;"><a href="${link}" target="_blank" style="color:#3b82f6; text-decoration:none; display: block; padding: 8px; background: #f0f7ff; border-radius: 6px;">▶ Watch Video</a></li>`).join('')}</ul>` : 
                            '<p style="color: #666; font-style: italic;">No videos available yet.</p>'}
                        
                        <h3 style="margin-top:20px; margin-bottom: 10px; font-size: 1.2rem;"><i class="fas fa-file-pdf"></i> Study Materials (PDF)</h3>
                        ${course.pdfLinks && course.pdfLinks.length > 0 ? 
                            `<ul style="list-style:none; padding:0;">${course.pdfLinks.map(link => `<li style="margin:10px 0;"><a href="${link}" target="_blank" style="color:#10b981; text-decoration:none; display: block; padding: 8px; background: #ecfdf5; border-radius: 6px;">📥 Download PDF</a></li>`).join('')}</ul>` : 
                            '<p style="color: #666; font-style: italic;">No PDFs available yet.</p>'}
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', contentHtml);
    } catch (err) {
        showToast('Error loading content', 'error');
    }
}

/**
 * Profile Logic
 */
async function fetchUserProfile() {
    if (!currentUser) return;
    try {
        const res = await fetch(`${API_URL}/profile?userId=${currentUser.userId}`);
        const user = await res.json();
        
        document.getElementById('display-name').textContent = user.name || 'User Name';
        document.getElementById('display-email').textContent = user.email;
        if (user.photoUrl) {
            document.getElementById('profile-img').src = user.photoUrl;
        }

        // Fill form fields
        document.getElementById('edit-name').value = user.name || '';
        document.getElementById('edit-photo-url').value = user.photoUrl || '';
    } catch (err) {
        console.error('Error fetching profile:', err);
    }
}

function toggleProfileEdit() {
    const form = document.getElementById('profile-edit-form');
    form.classList.toggle('hidden');
}

async function saveProfile() {
    const name = document.getElementById('edit-name').value;
    const photoUrl = document.getElementById('edit-photo-url').value;

    try {
        const res = await fetch(`${API_URL}/update-profile`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: currentUser.userId,
                name,
                photoUrl
            })
        });
        const data = await res.json();
        if (data.message) {
            showToast('Profile updated successfully!', 'success');
            toggleProfileEdit();
            fetchUserProfile();
        } else {
            showToast('Update failed: ' + data.error, 'error');
        }
    } catch (err) {
        showToast('Error updating profile', 'error');
    }
}

function initProfilePhotoUpload() {
    const photoInput = document.getElementById('photo-upload');
    photoInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                // For this demo, we store the base64 in the photoUrl field
                document.getElementById('edit-photo-url').value = event.target.result;
                document.getElementById('profile-img').src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    });
}

/**
 * Batches Logic
 */
async function fetchMyBatches() {
    if (!currentUser) return;
    const container = document.getElementById('batches-container');
    container.innerHTML = '<div class="loader">Loading your batches...</div>';
    
    try {
        const response = await fetch(`${API_URL}/my-batches?userId=${currentUser.userId}`);
        const batches = await response.json();
        container.innerHTML = '';
        
        if (!batches || batches.length === 0) {
            container.innerHTML = '<p class="loader">No batch enrollment found</p>';
            return;
        }

        batches.forEach(batch => {
            const card = document.createElement('div');
            card.className = 'course-card';
            card.innerHTML = `
                <span class="course-category">${batch.category || 'Science'}</span>
                <h2>${batch.title}</h2>
                <p>${batch.description || ''}</p>
                <div class="course-footer">
                    <button class="buy-btn" style="width: 100%;" onclick="showCourseContent('${batch._id}')">Access Batch</button>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (error) {
        container.innerHTML = '<p class="loader" style="color: var(--danger);">Error loading batches.</p>';
    }
}

/**
 * Contact Form Logic
 */
function initContactForm() {
    const contactForm = document.getElementById('contact-form');
    contactForm.onsubmit = async (e) => {
        e.preventDefault();
        const name = document.getElementById('contact-name').value;
        const email = document.getElementById('contact-email').value;
        const subject = document.getElementById('contact-subject').value;
        const message = document.getElementById('contact-message').value;

        try {
            const res = await fetch(`${API_URL}/contact`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, subject, message })
            });
            const data = await res.json();
            if (data.message) {
                showToast('Thank you! Your message has been sent.', 'success');
                contactForm.reset();
            } else {
                showToast('Error: ' + data.error, 'error');
            }
        } catch (err) {
            showToast('Error sending message', 'error');
        }
    };
}

/**
 * Payment Logic
 */
async function buyCourse(courseId, courseTitle) {
    if (!currentUser) {
        showToast('Please login to purchase courses.', 'error');
        openModal();
        return;
    }

    try {
        // Step 1: Create Order
        const response = await fetch(`${API_URL}/create-order`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ courseId })
        });
        const orderData = await response.json();

        if (orderData.error) {
            showToast('Order Error: ' + orderData.error, 'error');
            return;
        }

        // Step 2: Razorpay Checkout
        const options = {
            key: RAZORPAY_KEY_ID,
            amount: orderData.amount,
            currency: 'INR',
            name: 'DedicaYukti',
            description: courseTitle,
            order_id: orderData.orderId,
            handler: function (paymentResponse) {
                verifyPayment(paymentResponse, courseId);
            },
            prefill: {
                email: currentUser.email
            },
            theme: { color: '#3b82f6' },
            modal: {
                ondismiss: function() {
                    showToast('Payment cancelled', 'info');
                }
            }
        };

        const rzp = new Razorpay(options);
        rzp.open();
    } catch (err) {
        showToast('Payment Initialization Failed', 'error');
    }
}

async function verifyPayment(paymentResponse, courseId) {
    try {
        const res = await fetch(`${API_URL}/payment/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                razorpay_order_id: paymentResponse.razorpay_order_id,
                razorpay_payment_id: paymentResponse.razorpay_payment_id,
                razorpay_signature: paymentResponse.razorpay_signature,
                courseId: courseId,
                userId: currentUser.userId
            })
        });
        const result = await res.json();
        if (result.status === 'success') {
            showToast('Course Purchased Successfully!', 'success');
        } else {
            showToast('Verification Failed: ' + result.error, 'error');
        }
    } catch (err) {
        showToast('Payment Verification Error', 'error');
    }
}

// Add animation styles dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes slideUp {
        from { opacity: 0; transform: translate(-50%, 20px); }
        to { opacity: 1; transform: translate(-50%, 0); }
    }
    
    @keyframes fadeOut {
        from { opacity: 1; transform: translate(-50%, 0); }
        to { opacity: 0; transform: translate(-50%, 20px); }
    }
    
    .welcome-text {
        display: flex;
        align-items: center;
        gap: 5px;
    }
    
    .toast-notification {
        font-size: 0.95rem;
    }
    
    @media (max-width: 480px) {
        .toast-notification {
            width: 90%;
            text-align: center;
            justify-content: center;
            bottom: 70px;
        }
    }
`;
document.head.appendChild(style);