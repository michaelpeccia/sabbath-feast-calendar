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
// Comes in three sizes (SabbathWidgetSmall, this standard one, SabbathWidgetLarge).
// The app sends it the upcoming times and a color theme; Android redraws it about every 30 minutes.
public class SabbathWidget extends AppWidgetProvider {

    static final String PREFS = "sabbath_widget";
    static final String KEY = "data";

    static final int SMALL = 0;
    static final int STANDARD = 1;
    static final int LARGE = 2;

    int size() {
        return STANDARD;
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] widgetIds) {
        for (int id : widgetIds) {
            draw(context, manager, id, size());
        }
    }

    static void updateAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        drawAll(context, manager, SabbathWidgetSmall.class, SMALL);
        drawAll(context, manager, SabbathWidget.class, STANDARD);
        drawAll(context, manager, SabbathWidgetLarge.class, LARGE);
    }

    static void drawAll(Context context, AppWidgetManager manager, Class<?> provider, int size) {
        int[] ids = manager.getAppWidgetIds(new ComponentName(context, provider));
        for (int id : ids) {
            draw(context, manager, id, size);
        }
    }

    // Colors for each theme: background, label, main text, secondary text, feast line.
    static int[] colors(String theme) {
        switch (theme) {
            case "parchment":
                return new int[] { R.drawable.widget_bg_parchment, 0xFF8A5D0B, 0xFF2A2118, 0xFF6B5D4A, 0xFF5546A8 };
            case "royal":
                return new int[] { R.drawable.widget_bg_royal, 0xFFECC76B, 0xFFEEF3FB, 0xFFA7B7D3, 0xFF6AA6FF };
            case "olive":
                return new int[] { R.drawable.widget_bg_olive, 0xFFDCB75C, 0xFFF1EFE3, 0xFFBBB99E, 0xFFA7C46F };
            case "black":
                return new int[] { R.drawable.widget_bg_black, 0xFFE2BA52, 0xFFF5F1E6, 0xFFAAA59B, 0xFFD9B866 };
            default:
                return new int[] { R.drawable.widget_bg, 0xFFE3C27A, 0xFFF2EEE3, 0xFFB9B2D6, 0xFF8B7CF0 };
        }
    }

    static void draw(Context context, AppWidgetManager manager, int widgetId, int size) {
        String label = "Sabbath & Feast Days";
        String when = "Open the app to set your location";
        String countdown = "";
        String range = "";
        String feast = "";
        String theme = "midnight";

        try {
            String json = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, null);
            if (json != null) {
                JSONObject data = new JSONObject(json);
                theme = data.optString("theme", "midnight");
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
                    // Large widget: the line that is not already shown above.
                    range = start <= now ? "Began at sunset " + dayTime(start) : "Ends at sunset " + dayTime(end);
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
                    String name = f.getString("name");
                    if (size == LARGE) {
                        feast = (start <= now ? "Now: " : "Next: ") + name + (start <= now ? "" : " · " + dayTime(start));
                    } else {
                        feast = name + (start <= now ? " · now" : " · " + monthDay(start));
                    }
                    break;
                }
            }
        } catch (Exception e) {
            when = "Open the app to refresh the dates";
        }

        int[] c = colors(theme);
        int layout = size == SMALL ? R.layout.sabbath_widget_small
            : (size == LARGE ? R.layout.sabbath_widget_large : R.layout.sabbath_widget);
        RemoteViews views = new RemoteViews(context.getPackageName(), layout);

        views.setInt(R.id.widget_root, "setBackgroundResource", c[0]);
        views.setTextViewText(R.id.widget_label, label);
        views.setTextColor(R.id.widget_label, c[1]);
        views.setTextViewText(R.id.widget_countdown, size == SMALL && countdown.isEmpty() ? "Open the app" : countdown);
        views.setTextColor(R.id.widget_countdown, c[2]);

        if (size != SMALL) {
            views.setTextViewText(R.id.widget_when, when);
            views.setTextColor(R.id.widget_when, c[3]);
            views.setTextViewText(R.id.widget_feast, feast);
            views.setTextColor(R.id.widget_feast, c[4]);
        }
        if (size == LARGE) {
            views.setTextViewText(R.id.widget_range, range);
            views.setTextColor(R.id.widget_range, c[3]);
        }

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
