package com.kingdomlifeministry.sabbathfeast;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Lets the web app send upcoming Sabbath and feast times to the home-screen widget.
        registerPlugin(WidgetBridgePlugin.class);
        // The free trial and the one-time unlock through Google Play.
        registerPlugin(PlayBillingPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
