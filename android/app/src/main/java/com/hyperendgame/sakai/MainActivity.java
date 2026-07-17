package com.hyperendgame.sakai;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(DashboardBridge.class);
        super.onCreate(savedInstanceState);
    }
}
