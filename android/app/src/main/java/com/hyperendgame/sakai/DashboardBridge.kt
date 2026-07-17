package com.hyperendgame.sakai

import android.content.Context
import android.content.Intent
import android.os.Build
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
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(intent)
        } else {
            context.startService(intent)
        }
        call.resolve()
    }
}
