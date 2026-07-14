// Persistent notification dashboard for Sakai.
// After `npx cap add android`, copy into:
//   android/app/src/main/java/com/hyperendgame/sakai/DashboardService.kt
// and apply android-extras/AndroidManifest-additions.xml.
package com.hyperendgame.sakai

import android.app.*
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import kotlinx.coroutines.*
import org.json.JSONArray
import java.net.HttpURLConnection
import java.net.URL

class DashboardService : Service() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun onCreate() {
        super.onCreate()
        val channel = NotificationChannel(
            CHANNEL_ID, "Sakai Dashboard", NotificationManager.IMPORTANCE_LOW
        ).apply { setShowBadge(false) }
        getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        startForeground(NOTIF_ID, build("Sakai", "Loading your day…"))
        // ponytail: 15-min polling for battery efficiency; switch to FCM push if staleness bites
        scope.launch {
            while (isActive) {
                refresh()
                delay(15 * 60 * 1000)
            }
        }
    }

    private fun refresh() {
        try {
            val prefs = getSharedPreferences("sakai", Context.MODE_PRIVATE)
            val supabaseUrl = prefs.getString("supabase_url", null) ?: return
            val anonKey = prefs.getString("anon_key", null) ?: return
            val token = prefs.getString("access_token", null) ?: return

            val url = URL(
                "$supabaseUrl/rest/v1/tasks?done=eq.false&order=quadrant.asc,due_date.asc.nullslast&limit=3&select=title,due_date,quadrant"
            )
            val conn = url.openConnection() as HttpURLConnection
            conn.setRequestProperty("apikey", anonKey)
            conn.setRequestProperty("Authorization", "Bearer $token")
            val tasks = JSONArray(conn.inputStream.bufferedReader().readText())
            if (tasks.length() == 0) return

            val top = tasks.getJSONObject(0)
            val title = "Top: ${top.getString("title")}"
            val lines = (1 until tasks.length()).joinToString("\n") { i ->
                val t = tasks.getJSONObject(i)
                "• ${t.getString("title")}" + (t.optString("due_date").takeIf { it.isNotEmpty() && it != "null" }
                    ?.let { " (due $it)" } ?: "")
            }
            getSystemService(NotificationManager::class.java)
                .notify(NOTIF_ID, build(title, lines.ifEmpty { "You're clear after this." }))
        } catch (_: Exception) {
            // network hiccup; next poll retries
        }
    }

    private fun build(title: String, text: String): Notification =
        NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_menu_agenda)
            .setContentTitle(title)
            .setStyle(NotificationCompat.BigTextStyle().bigText(text))
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setContentIntent(
                PendingIntent.getActivity(
                    this, 0, packageManager.getLaunchIntentForPackage(packageName),
                    PendingIntent.FLAG_IMMUTABLE
                )
            )
            .build()

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int) = START_STICKY
    override fun onBind(intent: Intent?) = null
    override fun onDestroy() {
        scope.cancel()
        super.onDestroy()
    }

    companion object {
        const val CHANNEL_ID = "sakai_dashboard"
        const val NOTIF_ID = 1
    }
}
