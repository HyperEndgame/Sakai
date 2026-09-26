package com.hyperendgame.sakai

import android.content.Context
import android.content.Intent
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

    // Bars are transparent (edge-to-edge, MainActivity); the page paints behind them, so only the
    // icon contrast needs to follow the theme.
    @PluginMethod
    fun setBars(call: PluginCall) {
        val light = call.getBoolean("light", true) ?: true
        activity.runOnUiThread {
            val w = activity.window
            WindowCompat.getInsetsController(w, w.decorView).apply {
                isAppearanceLightStatusBars = light
                isAppearanceLightNavigationBars = light
            }
        }
        call.resolve()
    }
}
