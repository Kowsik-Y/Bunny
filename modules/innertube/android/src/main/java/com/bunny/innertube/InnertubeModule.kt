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
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import androidx.core.app.NotificationCompat

class InnertubeModule : Module() {
  private val gson = Gson()

  private val notificationReceiver = object : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
      val action = intent.action ?: return
      val trackId = intent.getStringExtra("trackId") ?: ""
      val actionName = when (action) {
        "com.bunny.DOWNLOAD_PAUSE" -> "pause"
        "com.bunny.DOWNLOAD_CANCEL" -> "cancel"
        "com.bunny.DOWNLOAD_CANCEL_ALL" -> "cancel_all"
        else -> ""
      }
      try {
        sendEvent("onNotificationAction", mapOf(
          "action" to actionName,
          "trackId" to trackId
        ))
      } catch (e: Exception) {
        android.util.Log.e("InnertubeModule", "Failed to send notification action event: ${e.message}")
      }
    }
  }

  private val GROUP_KEY = "com.bunny.DOWNLOAD_GROUP"

  private fun updateGroupSummary(context: Context, notificationManager: NotificationManager) {
    val summaryBuilder = NotificationCompat.Builder(context, "bunny_downloads")
      .setContentTitle("Bunny Downloads")
      .setContentText("Active downloading tracks")
      .setSmallIcon(android.R.drawable.stat_sys_download)
      .setGroup(GROUP_KEY)
      .setGroupSummary(true)
      .setAutoCancel(true)
      .setSilent(true)
      .setOnlyAlertOnce(true)

    getLaunchPendingIntent(context)?.let {
      summaryBuilder.setContentIntent(it)
    }

    notificationManager.notify(GROUP_KEY.hashCode(), summaryBuilder.build())
  }

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

    Events("onNotificationAction")

    OnCreate {
      val context = appContext.reactContext ?: return@OnCreate
      val filter = IntentFilter().apply {
        addAction("com.bunny.DOWNLOAD_PAUSE")
        addAction("com.bunny.DOWNLOAD_CANCEL")
        addAction("com.bunny.DOWNLOAD_CANCEL_ALL")
      }
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        context.registerReceiver(notificationReceiver, filter, Context.RECEIVER_EXPORTED)
      } else {
        context.registerReceiver(notificationReceiver, filter)
      }
    }

    OnDestroy {
      val context = appContext.reactContext ?: return@OnDestroy
      try {
        context.unregisterReceiver(notificationReceiver)
      } catch (e: Exception) {
        // Ignored
      }
    }

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

      val trackId = if (notificationId.startsWith("download-")) notificationId.substring(9) else notificationId
      val pauseIntent = Intent("com.bunny.DOWNLOAD_PAUSE").apply { putExtra("trackId", trackId) }
      val cancelIntent = Intent("com.bunny.DOWNLOAD_CANCEL").apply { putExtra("trackId", trackId) }
      val cancelAllIntent = Intent("com.bunny.DOWNLOAD_CANCEL_ALL").apply { putExtra("trackId", trackId) }

      val flag = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      } else {
        PendingIntent.FLAG_UPDATE_CURRENT
      }

      val pausePending = PendingIntent.getBroadcast(context, trackId.hashCode() + 1, pauseIntent, flag)
      val cancelPending = PendingIntent.getBroadcast(context, trackId.hashCode() + 2, cancelIntent, flag)
      val cancelAllPending = PendingIntent.getBroadcast(context, trackId.hashCode() + 3, cancelAllIntent, flag)

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
        .setGroup(GROUP_KEY)
        .addAction(android.R.drawable.ic_media_pause, "Pause", pausePending)
        .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Cancel", cancelPending)
        .addAction(android.R.drawable.ic_menu_delete, "Cancel All", cancelAllPending)

      getLaunchPendingIntent(context)?.let {
        builder.setContentIntent(it)
      }

      notificationManager.notify(notificationId.hashCode(), builder.build())
      updateGroupSummary(context, notificationManager)
    }

    AsyncFunction("showDownloadCompleteNotification") { notificationId: String, title: String, artworkUrl: String? ->
      val context = appContext.reactContext ?: return@AsyncFunction
      val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      
      val builder = NotificationCompat.Builder(context, "bunny_downloads")
        .setContentTitle("Download Complete")
        .setContentText("\"$title\" has been saved offline.")
        .setSmallIcon(android.R.drawable.stat_sys_download_done)
        .setProgress(0, 0, false)
        .setOngoing(false)
        .setAutoCancel(true)
        .setGroup(GROUP_KEY)

      if (artworkUrl != null && artworkUrl.isNotEmpty()) {
        try {
          val imageBytes = if (artworkUrl.startsWith("file:/") || artworkUrl.startsWith("/")) {
            val cleanPath = artworkUrl.replace("file://", "").replace("file:/", "/")
            java.io.File(cleanPath).readBytes()
          } else {
            val url = java.net.URL(artworkUrl)
            val connection = url.openConnection() as java.net.HttpURLConnection
            connection.connectTimeout = 3000
            connection.readTimeout = 3000
            connection.doInput = true
            connection.connect()
            val inputStream = connection.inputStream
            val bytes = inputStream.readBytes()
            inputStream.close()
            bytes
          }
          val bitmap = android.graphics.BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.size)
          builder.setLargeIcon(bitmap)
        } catch (e: Exception) {
          android.util.Log.e("InnertubeModule", "Failed to set large icon for notification: ${e.message}")
        }
      }

      getLaunchPendingIntent(context)?.let {
        builder.setContentIntent(it)
      }

      notificationManager.notify(notificationId.hashCode(), builder.build())
      updateGroupSummary(context, notificationManager)
    }

    AsyncFunction("showDownloadCancelledNotification") { notificationId: String ->
      val context = appContext.reactContext ?: return@AsyncFunction
      val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      notificationManager.cancel(notificationId.hashCode())
      updateGroupSummary(context, notificationManager)
    }

    AsyncFunction("showDownloadPausedNotification") { notificationId: String, title: String ->
      val context = appContext.reactContext ?: return@AsyncFunction
      val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      
      val trackId = if (notificationId.startsWith("download-")) notificationId.substring(9) else notificationId
      val resumeIntent = Intent("com.bunny.DOWNLOAD_PAUSE").apply { putExtra("trackId", trackId) }
      val cancelIntent = Intent("com.bunny.DOWNLOAD_CANCEL").apply { putExtra("trackId", trackId) }

      val flag = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      } else {
        PendingIntent.FLAG_UPDATE_CURRENT
      }

      val resumePending = PendingIntent.getBroadcast(context, trackId.hashCode() + 1, resumeIntent, flag)
      val cancelPending = PendingIntent.getBroadcast(context, trackId.hashCode() + 2, cancelIntent, flag)

      val builder = NotificationCompat.Builder(context, "bunny_downloads")
        .setContentTitle("Download Paused")
        .setContentText("Download for \"$title\" is paused.")
        .setSmallIcon(android.R.drawable.ic_media_pause)
        .setProgress(0, 0, false)
        .setOngoing(false)
        .setAutoCancel(true)
        .setGroup(GROUP_KEY)
        .addAction(android.R.drawable.ic_media_play, "Resume", resumePending)
        .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Cancel", cancelPending)

      getLaunchPendingIntent(context)?.let {
        builder.setContentIntent(it)
      }

      notificationManager.notify(notificationId.hashCode(), builder.build())
      updateGroupSummary(context, notificationManager)
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
        .setGroup(GROUP_KEY)

      getLaunchPendingIntent(context)?.let {
        builder.setContentIntent(it)
      }

      notificationManager.notify(notificationId.hashCode(), builder.build())
      updateGroupSummary(context, notificationManager)
    }

    AsyncFunction("clearStuckDownloadNotifications") { ->
      val context = appContext.reactContext ?: return@AsyncFunction false
      val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
          notificationManager.activeNotifications.forEach { statusBarNotification ->
              if (statusBarNotification.notification.group == GROUP_KEY) {
                  notificationManager.cancel(statusBarNotification.id)
              }
          }
      } else {
          // For older versions, we can't iterate active notifications easily without keeping track of IDs.
          // In those cases, we cancel the group summary, which usually dismisses children on older APIs if they are grouped.
      }
      notificationManager.cancel(GROUP_KEY.hashCode())
      return@AsyncFunction true
    }

    AsyncFunction("embedMetadataAndLyrics") { filePath: String, title: String, artist: String, album: String?, lyrics: String?, artworkUrl: String? ->
      try {
        val file = java.io.File(filePath)
        if (!file.exists()) {
          android.util.Log.e("InnertubeModule", "embedMetadataAndLyrics: file not found: $filePath")
          return@AsyncFunction false
        }
        val audioFile = org.jaudiotagger.audio.AudioFileIO.read(file)
        val tag = audioFile.tagOrCreateAndSetDefault
        
        tag.setField(org.jaudiotagger.tag.FieldKey.TITLE, title)
        tag.setField(org.jaudiotagger.tag.FieldKey.ARTIST, artist)
        tag.setField(org.jaudiotagger.tag.FieldKey.ALBUM_ARTIST, artist)
        if (album != null) {
          tag.setField(org.jaudiotagger.tag.FieldKey.ALBUM, album)
        }
        if (lyrics != null) {
          tag.setField(org.jaudiotagger.tag.FieldKey.LYRICS, lyrics)
        }
        
        if (artworkUrl != null && artworkUrl.isNotEmpty()) {
          try {
            val imageBytes = if (artworkUrl.startsWith("file:/") || artworkUrl.startsWith("/")) {
              val cleanPath = artworkUrl.replace("file://", "").replace("file:/", "/")
              java.io.File(cleanPath).readBytes()
            } else {
              val url = java.net.URL(artworkUrl)
              val connection = url.openConnection() as java.net.HttpURLConnection
              connection.connectTimeout = 3000
              connection.readTimeout = 3000
              connection.doInput = true
              connection.connect()
              val inputStream = connection.inputStream
              val bytes = inputStream.readBytes()
              inputStream.close()
              bytes
            }
            
            val artwork = org.jaudiotagger.tag.images.ArtworkFactory.getNew()
            artwork.binaryData = imageBytes
            artwork.mimeType = "image/jpeg"
            artwork.pictureType = 3
            tag.deleteArtworkField()
            tag.setField(artwork)
          } catch (imgErr: Exception) {
            android.util.Log.e("InnertubeModule", "Failed to embed artwork image: ${imgErr.message}")
          }
        }
        
        audioFile.tag = tag
        audioFile.commit()
        true
      } catch (e: Exception) {
        android.util.Log.e("InnertubeModule", "embedMetadataAndLyrics error: ${e.message}", e)
        false
      }
    }

    AsyncFunction("copyToSaf") { sourcePath: String, destUriString: String ->
      val context = appContext.reactContext ?: return@AsyncFunction false
      try {
        val sourceFile = java.io.File(sourcePath)
        val destUri = android.net.Uri.parse(destUriString)
        val resolver = context.contentResolver
        val inputStream = java.io.FileInputStream(sourceFile)
        val outputStream = resolver.openOutputStream(destUri)
        if (outputStream != null) {
          inputStream.copyTo(outputStream)
          outputStream.close()
          inputStream.close()
          true
        } else {
          false
        }
      } catch (e: Exception) {
        android.util.Log.e("InnertubeModule", "copyToSaf failed", e)
        false
      }
    }
  }
}
