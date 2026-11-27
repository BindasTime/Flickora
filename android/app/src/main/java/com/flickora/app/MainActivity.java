package com.flickora.app;

import android.content.pm.ActivityInfo;
import android.os.Bundle;
import android.os.Build;
import android.os.Message;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.window.OnBackInvokedCallback;
import android.window.OnBackInvokedDispatcher;
import androidx.core.splashscreen.SplashScreen;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;

public class MainActivity extends BridgeActivity {
    private View customView;
    private WebChromeClient.CustomViewCallback customViewCallback;
    private FrameLayout fullscreenContainer;
    private OnBackInvokedCallback backInvokedCallback;
    private boolean immersiveRequested = false;
    private boolean playbackMode = false;

    private void applySystemBars(boolean hidden) {
        immersiveRequested = hidden;
        View decor = getWindow().getDecorView();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            android.view.WindowInsetsController controller = getWindow().getInsetsController();
            if (controller != null) {
                if (hidden) {
                    controller.hide(android.view.WindowInsets.Type.statusBars()
                            | android.view.WindowInsets.Type.navigationBars());
                    controller.setSystemBarsBehavior(
                            android.view.WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
                } else {
                    controller.show(android.view.WindowInsets.Type.statusBars()
                            | android.view.WindowInsets.Type.navigationBars());
                }
            }
        } else {
            decor.setSystemUiVisibility(hidden
                    ? View.SYSTEM_UI_FLAG_FULLSCREEN
                            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                            | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                            | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                    : 0);
        }
    }

    public void setImmersiveModeEnabled(boolean enabled) {
        applySystemBars(enabled);
    }

    /**
     * Portrait everywhere except active playback. Re-asserted on resume and
     * after a fullscreen video view closes, so a stale landscape lock cannot
     * outlive the player.
     */
    private void applyOrientation() {
        setRequestedOrientation(playbackMode
                // Playback follows the sensor so the viewer can rotate to
                // landscape, but the rest of the app stays portrait.
                ? ActivityInfo.SCREEN_ORIENTATION_SENSOR
                : ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
    }

    public void setPlaybackModeEnabled(boolean enabled) {
        playbackMode = enabled;
        applyOrientation();
    }

    /**
     * Detaches the HTML5 fullscreen overlay and restores normal chrome.
     * Both the WebView-driven exit and the back-button path must go through
     * here, otherwise the activity stays rotated to landscape with a stale
     * overlay attached.
     */
    private void hideCustomView() {
        if (customView == null) return;

        ViewGroup decor = (ViewGroup) getWindow().getDecorView();
        if (fullscreenContainer != null) {
            decor.removeView(fullscreenContainer);
            fullscreenContainer = null;
        }

        customView = null;
        if (customViewCallback != null) {
            customViewCallback.onCustomViewHidden();
            customViewCallback = null;
        }

        applySystemBars(immersiveRequested);
        applyOrientation();
    }

    private void dispatchAppBack() {
        // Leaving an HTML5 fullscreen video used to swallow the press entirely.
        // Hide the custom view and still report the press to the app.
        hideCustomView();
        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView != null) {
            webView.evaluateJavascript("window.dispatchEvent(new Event('hf:android-back'))", null);
        }
    }

    @Override
    public void onStart() {
        super.onStart();
        if (Build.VERSION.SDK_INT >= 33) {
            backInvokedCallback = this::dispatchAppBack;
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                    OnBackInvokedDispatcher.PRIORITY_DEFAULT, backInvokedCallback);
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        if (!playbackMode) applyOrientation();
    }

    @Override
    public void onStop() {
        if (Build.VERSION.SDK_INT >= 33 && backInvokedCallback != null) {
            getOnBackInvokedDispatcher().unregisterOnBackInvokedCallback(backInvokedCallback);
            backInvokedCallback = null;
        }
        super.onStop();
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        if (Build.VERSION.SDK_INT < 33) dispatchAppBack();
        else super.onBackPressed();
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Keep the Android 12+ splash on screen until the WebView is ready,
        // then hand over to the animated in-app intro.
        SplashScreen.installSplashScreen(this);
        // Capacitor builds its plugin registry inside super.onCreate(), so the
        // plugin has to be registered first. Registering afterwards silently
        // leaves JavaScript with "ImmersiveMode is not implemented on android".
        registerPlugin(ImmersiveModePlugin.class);
        registerPlugin(NvidiaAiPlugin.class);
        super.onCreate(savedInstanceState);

        // Keep screen on during video playback & dark navigation bar
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        // Keep normal browsing in portrait; Player switches this to landscape
        // through ImmersiveModePlugin while playback is active.
        applyOrientation();

        WebView webView = getBridge().getWebView();
        if (webView != null) {
            WebSettings settings = webView.getSettings();
            settings.setMediaPlaybackRequiresUserGesture(false);
            settings.setJavaScriptCanOpenWindowsAutomatically(true);
            settings.setSupportMultipleWindows(true);
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);
            settings.setAllowFileAccess(true);
            settings.setAllowContentAccess(true);

            // Handle popup probes and fullscreen video playback seamlessly
            webView.setWebChromeClient(new BridgeWebChromeClient(getBridge()) {
                @Override
                public boolean onCreateWindow(WebView view, boolean isDialog, boolean isUserGesture, Message resultMsg) {
                    WebView tempWebView = new WebView(view.getContext());
                    tempWebView.setWebViewClient(new WebViewClient() {
                        @Override
                        public void onPageFinished(WebView view, String url) {
                            tempWebView.destroy();
                        }
                    });
                    WebView.WebViewTransport transport = (WebView.WebViewTransport) resultMsg.obj;
                    transport.setWebView(tempWebView);
                    resultMsg.sendToTarget();
                    return true;
                }

                @Override
                public void onShowCustomView(View view, CustomViewCallback callback) {
                    if (customView != null) {
                        callback.onCustomViewHidden();
                        return;
                    }
                    customView = view;
                    customViewCallback = callback;

                    // HTML5 video players request fullscreen through WebChromeClient.
                    // Keep the native activity in landscape and hide system bars.
                    setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE);

                    fullscreenContainer = new FrameLayout(MainActivity.this);
                    fullscreenContainer.setBackgroundColor(0xFF000000);
                    fullscreenContainer.addView(view, new FrameLayout.LayoutParams(
                            ViewGroup.LayoutParams.MATCH_PARENT,
                            ViewGroup.LayoutParams.MATCH_PARENT));

                    ViewGroup decor = (ViewGroup) getWindow().getDecorView();
                    decor.addView(fullscreenContainer, new ViewGroup.LayoutParams(
                            ViewGroup.LayoutParams.MATCH_PARENT,
                            ViewGroup.LayoutParams.MATCH_PARENT));

                    applySystemBars(true);
                }

                @Override
                public void onHideCustomView() {
                    hideCustomView();
                }
            });
        }
    }

}
