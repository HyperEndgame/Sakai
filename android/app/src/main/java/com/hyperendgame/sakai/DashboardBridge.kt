package com.hyperendgame.sakai

import android.animation.ValueAnimator
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.os.Build
import androidx.core.view.WindowCompat
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

// Bridge from JS (src/notify.ts) into the always-on notification. Writes the current
// top task / upcoming deadlines into SharedPreferences and ensures the foreground
// service is running so the notification survives the app being killed.
@CapacitorPlugin(name = "DashboardBridge")
class DashboardBridge : Plugin() {
    @PluginMethod
    fun save(call: PluginCall) {
        val title = call.getString("title") ?: run { call.reject("title required"); return }
        val body = call.getString("body") ?: ""
        context.getSharedPreferences("sakai", Context.MODE_PRIVATE)
            .edit()
            .putString("dash_title", title)
            .putString("dash_body", body)
            .apply()

        val intent = Intent(context, DashboardService::class.java)
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        } catch (e: Exception) {
            // Android refuses foreground-service starts from the background; the next in-app save retries
            call.reject("service start blocked: ${e.message}")
            return
        }
        call.resolve()
    }

    // Returns and clears the stack trace MainActivity saved from the last native crash.
    @PluginMethod
    fun lastCrash(call: PluginCall) {
        val prefs = context.getSharedPreferences("sakai", Context.MODE_PRIVATE)
        val crash = prefs.getString("last_crash", "") ?: ""
        prefs.edit().remove("last_crash").apply()
        call.resolve(com.getcapacitor.JSObject().put("crash", crash))
    }

    // Status/nav bars follow the web theme. ponytail: relies on the edge-to-edge opt-out
    // (values-v35/styles.xml); targeting API 36 means switching to inset padding instead.
    @PluginMethod
    fun setBars(call: PluginCall) {
        val color = try { Color.parseColor(call.getString("color")) } catch (_: Exception) { call.reject("bad color"); return }
        val light = call.getBoolean("light", true) ?: true
        val duration = (call.getInt("duration", 0) ?: 0).toLong()
        activity.runOnUiThread {
            val w = activity.window
            @Suppress("DEPRECATION")
            val from = w.statusBarColor
            // same tween length as the web crossfade so bars and page change together
            ValueAnimator.ofArgb(from, color).apply {
                this.duration = duration
                addUpdateListener {
                    val c = it.animatedValue as Int
                    @Suppress("DEPRECATION")
                    w.statusBarColor = c
                    @Suppress("DEPRECATION")
                    w.navigationBarColor = c
                    w.decorView.setBackgroundColor(c)
                }
                start()
            }
            WindowCompat.getInsetsController(w, w.decorView).apply {
                isAppearanceLightStatusBars = light
                isAppearanceLightNavigationBars = light
            }
        }
        call.resolve()
    }
}
