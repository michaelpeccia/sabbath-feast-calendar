package com.kingdomlifeministry.sabbathfeast;

import android.content.Context;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

// Receives the upcoming Sabbath and feast times from the app (as JSON),
// saves them on the phone, and redraws any widgets on the home screen.
@CapacitorPlugin(name = "WidgetBridge")
public class WidgetBridgePlugin extends Plugin {

    @PluginMethod
    public void setData(PluginCall call) {
        String json = call.getString("json");
        if (json == null) {
            call.reject("json is required");
            return;
        }
        Context context = getContext();
        context.getSharedPreferences(SabbathWidget.PREFS, Context.MODE_PRIVATE)
            .edit()
            .putString(SabbathWidget.KEY, json)
            .apply();
        SabbathWidget.updateAll(context);
        call.resolve();
    }
}
