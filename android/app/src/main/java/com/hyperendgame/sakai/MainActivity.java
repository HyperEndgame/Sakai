package com.hyperendgame.sakai;

import android.os.Bundle;
import android.view.View;
import androidx.activity.OnBackPressedCallback;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebView;
import android.graphics.Color;
import android.os.Build;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;

public class MainActivity extends BridgeActivity {
    private String insetsJs = "";
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
        edgeToEdge();
        // If the WebView renderer dies (e.g. memory pressure), rebuild the screen instead of crashing the app
        getBridge().addWebViewListener(new WebViewListener() {
            @Override
            public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                recreate();
                return true;
            }

            @Override
            public void onPageLoaded(WebView view) {
                view.evaluateJavascript(insetsJs, null);
            }
        });
        // Back steps through the app (src/back.ts); at the root it backgrounds instead of closing
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                getBridge().getWebView().evaluateJavascript(
                    "window.sakaiBack ? window.sakaiBack() : false",
                    handled -> { if (!"true".equals(handled)) moveTaskToBack(true); });
            }
        });
    }

    // The page draws under transparent system bars so theme fades cover them too. Bar heights go to CSS
    // as --sat/--sab (dp == CSS px); the keyboard is handled by padding the WebView like adjustResize.
    private void edgeToEdge() {
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        getWindow().setStatusBarColor(Color.TRANSPARENT);
        getWindow().setNavigationBarColor(Color.TRANSPARENT);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) getWindow().setNavigationBarContrastEnforced(false);
        WebView web = getBridge().getWebView();
        float dp = getResources().getDisplayMetrics().density;
        ViewCompat.setOnApplyWindowInsetsListener(web, (v, insets) -> {
            Insets bars = insets.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
            int ime = insets.getInsets(WindowInsetsCompat.Type.ime()).bottom;
            ((View) v.getParent()).setPadding(0, 0, 0, ime); // WebView ignores its own padding
            int bottom = ime > 0 ? 0 : Math.round(bars.bottom / dp);
            insetsJs = "document.documentElement.style.setProperty('--sat','" + Math.round(bars.top / dp) + "px');"
                + "document.documentElement.style.setProperty('--sab','" + bottom + "px');";
            web.evaluateJavascript(insetsJs, null);
            return WindowInsetsCompat.CONSUMED;
        });
    }
}
