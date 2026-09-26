package com.hyperendgame.sakai;

import android.os.Bundle;
import android.view.View;
import androidx.activity.OnBackPressedCallback;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(DashboardBridge.class);
        // keep the last native crash so the web layer can show it on next launch (DashboardBridge.lastCrash)
        Thread.UncaughtExceptionHandler prev = Thread.getDefaultUncaughtExceptionHandler();
        Thread.setDefaultUncaughtExceptionHandler((t, e) -> {
            getSharedPreferences("sakai", MODE_PRIVATE).edit()
                .putString("last_crash", android.util.Log.getStackTraceString(e)).commit();
            if (prev != null) prev.uncaughtException(t, e);
        });
        super.onCreate(savedInstanceState);
        // no Android stretch/glow when scrolling past the ends
        getBridge().getWebView().setOverScrollMode(View.OVER_SCROLL_NEVER);
        // Back steps through the app (src/back.ts); at the root it backgrounds instead of closing
        // If the WebView renderer dies (e.g. memory pressure), rebuild the screen instead of crashing the app
        getBridge().addWebViewListener(new WebViewListener() {
            @Override
            public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                recreate();
                return true;
            }
        });
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                getBridge().getWebView().evaluateJavascript(
                    "window.sakaiBack ? window.sakaiBack() : false",
                    handled -> { if (!"true".equals(handled)) moveTaskToBack(true); });
            }
        });
    }
}
