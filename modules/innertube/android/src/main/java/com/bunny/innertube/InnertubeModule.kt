package com.bunny.innertube

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import com.music.innertube.YouTube
import com.music.innertube.YouTube.SearchFilter
import com.music.innertube.models.YouTubeClient
import com.music.innertube.models.YouTubeLocale
import com.music.innertube.models.WatchEndpoint
import com.music.innertube.models.BrowseEndpoint
import com.google.gson.Gson
import kotlinx.coroutines.runBlocking
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.os.Build
import androidx.core.app.NotificationCompat

class InnertubeModule : Module() {
  private val gson = Gson()

  private fun getLaunchPendingIntent(context: Context): PendingIntent? {
    val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName) ?: return null
    val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    } else {
      PendingIntent.FLAG_UPDATE_CURRENT
    }
    return PendingIntent.getActivity(context, 0, launchIntent, flags)
  }

  override fun definition() = ModuleDefinition {
    Name("Innertube")

    AsyncFunction("searchSuggestions") { query: String ->
      runBlocking {
        val result = YouTube.searchSuggestions(query)
        if (result.isSuccess) {
          gson.toJson(result.getOrThrow())
        } else {
          throw Exception(result.exceptionOrNull()?.message ?: "Unknown error")
        }
      }
    }

    AsyncFunction("searchSummary") { query: String ->
      runBlocking {
        val result = YouTube.searchSummary(query)
        if (result.isSuccess) {
          gson.toJson(result.getOrThrow())
        } else {
          throw Exception(result.exceptionOrNull()?.message ?: "Unknown error")
        }
      }
    }

    AsyncFunction("search") { query: String, filterName: String ->
      runBlocking {
        val filter = when (filterName) {
          "SONG" -> SearchFilter.FILTER_SONG
          "VIDEO" -> SearchFilter.FILTER_VIDEO
          "ALBUM" -> SearchFilter.FILTER_ALBUM
          "ARTIST" -> SearchFilter.FILTER_ARTIST
          "FEATURED_PLAYLIST" -> SearchFilter.FILTER_FEATURED_PLAYLIST
          "COMMUNITY_PLAYLIST" -> SearchFilter.FILTER_COMMUNITY_PLAYLIST
          else -> SearchFilter.FILTER_SONG
        }
        val result = YouTube.search(query, filter)
        if (result.isSuccess) {
          gson.toJson(result.getOrThrow())
        } else {
          throw Exception(result.exceptionOrNull()?.message ?: "Unknown error")
        }
      }
    }

    AsyncFunction("album") { browseId: String ->
      runBlocking {
        val result = YouTube.album(browseId)
        if (result.isSuccess) {
          gson.toJson(result.getOrThrow())
        } else {
          throw Exception(result.exceptionOrNull()?.message ?: "Unknown error")
        }
      }
    }

    AsyncFunction("artist") { browseId: String ->
      runBlocking {
        val result = YouTube.artist(browseId)
        if (result.isSuccess) {
          gson.toJson(result.getOrThrow())
        } else {
          throw Exception(result.exceptionOrNull()?.message ?: "Unknown error")
        }
      }
    }

    AsyncFunction("playlist") { playlistId: String ->
      runBlocking {
        val result = YouTube.playlist(playlistId)
        if (result.isSuccess) {
          gson.toJson(result.getOrThrow())
        } else {
          throw Exception(result.exceptionOrNull()?.message ?: "Unknown error")
        }
      }
    }

    AsyncFunction("lyrics") { browseId: String ->
      runBlocking {
        val endpoint = BrowseEndpoint(browseId = browseId)
        val result = YouTube.lyrics(endpoint)
        if (result.isSuccess) {
          result.getOrNull()
        } else {
          throw Exception(result.exceptionOrNull()?.message ?: "Unknown error")
        }
      }
    }

    AsyncFunction("player") { videoId: String ->
      runBlocking {
        val result = YouTube.player(
          videoId = videoId,
          client = YouTubeClient.WEB_REMIX
        )
        if (result.isSuccess) {
          gson.toJson(result.getOrThrow())
        } else {
          throw Exception(result.exceptionOrNull()?.message ?: "Unknown error")
        }
      }
    }

    AsyncFunction("showDownloadProgressNotification") { notificationId: String, title: String, progress: Double, totalSongs: Int, currentSongIndex: Int ->
      val context = appContext.reactContext ?: return@AsyncFunction
      val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        val channelId = "bunny_downloads"
        val channelName = "Downloads"
        val channel = NotificationChannel(channelId, channelName, NotificationManager.IMPORTANCE_LOW).apply {
          description = "Tracks active download progress"
          enableLights(false)
          enableVibration(false)
          setSound(null, null)
        }
        notificationManager.createNotificationChannel(channel)
      }

      val pct = (progress * 100).toInt().coerceIn(0, 100)
      val songInfo = if (totalSongs > 1) " (${currentSongIndex} of ${totalSongs})" else ""
      val displayTitle = "\"$title\"$songInfo"
      val displayBody = "Downloading... $pct%"
      
      val builder = NotificationCompat.Builder(context, "bunny_downloads")
        .setContentTitle(displayTitle)
        .setContentText(displayBody)
        .setSmallIcon(android.R.drawable.stat_sys_download)
        .setProgress(100, pct, progress < 0.0)
        .setOngoing(true)
        .setOnlyAlertOnce(true)
        .setAutoCancel(false)
        .setSilent(true)

      getLaunchPendingIntent(context)?.let {
        builder.setContentIntent(it)
      }

      notificationManager.notify(notificationId.hashCode(), builder.build())
    }

    AsyncFunction("showDownloadCompleteNotification") { notificationId: String, title: String ->
      val context = appContext.reactContext ?: return@AsyncFunction
      val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      
      val builder = NotificationCompat.Builder(context, "bunny_downloads")
        .setContentTitle("Download Complete")
        .setContentText("\"$title\" has been saved offline.")
        .setSmallIcon(android.R.drawable.stat_sys_download_done)
        .setProgress(0, 0, false)
        .setOngoing(false)
        .setAutoCancel(true)

      getLaunchPendingIntent(context)?.let {
        builder.setContentIntent(it)
      }

      notificationManager.notify(notificationId.hashCode(), builder.build())
    }

    AsyncFunction("showDownloadCancelledNotification") { notificationId: String ->
      val context = appContext.reactContext ?: return@AsyncFunction
      val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      notificationManager.cancel(notificationId.hashCode())
    }

    AsyncFunction("showDownloadPausedNotification") { notificationId: String, title: String ->
      val context = appContext.reactContext ?: return@AsyncFunction
      val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      
      val builder = NotificationCompat.Builder(context, "bunny_downloads")
        .setContentTitle("Download Paused")
        .setContentText("Download for \"$title\" is paused.")
        .setSmallIcon(android.R.drawable.ic_media_pause)
        .setProgress(0, 0, false)
        .setOngoing(false)
        .setAutoCancel(true)

      getLaunchPendingIntent(context)?.let {
        builder.setContentIntent(it)
      }

      notificationManager.notify(notificationId.hashCode(), builder.build())
    }

    AsyncFunction("showDownloadFailedNotification") { notificationId: String, title: String, reason: String ->
      val context = appContext.reactContext ?: return@AsyncFunction
      val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      
      val builder = NotificationCompat.Builder(context, "bunny_downloads")
        .setContentTitle("Download Failed")
        .setContentText("Failed to download \"$title\": $reason")
        .setSmallIcon(android.R.drawable.stat_notify_error)
        .setProgress(0, 0, false)
        .setOngoing(false)
        .setAutoCancel(true)

      getLaunchPendingIntent(context)?.let {
        builder.setContentIntent(it)
      }

      notificationManager.notify(notificationId.hashCode(), builder.build())
    }
  }
}
