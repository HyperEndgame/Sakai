package com.hyperendgame.sakai;

import android.os.Bundle;
import android.view.View;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(DashboardBridge.class);
        super.onCreate(savedInstanceState);
        // no Android stretch/glow when scrolling past the ends
        getBridge().getWebView().setOverScrollMode(View.OVER_SCROLL_NEVER);
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
}
