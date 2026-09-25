// Persistent notification dashboard for Sakai.
// Lives in android/app/src/main/java/com/hyperendgame/sakai/DashboardService.kt (already wired
// into AndroidManifest.xml + MainActivity.java — see DashboardBridge.kt for the JS-side writer).
package com.hyperendgame.sakai

import android.app.*
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat
import kotlinx.coroutines.*

// ponytail: reads the local snapshot DashboardBridge writes — no backend needed until
// multi-device sync is worth building (Supabase deploy is the upgrade path, see PIPELINE.md)
class DashboardService : Service() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun onCreate() {
        super.onCreate()
        val channel = NotificationChannel(
            CHANNEL_ID, "Sakai Dashboard", NotificationManager.IMPORTANCE_LOW
        ).apply { setShowBadge(false) }
        getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        startForeground(NOTIF_ID, build("Sakai", "Loading your day…"))
        scope.launch {
            while (isActive) {
                refresh()
                delay(30 * 1000)
            }
        }
    }

    private fun refresh() {
        try {
            val prefs = getSharedPreferences("sakai", Context.MODE_PRIVATE)
            val title = prefs.getString("dash_title", null) ?: return
            val body = prefs.getString("dash_body", null) ?: ""
            getSystemService(NotificationManager::class.java).notify(NOTIF_ID, build(title, body))
        } catch (_: Exception) {
            // stale prefs read; next poll retries
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

    // Every startForegroundService() must be answered with startForeground(), or Android kills the app.
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val prefs = getSharedPreferences("sakai", Context.MODE_PRIVATE)
        startForeground(NOTIF_ID, build(prefs.getString("dash_title", null) ?: "Sakai", prefs.getString("dash_body", null) ?: ""))
        return START_STICKY
    }
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
