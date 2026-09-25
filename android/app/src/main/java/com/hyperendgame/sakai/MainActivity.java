package com.hyperendgame.sakai;

import android.os.Bundle;
import android.view.View;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(DashboardBridge.class);
        super.onCreate(savedInstanceState);
        // no Android stretch/glow when scrolling past the ends
        getBridge().getWebView().setOverScrollMode(View.OVER_SCROLL_NEVER);
    }
}
