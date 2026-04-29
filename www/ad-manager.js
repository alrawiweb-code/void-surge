/**
 * AdManager — Void Surge AdMob Integration
 * Uses @capacitor-community/admob via Capacitor global
 * Handles interstitial (every 3rd death) and rewarded ads (2× gems, checkpoint retry)
 */
const AdManager = {
    _isReady: false,
    _deathCount: 0,
    _interstitialFrequency: 3,
    _rewardEarned: false,
    _pendingRewardCallback: null,

    // Real Ad Unit IDs
    _interstitialAdId: 'ca-app-pub-7978183450040245/7758705169',
    _rewardedAdId: 'ca-app-pub-7978183450040245/4581357968',

    // Callbacks for interstitial flow
    _onInterstitialDone: null,

    async init() {
        // The plugin registers itself on Capacitor.Plugins when loaded natively
        if (!window.Capacitor || !window.Capacitor.Plugins || !window.Capacitor.Plugins.AdMob) {
            console.warn('[AdManager] AdMob plugin not available (not running in Capacitor).');
            return;
        }

        try {
            const AdMob = window.Capacitor.Plugins.AdMob;
            await AdMob.initialize({
                requestTrackingAuthorization: true,
                testingDevices: [],
                initializeForTesting: false,
            });
            this._isReady = true;
            console.log('[AdManager] AdMob SDK initialized successfully.');

            this._setupListeners();
        } catch (err) {
            console.error('[AdManager] Failed to initialize AdMob:', err);
        }
    },

    _setupListeners() {
        const AdMob = window.Capacitor.Plugins.AdMob;

        // --- Interstitial listeners ---
        AdMob.addListener('onInterstitialAdDismissed', () => {
            console.log('[AdManager] Interstitial dismissed.');
            if (this._onInterstitialDone) {
                this._onInterstitialDone();
                this._onInterstitialDone = null;
            }
        });

        AdMob.addListener('onInterstitialAdFailedToLoad', (info) => {
            console.warn('[AdManager] Interstitial failed to load:', info);
            // If the ad fails, immediately run the callback so the game over screen still shows
            if (this._onInterstitialDone) {
                this._onInterstitialDone();
                this._onInterstitialDone = null;
            }
        });

        AdMob.addListener('onInterstitialAdFailedToShow', (info) => {
            console.warn('[AdManager] Interstitial failed to show:', info);
            if (this._onInterstitialDone) {
                this._onInterstitialDone();
                this._onInterstitialDone = null;
            }
        });

        // --- Rewarded listeners ---
        AdMob.addListener('onRewardedVideoAdReward', (rewardItem) => {
            console.log('[AdManager] Reward earned:', JSON.stringify(rewardItem));
            this._rewardEarned = true;
            // DO NOT call callback here. Wait until the ad is fully dismissed
            // to prevent the game from resuming while the ad is still on screen.
        });

        AdMob.addListener('onRewardedVideoAdDismissed', () => {
            console.log('[AdManager] Rewarded ad dismissed.');
            if (!this._rewardEarned) {
                console.log('[AdManager] User closed rewarded ad early — no reward.');
            }
            
            // ALWAYS fire the callback when dismissed so UI can unfreeze, passing success status
            if (this._pendingRewardCallback) {
                this._pendingRewardCallback(this._rewardEarned);
                this._pendingRewardCallback = null;
            }
            this._rewardEarned = false;
        });

        AdMob.addListener('onRewardedVideoAdFailedToLoad', (info) => {
            console.warn('[AdManager] Rewarded ad failed to load:', info);
            if (this._pendingRewardCallback) {
                this._pendingRewardCallback(false);
                this._pendingRewardCallback = null;
            }
            this._rewardEarned = false;
        });
    },

    /**
     * Called on every death. Shows an interstitial every Nth death.
     * @param {Function} onDone — called after the ad closes (or immediately if no ad)
     */
    showInterstitialIfDue(onDone) {
        this._deathCount++;
        console.log(`[AdManager] Death #${this._deathCount}`);

        if (!this._isReady || this._deathCount % this._interstitialFrequency !== 0) {
            // No ad this time — proceed immediately
            if (onDone) onDone();
            return;
        }

        const AdMob = window.Capacitor.Plugins.AdMob;
        this._onInterstitialDone = onDone;

        (async () => {
            try {
                console.log('[AdManager] Preparing interstitial ad...');
                await AdMob.prepareInterstitial({
                    adId: this._interstitialAdId,
                });
                console.log('[AdManager] Showing interstitial ad...');
                await AdMob.showInterstitial();
            } catch (err) {
                console.error('[AdManager] Interstitial error:', err);
                // On failure, still show the game over screen
                if (this._onInterstitialDone) {
                    this._onInterstitialDone();
                    this._onInterstitialDone = null;
                }
            }
        })();
    },

    /**
     * Pre-load a rewarded ad so it's ready when the player dies.
     */
    async prepareRewarded() {
        if (!this._isReady) return;

        try {
            const AdMob = window.Capacitor.Plugins.AdMob;
            await AdMob.prepareRewardVideoAd({
                adId: this._rewardedAdId,
            });
            console.log('[AdManager] Rewarded ad pre-loaded.');
        } catch (err) {
            console.warn('[AdManager] Failed to pre-load rewarded ad:', err);
        }
    },

    /**
     * Show a rewarded ad. Calls onReward() if the user earns the reward.
     * @param {Function} onReward — callback on reward
     */
    async showRewarded(onReward) {
        if (!this._isReady) {
            console.warn('[AdManager] SDK not ready — skipping rewarded ad.');
            return;
        }

        const AdMob = window.Capacitor.Plugins.AdMob;
        this._pendingRewardCallback = onReward;
        this._rewardEarned = false;

        try {
            console.log('[AdManager] Preparing rewarded ad...');
            await AdMob.prepareRewardVideoAd({
                adId: this._rewardedAdId,
            });
            console.log('[AdManager] Showing rewarded ad...');
            await AdMob.showRewardVideoAd();
        } catch (err) {
            console.error('[AdManager] Rewarded ad error:', err);
            if (this._pendingRewardCallback) {
                this._pendingRewardCallback(false);
                this._pendingRewardCallback = null;
            }
            this._rewardEarned = false;
        }
    },
};

// Auto-init when the script loads in Capacitor
document.addEventListener('DOMContentLoaded', () => {
    AdManager.init();
});
