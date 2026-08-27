// ============================================
// TAFUTA MPENZI - Core Application (app.js)
// Imeunganishwa na Firebase SDK
// ============================================

// ============================================
// 1. FIREBASE IMPORTS (Zilizounganishwa)
// ============================================
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { 
    getAuth, 
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail,
    updateProfile,
    updateEmail,
    updatePassword,
    sendEmailVerification,
    reload
} from "firebase/auth";
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    collection,
    query,
    where,
    getDocs,
    onSnapshot,
    addDoc,
    orderBy,
    serverTimestamp,
    arrayUnion,
    arrayRemove,
    increment,
    limit,
    startAfter,
    endBefore,
    limitToLast
} from "firebase/firestore";
import {
    getStorage,
    ref,
    uploadBytes,
    uploadBytesResumable,
    getDownloadURL,
    deleteObject,
    listAll,
    getMetadata,
    updateMetadata
} from "firebase/storage";

// ============================================
// 2. FIREBASE CONFIGURATION
// ============================================
const firebaseConfig = {
    apiKey: "AIzaSyCmwASW4XXQ3O0AvsCM_r1WLlrUmGjYVxI",
    authDomain: "dvary-9a7d0.firebaseapp.com",
    projectId: "dvary-9a7d0",
    storageBucket: "dvary-9a7d0.firebasestorage.app",
    messagingSenderId: "107370806066",
    appId: "1:107370806066:web:4c2ce1e6f7b6c32909f52b",
    measurementId: "G-07361LFJEP"
};

// ============================================
// 3. INITIALIZE FIREBASE
// ============================================
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// ============================================
// 4. GLOBAL FIREBASE EXPOSURE
// ============================================
window.firebase = {
    app: app,
    analytics: analytics,
    auth: auth,
    db: db,
    storage: storage,
    // Auth functions
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail,
    updateProfile,
    updateEmail,
    updatePassword,
    sendEmailVerification,
    onAuthStateChanged,
    reload,
    // Firestore functions
    doc,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    collection,
    query,
    where,
    getDocs,
    onSnapshot,
    addDoc,
    orderBy,
    serverTimestamp,
    arrayUnion,
    arrayRemove,
    increment,
    limit,
    startAfter,
    endBefore,
    limitToLast,
    // Storage functions
    ref,
    uploadBytes,
    uploadBytesResumable,
    getDownloadURL,
    deleteObject,
    listAll,
    getMetadata,
    updateMetadata
};

// ============================================
// 5. APP STATE
// ============================================
const AppState = {
    currentUser: null,
    currentTheme: localStorage.getItem('tafuta-theme') || 'light',
    currentLanguage: localStorage.getItem('tafuta-language') || 'sw',
    isOnline: navigator.onLine,
    notifications: [],
    unreadCount: 0,
    conversations: [],
    contacts: [],
    initialized: false
};

window.appState = AppState;

// ============================================
// 6. THEME MANAGEMENT
// ============================================
const ThemeManager = {
    init() {
        const theme = AppState.currentTheme;
        this.applyTheme(theme);
    },
    
    applyTheme(theme) {
        if (theme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
            document.documentElement.style.colorScheme = 'dark';
        } else {
            document.documentElement.removeAttribute('data-theme');
            document.documentElement.style.colorScheme = 'light';
        }
        localStorage.setItem('tafuta-theme', theme);
        AppState.currentTheme = theme;
        
        // Dispatch event for other modules
        window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme } }));
    },
    
    toggleTheme() {
        const newTheme = AppState.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme(newTheme);
        return newTheme;
    },
    
    getCurrentTheme() {
        return AppState.currentTheme;
    },
    
    isDark() {
        return AppState.currentTheme === 'dark';
    }
};

window.themeManager = ThemeManager;

// ============================================
// 7. LANGUAGE MANAGEMENT
// ============================================
const LanguageManager = {
    translations: {},
    currentLanguage: AppState.currentLanguage,
    
    async init() {
        await this.loadTranslations(AppState.currentLanguage);
        this.applyLanguage(AppState.currentLanguage);
    },
    
    async loadTranslations(lang) {
        try {
            const response = await fetch(`languages/${lang}.json`);
            if (!response.ok) throw new Error('Translation not found');
            this.translations = await response.json();
            return this.translations;
        } catch (error) {
            console.error('Failed to load translations:', error);
            // Fallback to English
            if (lang !== 'en') {
                return this.loadTranslations('en');
            }
            return {};
        }
    },
    
    applyLanguage(lang) {
        localStorage.setItem('tafuta-language', lang);
        this.currentLanguage = lang;
        AppState.currentLanguage = lang;
        document.documentElement.lang = lang;
        
        // Apply translations to all elements with data-i18n
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.getTranslation(key);
            if (translation) {
                element.textContent = translation;
            }
        });
        
        // Dispatch event
        window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
    },
    
    getTranslation(key) {
        return key.split('.').reduce((obj, k) => obj?.[k], this.translations) || key;
    },
    
    t(key) {
        return this.getTranslation(key);
    },
    
    async changeLanguage(lang) {
        await this.loadTranslations(lang);
        this.applyLanguage(lang);
        return lang;
    },
    
    getCurrentLanguage() {
        return this.currentLanguage;
    }
};

window.languageManager = LanguageManager;

// ============================================
// 8. AUTHENTICATION MANAGEMENT
// ============================================
const AuthManager = {
    currentUser: null,
    userData: null,
    
    init() {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                this.currentUser = user;
                await this.loadUserData(user.uid);
                AppState.currentUser = user;
                
                // Dispatch event
                window.dispatchEvent(new CustomEvent('userLoggedIn', { 
                    detail: { user, userData: this.userData } 
                }));
            } else {
                this.currentUser = null;
                this.userData = null;
                AppState.currentUser = null;
                
                // Dispatch event
                window.dispatchEvent(new CustomEvent('userLoggedOut'));
            }
        });
    },
    
    async loadUserData(uid) {
        try {
            const userDoc = await getDoc(doc(db, 'users', uid));
            if (userDoc.exists()) {
                this.userData = userDoc.data();
                return this.userData;
            }
            return null;
        } catch (error) {
            console.error('Failed to load user data:', error);
            return null;
        }
    },
    
    async login(email, password) {
        try {
            const result = await signInWithEmailAndPassword(auth, email, password);
            return { success: true, user: result.user };
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: error.message };
        }
    },
    
    async signup(email, password, userData) {
        try {
            const result = await createUserWithEmailAndPassword(auth, email, password);
            
            // Save additional user data
            await setDoc(doc(db, 'users', result.user.uid), {
                ...userData,
                uid: result.user.uid,
                email: email,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                onlineStatus: true,
                lastSeen: new Date().toISOString(),
                privacySettings: {
                    profileVisibility: 'public',
                    lastSeenVisibility: 'everyone',
                    onlineStatusVisibility: 'everyone',
                    readReceipts: true,
                    contactPermission: 'everyone'
                },
                notificationSettings: {
                    messages: true,
                    calls: true,
                    status: true,
                    sound: true,
                    vibration: true
                },
                isVerified: false,
                isBlocked: false
            });
            
            // Update profile
            if (userData.fullName) {
                await updateProfile(result.user, {
                    displayName: userData.fullName
                });
            }
            
            return { success: true, user: result.user };
        } catch (error) {
            console.error('Signup error:', error);
            return { success: false, error: error.message };
        }
    },
    
    async logout() {
        try {
            // Update online status
            if (this.currentUser) {
                await updateDoc(doc(db, 'users', this.currentUser.uid), {
                    onlineStatus: false,
                    lastSeen: new Date().toISOString()
                });
            }
            
            await signOut(auth);
            return { success: true };
        } catch (error) {
            console.error('Logout error:', error);
            return { success: false, error: error.message };
        }
    },
    
    async resetPassword(email) {
        try {
            await sendPasswordResetEmail(auth, email);
            return { success: true };
        } catch (error) {
            console.error('Reset password error:', error);
            return { success: false, error: error.message };
        }
    },
    
    getCurrentUser() {
        return this.currentUser;
    },
    
    getUserData() {
        return this.userData;
    },
    
    isAuthenticated() {
        return !!this.currentUser;
    }
};

window.authManager = AuthManager;

// ============================================
// 9. STORAGE HELPERS
// ============================================
const StorageHelper = {
    async uploadProfilePhoto(userId, file) {
        try {
            const storageRef = ref(storage, `profile-photos/${userId}`);
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);
            
            // Update user profile
            await updateDoc(doc(db, 'users', userId), {
                profilePhoto: downloadURL
            });
            
            // Update Firebase Auth profile
            if (auth.currentUser) {
                await updateProfile(auth.currentUser, {
                    photoURL: downloadURL
                });
            }
            
            return { success: true, url: downloadURL };
        } catch (error) {
            console.error('Upload profile photo error:', error);
            return { success: false, error: error.message };
        }
    },
    
    async uploadChatImage(conversationId, file) {
        try {
            const fileName = `${Date.now()}_${file.name}`;
            const storageRef = ref(storage, `chat-images/${conversationId}/${fileName}`);
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);
            return { success: true, url: downloadURL, path: snapshot.ref.fullPath };
        } catch (error) {
            console.error('Upload chat image error:', error);
            return { success: false, error: error.message };
        }
    },
    
    async uploadChatVideo(conversationId, file) {
        try {
            const fileName = `${Date.now()}_${file.name}`;
            const storageRef = ref(storage, `chat-videos/${conversationId}/${fileName}`);
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);
            return { success: true, url: downloadURL, path: snapshot.ref.fullPath };
        } catch (error) {
            console.error('Upload chat video error:', error);
            return { success: false, error: error.message };
        }
    },
    
    async uploadChatAudio(conversationId, file) {
        try {
            const fileName = `${Date.now()}_${file.name}`;
            const storageRef = ref(storage, `chat-audio/${conversationId}/${fileName}`);
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);
            return { success: true, url: downloadURL, path: snapshot.ref.fullPath };
        } catch (error) {
            console.error('Upload chat audio error:', error);
            return { success: false, error: error.message };
        }
    },
    
    async uploadChatDocument(conversationId, file) {
        try {
            const fileName = `${Date.now()}_${file.name}`;
            const storageRef = ref(storage, `chat-documents/${conversationId}/${fileName}`);
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);
            return { success: true, url: downloadURL, path: snapshot.ref.fullPath };
        } catch (error) {
            console.error('Upload chat document error:', error);
            return { success: false, error: error.message };
        }
    },
    
    async uploadStatus(userId, file, type) {
        try {
            const statusId = `${Date.now()}`;
            const storageRef = ref(storage, `status/${userId}/${statusId}`);
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);
            
            // Save status to Firestore
            await setDoc(doc(db, 'status', statusId), {
                userId: userId,
                type: type,
                content: downloadURL,
                createdAt: serverTimestamp(),
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                views: []
            });
            
            return { success: true, url: downloadURL, id: statusId };
        } catch (error) {
            console.error('Upload status error:', error);
            return { success: false, error: error.message };
        }
    },
    
    async deleteFile(path) {
        try {
            const storageRef = ref(storage, path);
            await deleteObject(storageRef);
            return { success: true };
        } catch (error) {
            console.error('Delete file error:', error);
            return { success: false, error: error.message };
        }
    }
};

window.storageHelper = StorageHelper;

// ============================================
// 10. NOTIFICATION MANAGER
// ============================================
const NotificationManager = {
    permission: false,
    
    async init() {
        if ('Notification' in window) {
            if (Notification.permission === 'granted') {
                this.permission = true;
            } else if (Notification.permission === 'default') {
                await this.requestPermission();
            }
        }
    },
    
    async requestPermission() {
        try {
            const permission = await Notification.requestPermission();
            this.permission = permission === 'granted';
            return this.permission;
        } catch (error) {
            console.error('Notification permission error:', error);
            return false;
        }
    },
    
    sendNotification(title, body, icon = null) {
        if (!this.permission) return;
        
        try {
            const notification = new Notification(title, {
                body: body,
                icon: icon || '/assets/icons/icon-192x192.png',
                badge: '/assets/icons/badge-72x72.png',
                vibrate: [200, 100, 200]
            });
            
            notification.onclick = () => {
                window.focus();
                notification.close();
            };
            
            return notification;
        } catch (error) {
            console.error('Send notification error:', error);
            return null;
        }
    },
    
    async loadNotifications(userId) {
        try {
            const q = query(
                collection(db, 'notifications', userId, 'items'),
                orderBy('createdAt', 'desc'),
                limit(50)
            );
            const snapshot = await getDocs(q);
            const notifications = [];
            snapshot.forEach(doc => {
                notifications.push({ id: doc.id, ...doc.data() });
            });
            return notifications;
        } catch (error) {
            console.error('Load notifications error:', error);
            return [];
        }
    },
    
    async markAsRead(userId, notificationId) {
        try {
            await updateDoc(doc(db, 'notifications', userId, 'items', notificationId), {
                read: true,
                readAt: new Date().toISOString()
            });
            return { success: true };
        } catch (error) {
            console.error('Mark as read error:', error);
            return { success: false, error: error.message };
        }
    },
    
    async markAllAsRead(userId) {
        try {
            const q = query(
                collection(db, 'notifications', userId, 'items'),
                where('read', '==', false)
            );
            const snapshot = await getDocs(q);
            
            const batch = [];
            snapshot.forEach(doc => {
                batch.push(updateDoc(doc.ref, {
                    read: true,
                    readAt: new Date().toISOString()
                }));
            });
            
            await Promise.all(batch);
            return { success: true };
        } catch (error) {
            console.error('Mark all as read error:', error);
            return { success: false, error: error.message };
        }
    }
};

window.notificationManager = NotificationManager;

// ============================================
// 11. ONLINE/OFFLINE MANAGEMENT
// ============================================
const OnlineManager = {
    isOnline: navigator.onLine,
    
    init() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            AppState.isOnline = true;
            window.dispatchEvent(new CustomEvent('onlineStatusChanged', { detail: { online: true } }));
            console.log('🟢 App is online');
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            AppState.isOnline = false;
            window.dispatchEvent(new CustomEvent('onlineStatusChanged', { detail: { online: false } }));
            console.log('🔴 App is offline');
        });
    },
    
    getStatus() {
        return this.isOnline;
    }
};

window.onlineManager = OnlineManager;

// ============================================
// 12. INITIALIZE APP
// ============================================
async function initApp() {
    console.log('🚀 Initializing TAFUTA MPENZI App...');
    
    // Initialize theme
    ThemeManager.init();
    console.log('✅ Theme initialized:', ThemeManager.getCurrentTheme());
    
    // Initialize language
    await LanguageManager.init();
    console.log('✅ Language initialized:', LanguageManager.getCurrentLanguage());
    
    // Initialize auth
    AuthManager.init();
    console.log('✅ Auth initialized');
    
    // Initialize notifications
    await NotificationManager.init();
    console.log('✅ Notifications initialized');
    
    // Initialize online manager
    OnlineManager.init();
    console.log('✅ Online manager initialized');
    
    // Set initialized flag
    AppState.initialized = true;
    
    // Dispatch event
    window.dispatchEvent(new CustomEvent('appInitialized'));
    
    console.log('✅ TAFUTA MPENZI App initialized successfully!');
    console.log('📱 App State:', AppState);
    console.log('🔥 Firebase:', {
        app: app.name,
        auth: auth.app.name,
        db: db.app.name,
        storage: storage.app.name,
        analytics: analytics.app.name
    });
}

// ============================================
// 13. EXPOSE INIT FUNCTION
// ============================================
window.initApp = initApp;

// ============================================
// 14. AUTO-INIT (if not in a specific page)
// ============================================
// Check if we should auto-initialize
if (!window.location.pathname.includes('login.html') && 
    !window.location.pathname.includes('signup.html')) {
    // Auto-initialize for pages other than login/signup
    document.addEventListener('DOMContentLoaded', initApp);
}

// ============================================
// 15. EXPORT MODULES
// ============================================
export {
    app,
    analytics,
    auth,
    db,
    storage,
    AppState,
    ThemeManager,
    LanguageManager,
    AuthManager,
    StorageHelper,
    NotificationManager,
    OnlineManager,
    initApp
};

console.log('📦 app.js loaded successfully!');
