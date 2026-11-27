package com.flickora.app;

import android.graphics.Rect;
import android.os.Build;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.Window;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "ImmersiveMode")
public class ImmersiveModePlugin extends Plugin {
    @PluginMethod
    public void setPlaybackMode(PluginCall call) {
        boolean enabled = call.getBoolean("enabled", false);
        getActivity().runOnUiThread(() -> {
            if (getActivity() instanceof MainActivity) {
                ((MainActivity) getActivity()).setPlaybackModeEnabled(enabled);
            }
            call.resolve();
        });
    }

    /**
     * Reports how much of the WebView is hidden behind opaque system bars, in
     * CSS pixels. On older layouts this is zero because the WebView already
     * sits below the status bar. On Android 15+ edge-to-edge builds it returns
     * the real overlap so the web layer can pad the top bar instead of drawing
     * its icons under the notification bar.
     */
    @PluginMethod
    public void getSafeInsets(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            JSObject result = new JSObject();
            try {
                View decor = getActivity().getWindow().getDecorView();
                Rect frame = new Rect();
                decor.getWindowVisibleDisplayFrame(frame);
                // Measure the WebView itself: on some devices the decor is
                // edge-to-edge while Capacitor already insets the WebView.
                View target = getBridge() != null && getBridge().getWebView() != null
                        ? getBridge().getWebView()
                        : decor;
                int[] location = new int[2];
                target.getLocationOnScreen(location);
                float density = getActivity().getResources().getDisplayMetrics().density;
                double top = Math.max(0, frame.top - location[1]) / density;
                double bottom = Math.max(0, location[1] + target.getHeight() - frame.bottom) / density;
                result.put("top", top);
                result.put("bottom", bottom);
            } catch (Exception ignored) {
                result.put("top", 0);
                result.put("bottom", 0);
            }
            call.resolve(result);
        });
    }

    @PluginMethod
    public void setEnabled(PluginCall call) {
        boolean enabled = call.getBoolean("enabled", false);
        getActivity().runOnUiThread(() -> {
            if (getActivity() instanceof MainActivity) {
                ((MainActivity) getActivity()).setImmersiveModeEnabled(enabled);
            }
            Window window = getActivity().getWindow();
            View decor = window.getDecorView();
            if (enabled) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    WindowInsetsController controller = window.getInsetsController();
                    if (controller != null) {
                        controller.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
                        controller.setSystemBarsBehavior(
                                WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
                    }
                } else {
                    decor.setSystemUiVisibility(
                            View.SYSTEM_UI_FLAG_FULLSCREEN
                                    | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                                    | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                                    | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                                    | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                                    | View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
                }
            } else {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    WindowInsetsController controller = window.getInsetsController();
                    if (controller != null) {
                        controller.show(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
                    }
                } else {
                    decor.setSystemUiVisibility(0);
                }
            }
            call.resolve();
        });
    }
}