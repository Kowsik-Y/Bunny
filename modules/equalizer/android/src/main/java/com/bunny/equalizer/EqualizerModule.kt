package com.bunny.equalizer

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.ServiceConnection
import android.os.IBinder
import android.util.Log
import android.media.audiofx.Equalizer
import android.media.audiofx.BassBoost
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import com.doublesymmetry.trackplayer.service.MusicService

class EqualizerModule : Module(), ServiceConnection {
    private var musicService: MusicService? = null
    private var equalizer: Equalizer? = null
    private var bassBoost: BassBoost? = null
    private var isBound = false
    private var isEqEnabled = false
    private var bassStrength: Short = 0
    private var skipSilence = false

    private val context: Context
        get() = appContext.reactContext ?: throw Exception("React context is not available")

    override fun definition() = ModuleDefinition {
        Name("Equalizer")

        OnCreate {
            bindMusicService()
        }

        OnDestroy {
            unbindMusicService()
            releaseEqualizer()
        }

        AsyncFunction("initializeEqualizer") {
            val sessionId = getAudioSessionId()
            if (sessionId == 0) {
                throw Exception("No active audio session ID found")
            }

            try {
                releaseEqualizer()

                equalizer = Equalizer(0, sessionId)
                bassBoost = BassBoost(0, sessionId)

                equalizer?.enabled = isEqEnabled
                bassBoost?.enabled = isEqEnabled
                if (isEqEnabled && bassStrength > 0) {
                    bassBoost?.setStrength(bassStrength)
                } else if (!isEqEnabled) {
                    bassBoost?.setStrength(0)
                }
                if (skipSilence) {
                    setSkipSilenceEnabledDirect(true)
                }

                Log.d("EqualizerModule", "Equalizer initialized for session $sessionId")
                true
            } catch (e: Exception) {
                Log.e("EqualizerModule", "Failed to initialize Equalizer", e)
                throw e
            }
        }

        AsyncFunction("setEnabled") { enabled: Boolean ->
            isEqEnabled = enabled
            try {
                equalizer?.enabled = enabled
                bassBoost?.enabled = enabled
                if (!enabled) {
                    // Flatten all bands and reset bass boost so audio is truly unprocessed
                    val eq = equalizer
                    if (eq != null) {
                        for (i in 0 until eq.numberOfBands.toInt()) {
                            eq.setBandLevel(i.toShort(), 0)
                        }
                    }
                    bassBoost?.setStrength(0)
                } else {
                    // Re-apply saved settings when re-enabling
                    if (bassStrength > 0) {
                        bassBoost?.setStrength(bassStrength)
                    }
                }
                true
            } catch (e: Exception) {
                throw e
            }
        }

        AsyncFunction("getBands") {
            val eq = equalizer ?: run {
                initializeEqualizerDirect()
                equalizer
            }

            val activeEq = eq ?: throw Exception("Equalizer not initialized")

            try {
                val bandsCount = activeEq.numberOfBands
                val range = activeEq.bandLevelRange

                val frequencies = mutableListOf<Int>()
                for (i in 0 until bandsCount.toInt()) {
                    frequencies.add(activeEq.getCenterFreq(i.toShort()))
                }

                mapOf(
                    "bandsCount" to bandsCount.toInt(),
                    "minLevel" to range[0].toInt(),
                    "maxLevel" to range[1].toInt(),
                    "frequencies" to frequencies
                )
            } catch (e: Exception) {
                throw e
            }
        }

        AsyncFunction("setBandLevel") { band: Int, level: Int ->
            try {
                // Always store the desired level, but only apply if EQ is enabled
                val effectiveLevel = if (isEqEnabled) level.toShort() else 0.toShort()
                equalizer?.setBandLevel(band.toShort(), effectiveLevel)
                true
            } catch (e: Exception) {
                throw e
            }
        }

        AsyncFunction("setBassBoost") { strength: Int ->
            bassStrength = strength.toShort()
            try {
                // Only apply boost when EQ is enabled
                val effectiveStrength = if (isEqEnabled) bassStrength else 0.toShort()
                bassBoost?.setStrength(effectiveStrength)
                true
            } catch (e: Exception) {
                throw e
            }
        }

        AsyncFunction("setSkipSilenceEnabled") { enabled: Boolean ->
            skipSilence = enabled
            setSkipSilenceEnabledDirect(enabled)
        }

        AsyncFunction("extractMetadata") { uriString: String ->
            val retriever = android.media.MediaMetadataRetriever()
            try {
                val uri = android.net.Uri.parse(uriString)
                if (uriString.startsWith("content://")) {
                    context.contentResolver.openFileDescriptor(uri, "r")?.use { pfd ->
                        retriever.setDataSource(pfd.fileDescriptor)
                    }
                } else {
                    retriever.setDataSource(uriString)
                }

                val title = retriever.extractMetadata(android.media.MediaMetadataRetriever.METADATA_KEY_TITLE)
                val artist = retriever.extractMetadata(android.media.MediaMetadataRetriever.METADATA_KEY_ARTIST)
                val album = retriever.extractMetadata(android.media.MediaMetadataRetriever.METADATA_KEY_ALBUM)
                val durationStr = retriever.extractMetadata(android.media.MediaMetadataRetriever.METADATA_KEY_DURATION)
                val duration = durationStr?.toLongOrNull() ?: 0L

                val artBytes = retriever.embeddedPicture
                val base64Artwork = if (artBytes != null) {
                    val encoded = android.util.Base64.encodeToString(artBytes, android.util.Base64.NO_WRAP)
                    "data:image/jpeg;base64,$encoded"
                } else {
                    null
                }

                val lrc = extractUsltLyrics(uriString)

                mapOf(
                    "title" to title,
                    "artist" to artist,
                    "album" to album,
                    "duration" to duration,
                    "artwork" to base64Artwork,
                    "lrc" to lrc
                )
            } catch (e: Exception) {
                Log.w("EqualizerModule", "Failed to extract metadata for $uriString", e)
                mapOf<String, Any?>()
            } finally {
                try {
                    retriever.release()
                } catch (ex: Exception) {
                    // Ignore
                }
            }
        }

    }

    private fun extractUsltLyrics(uriString: String): String? {
        var inputStream: java.io.InputStream? = null
        try {
            val uri = android.net.Uri.parse(uriString)
            inputStream = if (uriString.startsWith("content://")) {
                context.contentResolver.openInputStream(uri)
            } else {
                val file = if (uriString.startsWith("file://")) {
                    java.io.File(uri.path ?: uri.toString().substring(7))
                } else {
                    java.io.File(uriString)
                }
                java.io.FileInputStream(file)
            }

            if (inputStream == null) return null

            val header = ByteArray(10)
            if (inputStream.read(header) != 10) return null
            if (header[0] != 'I'.toByte() || header[1] != 'D'.toByte() || header[2] != '3'.toByte()) return null

            val version = header[3].toInt()
            val sizeBytes = header.sliceArray(6..9)
            val tagSize = ((sizeBytes[0].toInt() and 0x7F) shl 21) or
                          ((sizeBytes[1].toInt() and 0x7F) shl 14) or
                          ((sizeBytes[2].toInt() and 0x7F) shl 7) or
                          (sizeBytes[3].toInt() and 0x7F)

            val tagData = ByteArray(tagSize)
            var bytesRead = 0
            while (bytesRead < tagSize) {
                val read = inputStream.read(tagData, bytesRead, tagSize - bytesRead)
                if (read == -1) break
                bytesRead += read
            }

            var offset = 0
            val isId3v3Or4 = version == 3 || version == 4
            val frameIdSize = if (isId3v3Or4) 4 else 3
            val frameSizeLength = if (isId3v3Or4) 4 else 3
            val frameHeaderSize = frameIdSize + frameSizeLength + (if (isId3v3Or4) 2 else 0)

            val targetFrameId = if (isId3v3Or4) "USLT" else "ULT"

            while (offset + frameHeaderSize < tagSize) {
                val frameId = String(tagData, offset, frameIdSize, java.nio.charset.StandardCharsets.US_ASCII)
                if (frameId.all { it == '\u0000' || it == ' ' }) break

                val fSize = if (isId3v3Or4) {
                    val b0 = tagData[offset + 4].toInt() and 0xFF
                    val b1 = tagData[offset + 5].toInt() and 0xFF
                    val b2 = tagData[offset + 6].toInt() and 0xFF
                    val b3 = tagData[offset + 7].toInt() and 0xFF
                    if (version == 4) {
                        (b0 shl 21) or (b1 shl 14) or (b2 shl 7) or b3
                    } else {
                        (b0 shl 24) or (b1 shl 16) or (b2 shl 8) or b3
                    }
                } else {
                    val b0 = tagData[offset + 3].toInt() and 0xFF
                    val b1 = tagData[offset + 4].toInt() and 0xFF
                    val b2 = tagData[offset + 5].toInt() and 0xFF
                    (b0 shl 16) or (b1 shl 8) or b2
                }

                if (fSize <= 0 || offset + frameHeaderSize + fSize > tagSize) break

                if (frameId == targetFrameId) {
                    val frameBodyOffset = offset + frameHeaderSize
                    val encodingByte = tagData[frameBodyOffset].toInt() and 0xFF
                    var descOffset = frameBodyOffset + 1 + 3 // encoding + lang
                    var descLen = 0
                    when (encodingByte) {
                        0, 3 -> {
                            while (descOffset + descLen < frameBodyOffset + fSize && tagData[descOffset + descLen] != 0.toByte()) {
                                descLen++
                            }
                            descLen += 1
                        }
                        1, 2 -> {
                            while (descOffset + descLen + 1 < frameBodyOffset + fSize && 
                                   (tagData[descOffset + descLen] != 0.toByte() || tagData[descOffset + descLen + 1] != 0.toByte())) {
                                descLen += 2
                            }
                            descLen += 2
                        }
                    }

                    val lyricsOffset = descOffset + descLen
                    val lyricsLen = (frameBodyOffset + fSize) - lyricsOffset
                    if (lyricsLen > 0) {
                        val charset = when (encodingByte) {
                            0 -> java.nio.charset.StandardCharsets.ISO_8859_1
                            1 -> java.nio.charset.StandardCharsets.UTF_16
                            2 -> java.nio.charset.StandardCharsets.UTF_16BE
                            3 -> java.nio.charset.StandardCharsets.UTF_8
                            else -> java.nio.charset.StandardCharsets.UTF_8
                        }
                        return String(tagData, lyricsOffset, lyricsLen, charset).trim()
                    }
                }

                offset += frameHeaderSize + fSize
            }
        } catch (e: Exception) {
            Log.e("EqualizerModule", "Error parsing ID3 lyrics for $uriString", e)
        } finally {
            try {
                inputStream?.close()
            } catch (ex: Exception) {}
        }
        return null
    }


    private fun bindMusicService() {
        try {
            val intent = Intent(context, MusicService::class.java)
            context.bindService(intent, this, Context.BIND_AUTO_CREATE)
        } catch (e: Exception) {
            Log.e("EqualizerModule", "Failed to bind to MusicService", e)
        }
    }

    private fun unbindMusicService() {
        if (isBound) {
            try {
                context.unbindService(this)
            } catch (e: Exception) {
                Log.e("EqualizerModule", "Failed to unbind MusicService", e)
            }
        }
    }

    override fun onServiceConnected(name: ComponentName?, service: IBinder?) {
        try {
            val binder = service as MusicService.MusicBinder
            musicService = binder.service
            isBound = true
            Log.d("EqualizerModule", "Successfully bound to MusicService")
            initializeEqualizerDirect()
        } catch (e: Exception) {
            Log.e("EqualizerModule", "Error casting MusicBinder", e)
        }
    }

    override fun onServiceDisconnected(name: ComponentName?) {
        musicService = null
        isBound = false
        releaseEqualizer()
    }

    private fun initializeEqualizerDirect() {
        val sessionId = getAudioSessionId()
        if (sessionId == 0) return
        try {
            releaseEqualizer()
            equalizer = Equalizer(0, sessionId)
            bassBoost = BassBoost(0, sessionId)
            equalizer?.enabled = isEqEnabled
            bassBoost?.enabled = isEqEnabled
            if (bassStrength > 0) {
                bassBoost?.setStrength(bassStrength)
            }
            if (skipSilence) {
                setSkipSilenceEnabledDirect(true)
            }
        } catch (e: Exception) {
            Log.e("EqualizerModule", "Failed to initialize Equalizer in direct call", e)
        }
    }

    private fun getAudioSessionId(): Int {
        val service = musicService ?: return 0
        try {
            val serviceClass = MusicService::class.java
            val playerField = serviceClass.getDeclaredField("player")
            playerField.isAccessible = true
            val playerObj = playerField.get(service) ?: return 0

            var currentClass: Class<*>? = playerObj.javaClass
            while (currentClass != null) {
                for (field in currentClass.declaredFields) {
                    field.isAccessible = true
                    val value = field.get(playerObj) ?: continue
                    
                    val typeName = value.javaClass.name
                    val isPlayer = typeName.contains("Player") || typeName.contains("player") || typeName.contains("Engine") ||
                            run {
                                try {
                                    val exoPlayerClass = Class.forName("com.google.android.exoplayer2.Player")
                                    exoPlayerClass.isInstance(value)
                                } catch (e: Exception) {
                                    false
                                }
                            } ||
                            run {
                                try {
                                    val media3PlayerClass = Class.forName("androidx.media3.common.Player")
                                    media3PlayerClass.isInstance(value)
                                } catch (e: Exception) {
                                    false
                                }
                            }

                    if (isPlayer) {
                        try {
                            val method = value.javaClass.getMethod("getAudioSessionId")
                            val id = method.invoke(value) as Int
                            if (id != 0) {
                                Log.d("EqualizerModule", "Found audioSessionId: $id via reflection method")
                                return id
                            }
                        } catch (err: Exception) {
                            try {
                                val idField = value.javaClass.getDeclaredField("audioSessionId")
                                idField.isAccessible = true
                                val id = idField.get(value) as Int
                                if (id != 0) {
                                    Log.d("EqualizerModule", "Found audioSessionId: $id via reflection field")
                                    return id
                                }
                            } catch (err2: Exception) {
                                // fallback loop
                                for (m in value.javaClass.methods) {
                                    if (m.name == "getAudioSessionId" && m.parameterTypes.isEmpty()) {
                                        val id = m.invoke(value) as Int
                                        if (id != 0) {
                                            Log.d("EqualizerModule", "Found audioSessionId: $id via reflection methods scan")
                                            return id
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                currentClass = currentClass.superclass
            }
        } catch (e: Exception) {
            Log.e("EqualizerModule", "Reflection failed to find audioSessionId", e)
        }
        return 0
    }

    private fun releaseEqualizer() {
        equalizer?.release()
        equalizer = null
        bassBoost?.release()
        bassBoost = null
    }

    private fun setSkipSilenceEnabledDirect(enabled: Boolean): Boolean {
        val service = musicService ?: return false
        try {
            val serviceClass = MusicService::class.java
            val playerField = serviceClass.getDeclaredField("player")
            playerField.isAccessible = true
            val playerObj = playerField.get(service) ?: return false

            var currentClass: Class<*>? = playerObj.javaClass
            while (currentClass != null) {
                for (field in currentClass.declaredFields) {
                    field.isAccessible = true
                    val value = field.get(playerObj) ?: continue
                    
                    val typeName = value.javaClass.name
                    val isPlayer = typeName.contains("Player") || typeName.contains("player") || typeName.contains("Engine") ||
                            run {
                                try {
                                    val exoPlayerClass = Class.forName("com.google.android.exoplayer2.Player")
                                    exoPlayerClass.isInstance(value)
                                } catch (e: Exception) {
                                    false
                                }
                            } ||
                            run {
                                try {
                                    val media3PlayerClass = Class.forName("androidx.media3.common.Player")
                                    media3PlayerClass.isInstance(value)
                                } catch (e: Exception) {
                                    false
                                }
                            }

                    if (isPlayer) {
                        try {
                            val method = value.javaClass.getMethod("setSkipSilenceEnabled", Boolean::class.java)
                            method.invoke(value, enabled)
                            Log.d("EqualizerModule", "Skip silence set to $enabled via reflection method")
                            return true
                        } catch (err: Exception) {
                            // Ignore and continue search
                        }
                    }
                }
                currentClass = currentClass.superclass
            }
        } catch (e: Exception) {
            Log.e("EqualizerModule", "Reflection failed to set skip silence", e)
        }
        return false
    }
}
