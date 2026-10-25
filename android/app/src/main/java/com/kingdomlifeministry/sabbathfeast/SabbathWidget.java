package com.kingdomlifeministry.sabbathfeast;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

// Home-screen widget: the current or next Sabbath and the next appointed time.
// The app sends it the upcoming times; Android redraws it about every 30 minutes.
public class SabbathWidget extends AppWidgetProvider {

    static final String PREFS = "sabbath_widget";
    static final String KEY = "data";

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] widgetIds) {
        for (int id : widgetIds) {
            draw(context, manager, id);
        }
    }

    static void updateAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, SabbathWidget.class));
        for (int id : ids) {
            draw(context, manager, id);
        }
    }

    static void draw(Context context, AppWidgetManager manager, int widgetId) {
        String label = "Sabbath & Feast Days";
        String when = "Open the app to set your location";
        String countdown = "";
        String feast = "";

        try {
            String json = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, null);
            if (json != null) {
                JSONObject data = new JSONObject(json);
                long now = System.currentTimeMillis();
                boolean found = false;

                JSONArray sabbaths = data.getJSONArray("sabbaths");
                for (int i = 0; i < sabbaths.length(); i++) {
                    JSONObject s = sabbaths.getJSONObject(i);
                    long start = s.getLong("start");
                    long end = s.getLong("end");
                    if (end <= now) continue;
                    if (start <= now) {
                        label = "Shabbat Shalom";
                        when = "Ends at sunset " + dayTime(end);
                        countdown = untilText(end - now);
                    } else {
                        label = "Sabbath begins";
                        when = "Sunset " + dayTime(start);
                        countdown = untilText(start - now);
                    }
                    found = true;
                    break;
                }
                if (!found) {
                    when = "Open the app to refresh the dates";
                }

                JSONArray feasts = data.getJSONArray("feasts");
                for (int i = 0; i < feasts.length(); i++) {
                    JSONObject f = feasts.getJSONObject(i);
                    if (f.getLong("end") <= now) continue;
                    long start = f.getLong("start");
                    feast = f.getString("name") + (start <= now ? " · now" : " · " + monthDay(start));
                    break;
                }
            }
        } catch (Exception e) {
            when = "Open the app to refresh the dates";
        }

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.sabbath_widget);
        views.setTextViewText(R.id.widget_label, label);
        views.setTextViewText(R.id.widget_when, when);
        views.setTextViewText(R.id.widget_countdown, countdown);
        views.setTextViewText(R.id.widget_feast, feast);

        Intent open = new Intent(context, MainActivity.class);
        PendingIntent tap = PendingIntent.getActivity(
            context, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_root, tap);

        manager.updateAppWidget(widgetId, views);
    }

    static String dayTime(long t) {
        return new SimpleDateFormat("EEE h:mm a", Locale.getDefault()).format(new Date(t));
    }

    static String monthDay(long t) {
        return new SimpleDateFormat("MMM d", Locale.getDefault()).format(new Date(t));
    }

    static String untilText(long ms) {
        long minutes = ms / 60000;
        if (minutes < 60) return "in " + minutes + " min";
        long hours = minutes / 60;
        if (hours < 36) return "in " + hours + (hours == 1 ? " hour" : " hours");
        long days = Math.round(hours / 24.0);
        return "in " + days + (days == 1 ? " day" : " days");
    }
}
